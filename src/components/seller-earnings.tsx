'use client';
import { useState } from 'react';
import { useAuthedSWR } from '@/lib/authed-fetch';
import { formatUsdc } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowUpFromLine } from 'lucide-react';
import { WithdrawDialog } from '@/components/withdraw-dialog';

export function SellerEarnings() {
  const { data, mutate } = useAuthedSWR<{ balance: number; lifetimeEarned: number }>('/api/internal/earnings', { refreshInterval: 5000 });
  const [open, setOpen] = useState(false);
  const balance = data?.balance ?? 0;

  return (
    <>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-bg-elevated/40 p-5">
          <div className="text-xs text-text-faint uppercase tracking-wide">Available to Withdraw</div>
          <div className="mt-2 text-4xl font-semibold font-mono">{formatUsdc(balance)}</div>
          <Button onClick={() => setOpen(true)} className="mt-4" disabled={balance <= 0}>
            <ArrowUpFromLine className="h-4 w-4" /> Withdraw
          </Button>
        </div>
        <div className="rounded-lg border border-border bg-bg-elevated/40 p-5">
          <div className="text-xs text-text-faint uppercase tracking-wide">Lifetime Earned</div>
          <div className="mt-2 text-4xl font-semibold font-mono">{formatUsdc(data?.lifetimeEarned ?? 0)}</div>
          <div className="mt-4 text-xs text-text-faint">90% of every settled request routes to your offers.</div>
        </div>
      </div>
      <WithdrawDialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) mutate(); }} max={balance} />
    </>
  );
}
