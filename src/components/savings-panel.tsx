'use client';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { formatUsdc } from '@/lib/utils';
import { TrendingDown, DollarSign, Coins, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type Resp = {
  totals: { paid: number; direct: number; saved: number; avgSavings: number; count: number };
  requests: Array<{
    id: string;
    modelId: string;
    tokensIn: number;
    tokensOut: number;
    buyerCharge: string;
    directCost: string;
    routeSource: string;
    createdAt: string;
  }>;
};

export function SavingsPanel() {
  const { data } = useSWR<Resp>('/api/internal/savings', fetcher, { refreshInterval: 5000 });
  const t = data?.totals;

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-4 gap-4">
        <Stat icon={<TrendingDown className="h-4 w-4" />} label="Total Saved" value={formatUsdc(t?.saved ?? 0)} accent="success" />
        <Stat icon={<BarChart3 className="h-4 w-4" />} label="Avg Savings" value={`${Math.round((t?.avgSavings || 0) * 100)}%`} accent="success" />
        <Stat icon={<DollarSign className="h-4 w-4" />} label="You Paid" value={formatUsdc(t?.paid ?? 0)} />
        <Stat icon={<Coins className="h-4 w-4" />} label="Direct Would Cost" value={formatUsdc(t?.direct ?? 0)} accent="muted" />
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated/60 text-text-faint text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left font-medium px-4 py-3">Model</th>
              <th className="text-left font-medium px-4 py-3">Tokens</th>
              <th className="text-left font-medium px-4 py-3">Paid</th>
              <th className="text-left font-medium px-4 py-3">Saved</th>
              <th className="text-left font-medium px-4 py-3">Route</th>
              <th className="text-left font-medium px-4 py-3">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {!data?.requests ? (
              <tr><td colSpan={6} className="px-4 py-6 text-text-faint">Loading…</td></tr>
            ) : data.requests.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-text-faint">
                  No requests yet — use your Surplus API key and completed requests will appear here.
                </td>
              </tr>
            ) : (
              data.requests.map((r) => {
                const paid = Number(r.buyerCharge);
                const direct = Number(r.directCost);
                const saved = Math.max(0, direct - paid);
                return (
                  <tr key={r.id} className="hover:bg-bg-card-hover/40">
                    <td className="px-4 py-3 font-mono text-xs">{r.modelId}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.tokensIn} → {r.tokensOut}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatUsdc(paid, { digits: 4 })}</td>
                    <td className="px-4 py-3 font-mono text-xs text-success">{saved > 0 ? formatUsdc(saved, { digits: 4 }) : '—'}</td>
                    <td className="px-4 py-3">
                      <RouteBadge source={r.routeSource} />
                    </td>
                    <td className="px-4 py-3 text-xs text-text-faint">{new Date(r.createdAt).toLocaleString()}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: 'success' | 'muted' }) {
  return (
    <div className="rounded-lg border border-border bg-bg-elevated/40 p-5">
      <div className="flex items-center gap-2 text-xs text-text-faint uppercase tracking-wide">
        {icon} {label}
      </div>
      <div className={`mt-2 text-2xl font-semibold font-mono ${accent === 'success' ? 'text-success' : accent === 'muted' ? 'text-text-dim' : ''}`}>
        {value}
      </div>
    </div>
  );
}

function RouteBadge({ source }: { source: string }) {
  if (source === 'marketplace') return <Badge variant="accent">marketplace</Badge>;
  if (source === 'priority') return <Badge variant="outline">priority</Badge>;
  if (source === 'fallback') return <Badge variant="warn">fallback</Badge>;
  return <Badge variant="default">{source}</Badge>;
}
