'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets, useSignAndSendTransaction } from '@privy-io/react-auth/solana';
import { useAuthedSWR, useAuthedFetch } from '@/lib/authed-fetch';
import {
  Connection,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Wallet, ArrowDownToLine } from 'lucide-react';
import { formatUsdc } from '@/lib/utils';

const TREASURY_ADDR = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '';
const USDC_MINT = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
const CLUSTER = (process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'devnet') as 'devnet' | 'mainnet-beta';
const RPC = CLUSTER === 'mainnet-beta' ? 'https://api.mainnet-beta.solana.com' : 'https://api.devnet.solana.com';
const USDC_DECIMALS = 6;

export function DepositPanel() {
  const { data, mutate } = useAuthedSWR<{ balance: number }>('/api/internal/balance', { refreshInterval: 4000 });
  const authedFetch = useAuthedFetch();
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const [amount, setAmount] = useState('100');
  const [busy, setBusy] = useState(false);

  const wallet = wallets?.[0];
  const walletAddr = wallet?.address || (user as any)?.wallet?.address || null;

  async function deposit() {
    if (busy) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error('Enter an amount > 0');
    if (!wallet) return toast.error('No Solana wallet connected');
    if (!TREASURY_ADDR) return toast.error('Treasury address not configured');

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
        ixs.push(
          createAssociatedTokenAccountInstruction(owner, toAta, treasury, USDC_MINT, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID),
        );
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
      const sig = Buffer.from(signature).toString('base64');
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
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'deposit failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid sm:grid-cols-2 gap-6">
      <div className="rounded-lg border border-border bg-bg-elevated/40 p-5">
        <div className="flex items-center gap-2 text-xs text-text-faint">
          <Wallet className="h-3.5 w-3.5" /> CURRENT BALANCE
        </div>
        <div className="mt-2 text-4xl font-semibold font-mono">{formatUsdc(data?.balance ?? 0)}</div>
        <div className="mt-1 text-xs text-text-faint">USDC on Solana {CLUSTER === 'mainnet-beta' ? 'mainnet' : 'devnet'}</div>
        <div className="mt-4 flex items-center gap-2">
          <Badge variant="outline">wallet</Badge>
          <span className="font-mono text-xs text-text-dim">
            {walletAddr ? `${walletAddr.slice(0, 6)}…${walletAddr.slice(-6)}` : 'not connected'}
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-bg-elevated/40 p-5 space-y-3">
        <div>
          <Label>Deposit amount (USDC)</Label>
          <Input
            mono
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1"
          />
          <p className="mt-2 text-xs text-text-faint">
            One signed SPL transfer to the platform treasury. No approval step needed on Solana.
          </p>
        </div>
        <Button onClick={deposit} disabled={busy} className="w-full">
          <ArrowDownToLine className="h-4 w-4" /> {busy ? 'Confirming…' : `Deposit ${amount || '0'} USDC`}
        </Button>
      </div>
    </div>
  );
}
