'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Zap, ExternalLink } from 'lucide-react';
import { formatUsdc, shortAddr } from '@/lib/utils';
import { useAuthedFetch } from '@/lib/authed-fetch';

const CLUSTER = (process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'devnet') as 'devnet' | 'mainnet-beta';
const RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  (CLUSTER === 'mainnet-beta' ? 'https://solana-rpc.publicnode.com' : 'https://api.devnet.solana.com');
const USDC_DECIMALS = 6;
const PLATFORM_FEE_PCT = Math.round(Number(process.env.NEXT_PUBLIC_PLATFORM_FEE_RATE || 0.01) * 100);
const EXPLORER = (sig: string) =>
  CLUSTER === 'mainnet-beta' ? `https://solscan.io/tx/${sig}` : `https://solscan.io/tx/${sig}?cluster=devnet`;

type Props = {
  open: boolean;
  onClose: () => void;
  modelId: string;
  offer: {
    id: string;
    sellerUserId: string;
    sellerWallet: string | null;
    priceInPerM: number;
    priceOutPerM: number;
  } | null;
  onPurchased?: (info: { balance: number; txHash: string }) => void;
};

type HolderInfo = { isHolder: boolean; balance: string; mint: string; discount: number };

export function BuyCreditsModal({ open, onClose, modelId, offer, onPurchased }: Props) {
  const { wallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const wallet = wallets?.[0];
  const authedFetch = useAuthedFetch();

  const [amount, setAmount] = useState('5');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<string>('');
  const [walletUsdc, setWalletUsdc] = useState<number | null>(null);
  const [tx, setTx] = useState<string | null>(null);
  const [holder, setHolder] = useState<HolderInfo | null>(null);

  useEffect(() => {
    if (!open) { setStep(''); setTx(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const r = await authedFetch('/api/internal/holder');
        if (!r.ok) return;
        const j = (await r.json()) as HolderInfo;
        if (!cancelled) setHolder(j);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [open, authedFetch]);

  useEffect(() => {
    if (!wallet?.address) return;
    let cancelled = false;
    (async () => {
      try {
        const conn = new Connection(RPC, 'confirmed');
        const usdcMint = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
        const ata = getAssociatedTokenAddressSync(usdcMint, new PublicKey(wallet.address));
        try {
          const acc = await getAccount(conn, ata);
          if (!cancelled) setWalletUsdc(Number(acc.amount) / 10 ** USDC_DECIMALS);
        } catch {
          if (!cancelled) setWalletUsdc(0);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, [wallet?.address, open]);

  if (!offer) return null;

  const amt = Number(amount);
  const isHolder = !!holder?.isHolder;
  const effectiveFeePct = isHolder ? PLATFORM_FEE_PCT * (1 - (holder?.discount ?? 0.5)) : PLATFORM_FEE_PCT;
  const fee = +(amt * (effectiveFeePct / 100)).toFixed(6);
  const sellerGets = +(amt - fee).toFixed(6);

  async function buy() {
    if (busy) return;
    if (!wallet) return toast.error('No wallet connected');
    if (!offer?.sellerWallet) return toast.error('Seller has no payout wallet');
    if (!isFinite(amt) || amt <= 0) return toast.error('Enter an amount > 0');
    if (walletUsdc !== null && amt > walletUsdc) return toast.error('Exceeds your wallet USDC');

    setBusy(true);
    try {
      setStep('Asking server for a quote…');
      const qres = await authedFetch('/api/internal/credits/quote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sellerUserId: offer.sellerUserId, amountUsdc: amt }),
      });
      const qjson = await qres.json();
      if (!qres.ok) throw new Error(qjson?.error?.message || 'quote failed');

      setStep('Phantom will pop up to sign one transaction…');
      const conn = new Connection(RPC, 'confirmed');
      const buyer = new PublicKey(qjson.buyerWallet);
      const mint = new PublicKey(qjson.usdcMint);
      const buyerAta = getAssociatedTokenAddressSync(mint, buyer);
      const sellerAta = getAssociatedTokenAddressSync(mint, new PublicKey(qjson.sellerWallet));
      const treasuryAta = getAssociatedTokenAddressSync(mint, new PublicKey(qjson.treasuryWallet));

      const ixs: any[] = [];
      const sellerInfo = await conn.getAccountInfo(sellerAta);
      if (!sellerInfo) {
        ixs.push(
          createAssociatedTokenAccountInstruction(
            buyer, sellerAta, new PublicKey(qjson.sellerWallet), mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
          ),
        );
      }
      const treasuryInfo = await conn.getAccountInfo(treasuryAta);
      if (!treasuryInfo) {
        ixs.push(
          createAssociatedTokenAccountInstruction(
            buyer, treasuryAta, new PublicKey(qjson.treasuryWallet), mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
          ),
        );
      }
      ixs.push(
        createTransferCheckedInstruction(buyerAta, mint, sellerAta, buyer, BigInt(qjson.sellerAmountBase), qjson.usdcDecimals),
        createTransferCheckedInstruction(buyerAta, mint, treasuryAta, buyer, BigInt(qjson.feeAmountBase), qjson.usdcDecimals),
      );

      const { blockhash } = await conn.getLatestBlockhash('confirmed');
      const txObj = new Transaction({ feePayer: buyer, recentBlockhash: blockhash }).add(...ixs);
      const ser = txObj.serialize({ requireAllSignatures: false, verifySignatures: false });

      const { signature } = await signAndSendTransaction({
        transaction: new Uint8Array(ser),
        wallet,
        chain: `solana:${CLUSTER === 'mainnet-beta' ? 'mainnet' : 'devnet'}` as any,
      });
      const bs58 = (await import('bs58')).default;
      const sig = bs58.encode(signature);
      setTx(sig);
      setStep('Verifying on-chain…');

      const cres = await authedFetch('/api/internal/credits/confirm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sellerUserId: offer.sellerUserId, amountUsdc: amt, txHash: sig }),
      });
      const cjson = await cres.json();
      if (!cres.ok) throw new Error(cjson?.error?.message || 'confirm failed');

      toast.success(`+${formatUsdc(amt)} credits with seller`);
      setStep('Done.');
      onPurchased?.({ balance: cjson.balance, txHash: sig });
      setTimeout(() => onClose(), 600);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'purchase failed');
      setStep('Failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-accent" /> Buy credits
          </DialogTitle>
          <DialogDescription>
            Pay the seller's wallet directly. Credits unlock <span className="font-mono">{modelId}</span> via your API key — no popups per request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-md border border-border bg-bg-elevated/40 p-3 space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-text-faint">Seller</span><span className="font-mono">{shortAddr(offer.sellerWallet, 6) || '—'}</span></div>
            <div className="flex justify-between"><span className="text-text-faint">Price in / out</span><span className="font-mono">${offer.priceInPerM.toFixed(2)} / ${offer.priceOutPerM.toFixed(2)} per M</span></div>
            {walletUsdc !== null && <div className="flex justify-between"><span className="text-text-faint">Your wallet USDC</span><span className="font-mono">{formatUsdc(walletUsdc)}</span></div>}
          </div>

          <div>
            <Label>Amount (USDC)</Label>
            <Input
              mono
              type="number"
              step="0.01"
              min={0.01}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {[1, 5, 20, 100].map((n) => (
                <button
                  key={n}
                  onClick={() => setAmount(String(n))}
                  className="rounded-md border border-border bg-bg-card px-3 py-1.5 hover:bg-bg-card-hover"
                >
                  ${n}
                </button>
              ))}
              {walletUsdc !== null && walletUsdc > 0 && (
                <button
                  onClick={() => setAmount(String(walletUsdc))}
                  className="rounded-md border border-accent/40 bg-accent/10 text-accent px-3 py-1.5 hover:bg-accent/20"
                >
                  Max ({formatUsdc(walletUsdc)})
                </button>
              )}
            </div>
          </div>

          {isHolder && (
            <div className="rounded-md border border-success/40 bg-success/5 p-3 text-xs flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <Badge variant="success">$LLMMart Holder</Badge>
                <span className="text-text-dim">50% off platform fee</span>
              </span>
              <span className="font-mono text-success">{effectiveFeePct.toFixed(2)}% fee</span>
            </div>
          )}
          {!isHolder && holder && (
            <div className="rounded-md border border-border/70 bg-bg-elevated/40 p-3 text-[11px] text-text-faint flex items-center justify-between">
              <span>Hold $LLMMart and get 50% off the platform fee.</span>
              <a
                href={`https://pump.fun/coin/${holder.mint}`}
                target="_blank" rel="noreferrer"
                className="text-accent hover:underline"
              >Buy $LLMMart →</a>
            </div>
          )}

          <div className="rounded-md border border-border bg-bg-elevated/40 p-3 text-xs space-y-1">
            <div className="flex justify-between"><span className="text-text-faint">Seller receives</span><span className="font-mono">{formatUsdc(sellerGets, { digits: 4 })}</span></div>
            <div className="flex justify-between">
              <span className="text-text-faint">
                Platform fee ({effectiveFeePct.toFixed(2)}%)
                {isHolder && <span className="ml-1 text-success">· holder discount</span>}
              </span>
              <span className="font-mono">{formatUsdc(fee, { digits: 4 })}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1 mt-1"><span className="text-text-faint">You pay (one tx)</span><span className="font-mono">{formatUsdc(amt, { digits: 4 })}</span></div>
            <div className="flex justify-between"><span className="text-text-faint">Credits you receive</span><Badge variant="accent" className="font-mono">{formatUsdc(amt, { digits: 4 })}</Badge></div>
          </div>

          {step && <div className="text-xs text-text-faint">{step}{tx && (<> · <a href={EXPLORER(tx)} target="_blank" rel="noreferrer" className="text-accent inline-flex items-center gap-0.5">tx <ExternalLink className="h-3 w-3" /></a></>)}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button onClick={buy} disabled={busy || !offer.sellerWallet}>
              <Zap className="h-4 w-4" /> {busy ? 'Working…' : `Buy ${formatUsdc(amt)}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
