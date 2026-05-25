'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets, useSignAndSendTransaction } from '@privy-io/react-auth/solana';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles } from 'lucide-react';
import { useAuthedSWR, useAuthedFetch } from '@/lib/authed-fetch';
import { formatUsdc } from '@/lib/utils';

const TREASURY_ADDR = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '';
const USDC_MINT = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const CLUSTER = (process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'devnet') as 'devnet' | 'mainnet-beta';
const RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  (CLUSTER === 'mainnet-beta' ? 'https://solana-rpc.publicnode.com' : 'https://api.devnet.solana.com');
const USDC_DECIMALS = 6;

const DISMISS_KEY = 'surplus-welcome-dismissed';

export function WelcomeDepositModal() {
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { data: balanceData, mutate } = useAuthedSWR<{ balance: number }>('/api/internal/balance', { refreshInterval: 4000 });
  const authedFetch = useAuthedFetch();

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('5');
  const [walletUsdc, setWalletUsdc] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const wallet = wallets?.[0];
  const balance = balanceData?.balance;

  // Show modal once per session when authed + zero balance + has wallet usdc
  useEffect(() => {
    if (!ready || !authenticated) return;
    if (balance === undefined || balance > 0) return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;
    if (walletUsdc === null) return;
    if (walletUsdc <= 0) return;
    setOpen(true);
  }, [ready, authenticated, balance, walletUsdc]);

  // Read wallet USDC
  useEffect(() => {
    if (!wallet?.address) return;
    let cancelled = false;
    (async () => {
      try {
        const conn = new Connection(RPC, 'confirmed');
        const ata = getAssociatedTokenAddressSync(USDC_MINT, new PublicKey(wallet.address));
        const acc = await getAccount(conn, ata);
        if (!cancelled) setWalletUsdc(Number(acc.amount) / 10 ** USDC_DECIMALS);
      } catch (e: any) {
        if (cancelled) return;
        if (/TokenAccountNotFound|could not find account/i.test(e?.message || '')) {
          setWalletUsdc(0);
        } else {
          setWalletUsdc(0);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [wallet?.address]);

  async function deposit() {
    if (busy || !wallet) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error('Enter an amount > 0');
    if (walletUsdc !== null && amt > walletUsdc) return toast.error('Amount exceeds wallet USDC');
    if (!TREASURY_ADDR) return toast.error('Treasury not configured');

    setBusy(true);
    try {
      const conn = new Connection(RPC, 'confirmed');
      const owner = new PublicKey(wallet.address);
      const treasury = new PublicKey(TREASURY_ADDR);
      const fromAta = getAssociatedTokenAddressSync(USDC_MINT, owner);
      const toAta = getAssociatedTokenAddressSync(USDC_MINT, treasury);

      const ixs: any[] = [];
      const toAtaInfo = await conn.getAccountInfo(toAta);
      if (!toAtaInfo) ixs.push(createAssociatedTokenAccountInstruction(owner, toAta, treasury, USDC_MINT, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID));
      ixs.push(createTransferCheckedInstruction(fromAta, USDC_MINT, toAta, owner, BigInt(Math.round(amt * 10 ** USDC_DECIMALS)), USDC_DECIMALS));

      const { blockhash } = await conn.getLatestBlockhash('confirmed');
      const tx = new Transaction({ feePayer: owner, recentBlockhash: blockhash }).add(...ixs);
      const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
      const { signature } = await signAndSendTransaction({
        transaction: new Uint8Array(serialized),
        wallet,
        chain: `solana:${CLUSTER === 'mainnet-beta' ? 'mainnet' : 'devnet'}` as any,
      });
      const bs58 = (await import('bs58')).default;
      const sigB58 = bs58.encode(signature);
      toast.message('Submitted', { description: 'Waiting for confirmation…' });

      const res = await authedFetch('/api/internal/deposit/confirm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ txHash: sigB58 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'verify failed');
      toast.success(`Funded ${formatUsdc(json.amount)} USDC`);
      sessionStorage.setItem(DISMISS_KEY, '1');
      setOpen(false);
      mutate();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'deposit failed');
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setOpen(false);
  }

  if (!ready || !authenticated || walletUsdc === null) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" /> Fund your account
          </DialogTitle>
          <DialogDescription>
            Sign one transaction to authorize spending. After this, every API call runs silently — no more popups.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md border border-border bg-bg-elevated/40 p-3 flex items-center justify-between text-xs">
            <span className="text-text-faint">Your wallet USDC</span>
            <span className="font-mono">{formatUsdc(walletUsdc)}</span>
          </div>
          <div>
            <label className="text-xs text-text-faint">Amount to fund (USDC)</label>
            <Input
              mono
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {[1, 5, 20, 50].filter((n) => n <= walletUsdc).map((n) => (
              <button
                key={n}
                onClick={() => setAmount(String(n))}
                className="rounded-md border border-border bg-bg-card px-3 py-1.5 hover:bg-bg-card-hover"
              >
                ${n}
              </button>
            ))}
            <button
              onClick={() => setAmount(String(walletUsdc))}
              className="rounded-md border border-accent/40 bg-accent/10 text-accent px-3 py-1.5 hover:bg-accent/20"
            >
              Max ({formatUsdc(walletUsdc)})
            </button>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={dismiss}>Skip for now</Button>
            <Button onClick={deposit} disabled={busy}>{busy ? 'Confirming…' : `Fund $${amount}`}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
