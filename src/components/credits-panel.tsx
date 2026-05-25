'use client';
import Link from 'next/link';
import { useAuthedSWR } from '@/lib/authed-fetch';
import { Badge } from '@/components/ui/badge';
import { Coins, ArrowRight } from 'lucide-react';
import { formatUsdc, shortAddr } from '@/lib/utils';

type Row = {
  sellerUserId: string;
  sellerWallet: string | null;
  balance: number;
  lifetime: number;
  updatedAt: string;
};

export function CreditsPanel() {
  const { data, isLoading } = useAuthedSWR<{ credits: Row[] }>('/api/internal/credits', { refreshInterval: 8000 });
  const rows = data?.credits || [];

  if (isLoading) {
    return <div className="h-24 rounded-md bg-bg-elevated/40 animate-pulse" />;
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-bg-elevated/40 p-6 text-center">
        <Coins className="h-5 w-5 mx-auto text-text-faint" />
        <p className="mt-3 text-sm text-text-dim">You have no credits yet.</p>
        <Link href="/markets" className="mt-3 inline-flex items-center gap-1 text-accent text-sm hover:underline">
          Browse marketplace <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const total = rows.reduce((acc, r) => acc + r.balance, 0);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-bg-elevated/40 p-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-text-faint uppercase tracking-wide"><Coins className="h-3.5 w-3.5" /> Total credits</div>
          <div className="mt-2 text-3xl font-semibold font-mono">{formatUsdc(total)}</div>
        </div>
        <Link href="/markets" className="text-xs text-accent hover:underline inline-flex items-center gap-1">
          Buy more <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated/40 text-text-faint text-[11px] uppercase tracking-wide">
            <tr>
              <th className="text-left font-medium px-4 py-2">Seller</th>
              <th className="text-right font-medium px-4 py-2">Balance</th>
              <th className="text-right font-medium px-4 py-2">Lifetime</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.sellerUserId} className="hover:bg-bg-card-hover/40">
                <td className="px-4 py-2.5 font-mono text-xs">
                  {shortAddr(r.sellerWallet, 5) || '—'}
                  {r.balance <= 0 && <Badge variant="warn" className="ml-2">empty</Badge>}
                </td>
                <td className="px-4 py-2.5 text-right font-mono">{formatUsdc(r.balance, { digits: 4 })}</td>
                <td className="px-4 py-2.5 text-right font-mono text-text-faint">{formatUsdc(r.lifetime, { digits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
