'use client';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { formatUsdc } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowUpFromLine } from 'lucide-react';

export function SellerEarnings({ onWithdraw }: { onWithdraw?: () => void }) {
  const { data } = useSWR<{ balance: number; lifetimeEarned: number }>('/api/internal/earnings', fetcher, { refreshInterval: 5000 });
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="rounded-lg border border-border bg-bg-elevated/40 p-5">
        <div className="text-xs text-text-faint uppercase tracking-wide">Available to Withdraw</div>
        <div className="mt-2 text-4xl font-semibold font-mono">{formatUsdc(data?.balance ?? 0)}</div>
        <Button onClick={onWithdraw} className="mt-4">
          <ArrowUpFromLine className="h-4 w-4" /> Withdraw
        </Button>
      </div>
      <div className="rounded-lg border border-border bg-bg-elevated/40 p-5">
        <div className="text-xs text-text-faint uppercase tracking-wide">Lifetime Earned</div>
        <div className="mt-2 text-4xl font-semibold font-mono">{formatUsdc(data?.lifetimeEarned ?? 0)}</div>
        <div className="mt-4 text-xs text-text-faint">90% of every settled request routes to your offers.</div>
      </div>
    </div>
  );
}
