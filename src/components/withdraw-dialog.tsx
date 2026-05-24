'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth/solana';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthedFetch } from '@/lib/authed-fetch';

export function WithdrawDialog({ open, onOpenChange, max }: { open: boolean; onOpenChange: (b: boolean) => void; max: number }) {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const authedFetch = useAuthedFetch();
  const wallet = wallets?.[0]?.address || (user as any)?.wallet?.address || '';
  const [amount, setAmount] = useState('');
  const [dest, setDest] = useState(wallet || '');
  const [busy, setBusy] = useState(false);

  async function go() {
    if (busy) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error('Enter amount > 0');
    if (amt > max) return toast.error('Amount exceeds available balance');
    setBusy(true);
    try {
      const res = await authedFetch('/api/internal/withdraw', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amount: amt, destination: dest || wallet }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'failed');
      toast.success(`Sent ${amt} USDC`, { description: json.txHash?.slice(0, 16) + '…' });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Withdraw USDC</DialogTitle>
          <DialogDescription>Funds are sent from the platform treasury to the destination wallet.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Amount (USDC)</Label>
            <Input
              mono
              className="mt-1"
              type="number"
              min={0}
              step="0.01"
              placeholder={`max ${max.toFixed(4)}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label>Destination</Label>
            <Input
              mono
              className="mt-1"
              placeholder="solana address"
              value={dest}
              onChange={(e) => setDest(e.target.value)}
            />
            {wallet && <div className="mt-1 text-[11px] text-text-faint">Defaults to your connected wallet.</div>}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={go} disabled={busy}>{busy ? 'Sending…' : 'Confirm Withdraw'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
