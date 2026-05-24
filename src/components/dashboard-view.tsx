'use client';
import Link from 'next/link';
import {
  KeyRound, Wallet, TrendingDown, Coins, Send, Inbox, Tag, BarChart3, ArrowRight, ExternalLink,
} from 'lucide-react';
import { useAuthedSWR } from '@/lib/authed-fetch';
import { Badge } from '@/components/ui/badge';
import { formatUsdc, shortAddr } from '@/lib/utils';

type Dash = {
  account: { wallet: string | null; email: string | null; balance: number };
  keys: { active: number; total: number };
  buyer: {
    requests: number;
    paid: number;
    direct: number;
    saved: number;
    avgSavings: number;
    tokensIn: number;
    tokensOut: number;
  };
  seller: {
    sold: number;
    earnings: number;
    lifetimeEarned: number;
    offers: Array<{ id: string; modelId: string; priceInPerMUsdc: string; priceOutPerMUsdc: string; status: string }>;
  };
  recentRequests: Array<{
    id: string; modelId: string; tokensIn: number; tokensOut: number;
    buyerCharge: string; directCost: string; routeSource: string; createdAt: string;
  }>;
  recentLedger: Array<{
    id: string; kind: string; amountUsdc: string; note: string | null; txHash: string | null; createdAt: string;
  }>;
};

const CLUSTER = (process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'devnet') as 'devnet' | 'mainnet-beta';
const EXPLORER = (sig: string) =>
  CLUSTER === 'mainnet-beta'
    ? `https://solscan.io/tx/${sig}`
    : `https://solscan.io/tx/${sig}?cluster=devnet`;

