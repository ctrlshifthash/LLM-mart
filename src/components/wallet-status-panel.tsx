'use client';
import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth/solana';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, getAccount } from '@solana/spl-token';
import { Badge } from '@/components/ui/badge';
import { Wallet, AlertTriangle, ExternalLink, Zap } from 'lucide-react';
import { formatUsdc, shortAddr } from '@/lib/utils';

const USDC_MINT = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const CLUSTER = (process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'devnet') as 'devnet' | 'mainnet-beta';
const RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  (CLUSTER === 'mainnet-beta' ? 'https://solana-rpc.publicnode.com' : 'https://api.devnet.solana.com');
const USDC_DECIMALS = 6;
const IS_PUBLIC_RPC = /api\.(mainnet-beta|devnet)\.solana\.com/.test(RPC);
const PLATFORM_FEE_PCT = Math.round(Number(process.env.NEXT_PUBLIC_PLATFORM_FEE_RATE || 0.10) * 100);

export function WalletStatusPanel() {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const [walletUsdc, setWalletUsdc] = useState<number | null>(null);
  const [walletErr, setWalletErr] = useState<string | null>(null);

  const wallet = wallets?.[0];
  const walletAddr = wallet?.address || (user as any)?.wallet?.address || null;

  useEffect(() => {
    if (!walletAddr) return;
    let cancelled = false;
    const load = async () => {
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
            setWalletUsdc(0); setWalletErr(null);
          } else {
            setWalletErr(e?.message || 'failed to read wallet balance'); setWalletUsdc(null);
          }
        }
      } catch (e: any) {
        if (!cancelled) setWalletErr(e?.message || 'rpc error');
      }
    };
    load();
    const t = setInterval(load, 12_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [walletAddr]);

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-bg-elevated/40 p-5">
          <div className="flex items-center justify-between text-xs text-text-faint uppercase tracking-wide">
            <span className="flex items-center gap-2"><Wallet className="h-3.5 w-3.5" /> Your wallet USDC</span>
            <span className="font-mono normal-case">{CLUSTER === 'mainnet-beta' ? 'mainnet' : 'devnet'}</span>
          </div>
          <div className="mt-2 text-3xl font-semibold font-mono">
            {walletErr ? <span className="text-text-faint">—</span> :
             walletUsdc === null ? '…' :
             formatUsdc(walletUsdc)}
          </div>
          <div className="mt-1 text-[11px] text-text-faint flex items-center gap-2">
            <Badge variant="outline">wallet</Badge>
            <span className="font-mono">{walletAddr ? shortAddr(walletAddr, 6) : 'not connected'}</span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-bg-elevated/40 p-5">
          <div className="flex items-center gap-2 text-xs text-text-faint uppercase tracking-wide">
            <Zap className="h-3.5 w-3.5" /> How it works
          </div>
          <div className="mt-2 text-lg font-medium">Buy credits once, spend anytime</div>
          <ul className="mt-2 space-y-1 text-[11px] text-text-faint leading-relaxed">
            <li>• One Phantom signature buys USDC credit with a seller.</li>
            <li>• 90% goes to the seller's wallet, {PLATFORM_FEE_PCT}% to the treasury — same tx.</li>
            <li>• Your API key spends that credit. No popups per request.</li>
            <li>• When it runs out, top up the seller again.</li>
          </ul>
        </div>
      </div>

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
    </div>
  );
}
