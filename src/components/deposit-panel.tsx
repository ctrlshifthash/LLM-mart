'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets, useSignAndSendTransaction } from '@privy-io/react-auth/solana';
import { useAuthedSWR, useAuthedFetch } from '@/lib/authed-fetch';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Wallet, ArrowDownToLine, AlertTriangle, ExternalLink } from 'lucide-react';
import { formatUsdc } from '@/lib/utils';

const TREASURY_ADDR = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '';
const USDC_MINT = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
const CLUSTER = (process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'devnet') as 'devnet' | 'mainnet-beta';
const RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  (CLUSTER === 'mainnet-beta' ? 'https://api.mainnet-beta.solana.com' : 'https://api.devnet.solana.com');
const USDC_DECIMALS = 6;
const IS_PUBLIC_RPC = /api\.(mainnet-beta|devnet)\.solana\.com/.test(RPC);

export function DepositPanel() {
  const { data, mutate } = useAuthedSWR<{ balance: number }>('/api/internal/balance', { refreshInterval: 4000 });
  const authedFetch = useAuthedFetch();
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const [amount, setAmount] = useState('5');
  const [busy, setBusy] = useState(false);
  const [walletUsdc, setWalletUsdc] = useState<number | null>(null);
  const [walletErr, setWalletErr] = useState<string | null>(null);

  const wallet = wallets?.[0];
  const walletAddr = wallet?.address || (user as any)?.wallet?.address || null;

  // Fetch wallet USDC balance
  useEffect(() => {
    if (!walletAddr) return;
    let cancelled = false;
    (async () => {
      try {
        const conn = new Connection(RPC, 'confirmed');
        const ata = getAssociatedTokenAddressSync(USDC_MINT, new PublicKey(walletAddr));
        try {
          const acc = await getAccount(conn, ata);
          if (!cancelled) {
            setWalletUsdc(Number(acc.amount) / 10 ** USDC_DECIMALS);
            setWalletErr(null);
          }
        } catch (e: any) {
          if (cancelled) return;
          if (/could not find account|TokenAccountNotFound/i.test(e?.message || '')) {
            setWalletUsdc(0);
            setWalletErr(null);
          } else {
            setWalletErr(e?.message || 'failed to read wallet balance');
            setWalletUsdc(null);
          }
        }
      } catch (e: any) {
        if (!cancelled) setWalletErr(e?.message || 'rpc error');
      }
    })();
    const interval = setInterval(() => {
      if (!cancelled) (async () => { /* trigger refresh */ })();
    }, 10_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [walletAddr]);

  async function deposit(amt: number) {
    if (busy) return;
    if (!amt || amt <= 0) return toast.error('Enter an amount > 0');
    if (!wallet) return toast.error('No Solana wallet connected');
    if (!TREASURY_ADDR) return toast.error('Treasury address not configured');
    if (walletUsdc !== null && amt > walletUsdc) return toast.error('Amount exceeds wallet USDC balance');

    setBusy(true);
    try {
      const conn = new Connection(RPC, 'confirmed');
      const owner = new PublicKey(wallet.address);
      const treasury = new PublicKey(TREASURY_ADDR);
      const fromAta = getAssociatedTokenAddressSync(USDC_MINT, owner);
      const toAta = getAssociatedTokenAddressSync(USDC_MINT, treasury);

      const ixs: any[] = [];
      const toAtaInfo = await conn.getAccountInfo(toAta);
      if (!toAtaInfo) {
        ixs.push(createAssociatedTokenAccountInstruction(owner, toAta, treasury, USDC_MINT, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID));
      }
      const amountBase = BigInt(Math.round(amt * 10 ** USDC_DECIMALS));
      ixs.push(createTransferCheckedInstruction(fromAta, USDC_MINT, toAta, owner, amountBase, USDC_DECIMALS));

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
      toast.success(`Deposited ${formatUsdc(json.amount)} USDC`);
      mutate();
      setWalletUsdc((b) => (b !== null ? Math.max(0, b - amt) : b));
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'deposit failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Platform balance */}
        <div className="rounded-lg border border-border bg-bg-elevated/40 p-5">
          <div className="flex items-center gap-2 text-xs text-text-faint uppercase tracking-wide">
            <Wallet className="h-3.5 w-3.5" /> Platform Balance
          </div>
          <div className="mt-2 text-3xl font-semibold font-mono">{formatUsdc(data?.balance ?? 0)}</div>
          <div className="mt-1 text-[11px] text-text-faint">Debited per request at the seller's quoted price.</div>
        </div>

        {/* Wallet USDC balance */}
        <div className="rounded-lg border border-border bg-bg-elevated/40 p-5">
          <div className="flex items-center justify-between text-xs text-text-faint uppercase tracking-wide">
            <span className="flex items-center gap-2"><Wallet className="h-3.5 w-3.5" /> Your Wallet USDC</span>
            <span className="font-mono normal-case">{CLUSTER === 'mainnet-beta' ? 'mainnet' : 'devnet'}</span>
          </div>
          <div className="mt-2 text-3xl font-semibold font-mono">
            {walletUsdc === null && !walletErr ? '…' : formatUsdc(walletUsdc ?? 0)}
          </div>
          <div className="mt-1 text-[11px] text-text-faint flex items-center gap-2">
            <Badge variant="outline">wallet</Badge>
            <span className="font-mono">{walletAddr ? `${walletAddr.slice(0, 6)}…${walletAddr.slice(-6)}` : 'not connected'}</span>
          </div>
        </div>
      </div>

      {/* RPC warning */}
      {(walletErr || IS_PUBLIC_RPC) && (
        <div className="rounded-md border border-warn/30 bg-warn/5 p-3 text-xs text-warn flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <strong>RPC blocked or rate-limited.</strong>{' '}
            {walletErr && <span>Wallet balance read failed: <code className="font-mono">{walletErr.slice(0, 80)}</code>. </span>}
            Public Solana RPC blocks browser reads. Get a free RPC URL from{' '}
            <a href="https://helius.dev" target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-0.5">helius.dev<ExternalLink className="h-3 w-3" /></a>{' '}
            and put it in <code className="font-mono">NEXT_PUBLIC_SOLANA_RPC_URL</code> + <code className="font-mono">SOLANA_RPC_URL</code> in <code className="font-mono">.env.local</code>, then restart <code className="font-mono">pnpm dev</code>.
          </div>
        </div>
      )}

      {/* Deposit form */}
      <div className="rounded-lg border border-border bg-bg-elevated/40 p-5 space-y-3">
        <Label>Top up from wallet</Label>
        <div className="flex items-stretch gap-2">
          <Input
            mono
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1"
          />
          <Button onClick={() => deposit(Number(amount))} disabled={busy}>
            <ArrowDownToLine className="h-4 w-4" /> {busy ? 'Confirming…' : 'Deposit'}
          </Button>
        </div>

        {walletUsdc !== null && walletUsdc > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            <QuickBtn label="$1" amount={1} max={walletUsdc} onClick={(a) => deposit(a)} disabled={busy} />
            <QuickBtn label="$5" amount={5} max={walletUsdc} onClick={(a) => deposit(a)} disabled={busy} />
            <QuickBtn label="$20" amount={20} max={walletUsdc} onClick={(a) => deposit(a)} disabled={busy} />
            <QuickBtn label="$100" amount={100} max={walletUsdc} onClick={(a) => deposit(a)} disabled={busy} />
            <button
              type="button"
              disabled={busy}
              onClick={() => deposit(walletUsdc)}
              className="rounded-md border border-accent/40 bg-accent/10 text-accent px-3 py-1.5 text-xs font-medium hover:bg-accent/20 disabled:opacity-40"
            >
              Max ({formatUsdc(walletUsdc)})
            </button>
          </div>
        )}

        <p className="text-[11px] text-text-faint">
          One signed SPL transfer per top-up. No on-chain approval step needed on Solana. Pay-per-request is debited from your platform balance.
        </p>
      </div>
    </div>
  );
}

function QuickBtn({
  label, amount, max, onClick, disabled,
}: { label: string; amount: number; max: number; onClick: (a: number) => void; disabled: boolean }) {
  const ok = amount <= max;
  return (
    <button
      type="button"
      disabled={disabled || !ok}
      onClick={() => onClick(amount)}
      title={!ok ? 'Exceeds your wallet balance' : ''}
      className="rounded-md border border-border bg-bg-card px-3 py-1.5 text-xs hover:bg-bg-card-hover disabled:opacity-40"
    >
      {label}
    </button>
  );
}