export function DashboardView() {
  const { data, isLoading } = useAuthedSWR<Dash>('/api/internal/dashboard', { refreshInterval: 5000 });

  if (isLoading || !data) {
    return (
      <div className="grid sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-lg border border-border bg-bg-elevated/40 animate-pulse" />
        ))}
      </div>
    );
  }

  const { account, keys, buyer, seller, recentRequests, recentLedger } = data;
  const savingsPct = Math.round(buyer.avgSavings * 100);

  return (
    <div className="space-y-8">
      {/* Account header */}
      <div className="rounded-xl border border-border bg-bg-card/40 backdrop-blur-sm card-glow p-5 flex items-center gap-6">
        <div className="flex-1">
          <div className="text-xs text-text-faint uppercase tracking-wide">Wallet</div>
          <div className="mt-1 font-mono text-sm">{shortAddr(account.wallet, 6) || '—'}</div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-text-faint uppercase tracking-wide">Email</div>
          <div className="mt-1 text-sm">{account.email || '—'}</div>
        </div>
        <div className="flex-1 text-right">
          <div className="text-xs text-text-faint uppercase tracking-wide">USDC Balance</div>
          <div className="mt-1 font-mono text-2xl font-semibold">{formatUsdc(account.balance)}</div>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          icon={<KeyRound className="h-4 w-4" />}
          label="API Keys"
          value={`${keys.active}`}
          sub={`${keys.total} total`}
          href="/buy"
        />
        <Stat
          icon={<TrendingDown className="h-4 w-4" />}
          label="Saved"
          value={formatUsdc(buyer.saved)}
          sub={`${savingsPct}% avg vs direct`}
          accent="success"
        />
        <Stat
          icon={<Coins className="h-4 w-4" />}
          label="Spent"
          value={formatUsdc(buyer.paid)}
          sub={`${buyer.requests} requests`}
        />
        <Stat
          icon={<BarChart3 className="h-4 w-4" />}
          label="Seller Earnings"
          value={formatUsdc(seller.earnings)}
          sub={`${seller.sold} sales`}
          accent={seller.earnings > 0 ? 'success' : undefined}
          href="/sell"
        />
      </div>

      {/* Two columns */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent requests */}
        <div className="rounded-xl border border-border bg-bg-card/40 backdrop-blur-sm card-glow overflow-hidden">
          <header className="flex items-center justify-between p-5 border-b border-border">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold">Recent Purchases</h2>
            </div>
            <Link href="/buy" className="text-xs text-text-faint hover:text-accent inline-flex items-center gap-1">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </header>
          {recentRequests.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-faint">No requests yet.</div>
          ) : (
            <ul className="divide-y divide-border">
              {recentRequests.map((r) => {
                const saved = Math.max(0, Number(r.directCost) - Number(r.buyerCharge));
                return (
                  <li key={r.id} className="px-5 py-3 hover:bg-bg-card-hover/40 flex items-center gap-3 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono truncate">{r.modelId}</div>
                      <div className="text-text-faint">
                        {r.tokensIn} → {r.tokensOut} tok · {new Date(r.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono">{formatUsdc(Number(r.buyerCharge), { digits: 4 })}</div>
                      {saved > 0 && <div className="font-mono text-success">−{formatUsdc(saved, { digits: 4 })}</div>}
                    </div>
                    <RouteBadge source={r.routeSource} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Recent ledger */}
        <div className="rounded-xl border border-border bg-bg-card/40 backdrop-blur-sm card-glow overflow-hidden">
          <header className="flex items-center justify-between p-5 border-b border-border">
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold">Recent Transactions</h2>
            </div>
            <Link href="/buy" className="text-xs text-text-faint hover:text-accent inline-flex items-center gap-1">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </header>
          {recentLedger.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-faint">No transactions yet.</div>
          ) : (
            <ul className="divide-y divide-border">
              {recentLedger.map((t) => {
                const amt = Number(t.amountUsdc);
                return (
                  <li key={t.id} className="px-5 py-3 hover:bg-bg-card-hover/40 flex items-center gap-3 text-xs">
                    <KindBadge kind={t.kind} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-text-dim">{t.note || t.kind}</div>
                      <div className="text-text-faint">{new Date(t.createdAt).toLocaleString()}</div>
                    </div>
                    <div className={`font-mono ${amt >= 0 ? 'text-success' : 'text-text'}`}>
                      {amt >= 0 ? '+' : ''}{formatUsdc(amt, { digits: 4 })}
                    </div>
                    {t.txHash && (
                      <a href={EXPLORER(t.txHash)} target="_blank" rel="noreferrer" className="text-text-faint hover:text-accent" title="View on explorer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Active offers (if seller) */}
      <div className="rounded-xl border border-border bg-bg-card/40 backdrop-blur-sm card-glow overflow-hidden">
        <header className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold">Your Offers</h2>
          </div>
          <Link href="/sell" className="text-xs text-text-faint hover:text-accent inline-flex items-center gap-1">
            Manage <ArrowRight className="h-3 w-3" />
          </Link>
        </header>
        {seller.offers.length === 0 ? (
          <div className="p-8 text-center text-xs text-text-faint">
            You have no offers.{' '}
            <Link href="/sell" className="text-accent hover:underline">Create one →</Link>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-bg-elevated/40 text-text-faint uppercase tracking-wide text-[10px]">
              <tr>
                <th className="text-left font-medium px-5 py-2">Model</th>
                <th className="text-left font-medium px-5 py-2">Price In</th>
                <th className="text-left font-medium px-5 py-2">Price Out</th>
                <th className="text-left font-medium px-5 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {seller.offers.map((o) => (
                <tr key={o.id} className="hover:bg-bg-card-hover/40">
                  <td className="px-5 py-2 font-mono">{o.modelId}</td>
                  <td className="px-5 py-2 font-mono">${Number(o.priceInPerMUsdc).toFixed(2)} / M</td>
                  <td className="px-5 py-2 font-mono">${Number(o.priceOutPerMUsdc).toFixed(2)} / M</td>
                  <td className="px-5 py-2">
                    {o.status === 'active' ? <Badge variant="success">Active</Badge> : <Badge variant="warn">Paused</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon, label, value, sub, accent, href,
}: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: 'success'; href?: string }) {
  const inner = (
    <div className={`rounded-lg border border-border bg-bg-elevated/40 p-5 ${href ? 'hover:bg-bg-card-hover/40 hover:border-border-strong transition-colors' : ''}`}>
      <div className="flex items-center gap-2 text-xs text-text-faint uppercase tracking-wide">{icon} {label}</div>
      <div className={`mt-2 text-2xl font-semibold font-mono ${accent === 'success' ? 'text-success' : ''}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-text-faint">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function RouteBadge({ source }: { source: string }) {
  if (source === 'marketplace') return <Badge variant="accent">market</Badge>;
  if (source === 'priority') return <Badge variant="outline">priority</Badge>;
  if (source === 'fallback') return <Badge variant="warn">fallback</Badge>;
  return <Badge variant="default">{source}</Badge>;
}

function KindBadge({ kind }: { kind: string }) {
  if (kind === 'deposit') return <Badge variant="success">deposit</Badge>;
  if (kind === 'debit') return <Badge variant="outline">debit</Badge>;
  if (kind === 'credit') return <Badge variant="accent">credit</Badge>;
  if (kind === 'payout') return <Badge variant="warn">payout</Badge>;
  if (kind === 'refund') return <Badge variant="warn">refund</Badge>;
  return <Badge variant="default">{kind}</Badge>;
}
