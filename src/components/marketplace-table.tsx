'use client';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  Search, Loader2, Copy, ChevronDown, Check,
  Type, Image as ImageIcon, Video, Music, Volume2, Mic, Zap,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetcher } from '@/lib/fetcher';
import { BuyCreditsModal } from '@/components/buy-credits-modal';
import { usePrivy } from '@privy-io/react-auth';
import { toast } from 'sonner';
import { getProvider } from '@/lib/providers/registry';

type Model = {
  id: string;
  name: string;
  description: string;
  modality: string;
  contextLength: number;
  capabilities: string[];
  direct: { promptPerM: number; completionPerM: number };
  best: { promptPerM: number; completionPerM: number; sellers: number; capacityUsdc: number };
  savings: number;
  activity: { messages: number; spentUsdc: number; volumeUsdc: number; tokens: number };
  listedAt: string | null;
};

type Offer = {
  id: string;
  rank: number;
  sellerUserId: string;
  sellerWallet: string | null;
  sellerLabel: string;
  provider: string;
  priceInPerM: number;
  priceOutPerM: number;
  maxDailyCapacityUsdc: number;
  cumulativeCapacityUsdc: number;
  sold24hUsdc: number;
  creditsSoldUsdc: number;
  discount: number;
  status: string;
};

type OffersPayload = {
  offers: Offer[];
  direct: { promptPerM: number; completionPerM: number; total: number };
  totals: { sellers: number; totalCapacityUsdc: number; sold24hUsdc: number };
};

type ModalityId = 'text' | 'image' | 'video' | 'music' | 'tts' | 'stt';
const MODALITIES: { id: ModalityId; label: string; icon: React.ReactNode }[] = [
  { id: 'text',  label: 'Text',  icon: <Type className="h-3.5 w-3.5" /> },
  { id: 'image', label: 'Image', icon: <ImageIcon className="h-3.5 w-3.5" /> },
  { id: 'video', label: 'Video', icon: <Video className="h-3.5 w-3.5" /> },
  { id: 'music', label: 'Music', icon: <Music className="h-3.5 w-3.5" /> },
  { id: 'tts',   label: 'TTS',   icon: <Volume2 className="h-3.5 w-3.5" /> },
  { id: 'stt',   label: 'STT',   icon: <Mic className="h-3.5 w-3.5" /> },
];

function matchesModality(m: Model, tab: ModalityId): boolean {
  const raw = (m.modality || '').toLowerCase();
  const [inputs = '', outputs = ''] = raw.includes('->') ? raw.split('->') : [raw, raw];
  const ins = inputs.split('+').map((s) => s.trim());
  const outs = outputs.split('+').map((s) => s.trim());
  switch (tab) {
    case 'text':  return outs.includes('text') && !outs.includes('image') && !outs.includes('video') && !outs.includes('audio');
    case 'image': return outs.includes('image');
    case 'video': return outs.includes('video');
    case 'music': return outs.includes('audio') && /music|song|melody/.test(`${m.id} ${m.name} ${m.description}`.toLowerCase());
    case 'tts':   return outs.includes('audio') && !(/music|song|melody/.test(`${m.id} ${m.name} ${m.description}`.toLowerCase()));
    case 'stt':   return ins.includes('audio') && outs.includes('text');
  }
}

export function MarketplaceTable() {
  const { data, isLoading } = useSWR<{ models: Model[] }>('/api/models', fetcher, { refreshInterval: 60_000 });
  const [q, setQ] = useState('');
  const [modality, setModality] = useState<ModalityId>('text');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [buyTarget, setBuyTarget] = useState<{ modelId: string; offer: Offer } | null>(null);

  const models = data?.models || [];

  const countsByModality = useMemo(() => {
    const counts: Record<ModalityId, number> = { text: 0, image: 0, video: 0, music: 0, tts: 0, stt: 0 };
    for (const m of models) for (const tab of MODALITIES) if (matchesModality(m, tab.id)) counts[tab.id]++;
    return counts;
  }, [models]);

  const filtered = useMemo(() => {
    return models.filter((m) => {
      if (!matchesModality(m, modality)) return false;
      if (!q) return true;
      const qq = q.toLowerCase();
      return m.id.toLowerCase().includes(qq) || (m.name || '').toLowerCase().includes(qq);
    });
  }, [models, q, modality]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-faint" />
          <Input
            placeholder="Search models…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-xs text-text-faint sm:ml-auto whitespace-nowrap">
          Showing <span className="font-mono text-text">{filtered.length}</span> of <span className="font-mono">{models.length}</span> models
        </div>
      </div>

      <div className="flex items-center gap-1 rounded-full border border-border bg-bg-card/60 p-1 overflow-x-auto w-fit">
        {MODALITIES.map((m) => {
          const n = countsByModality[m.id] || 0;
          const empty = n === 0;
          return (
            <button
              key={m.id}
              onClick={() => setModality(m.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap',
                m.id === modality
                  ? 'bg-accent text-black shadow-[0_0_24px_-6px_rgba(34,211,238,0.6)]'
                  : 'text-text-dim hover:text-text hover:bg-bg-card-hover/60',
                empty && m.id !== modality && 'opacity-50',
              )}
              title={empty ? 'No models in this category yet' : ''}
            >
              {m.icon}{m.label}
              <span className={cn(
                'ml-0.5 rounded-full px-1.5 py-px text-[10px] font-mono',
                m.id === modality ? 'bg-black/15 text-black/70' : 'bg-bg-elevated/80 text-text-faint',
              )}>{n}</span>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl glass card-glow reveal reveal-delay-1">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_28px] gap-x-6 px-5 py-3 bg-bg-elevated/40 text-text-faint text-[10px] uppercase tracking-[0.15em] border-b border-border/60">
          <div>Model</div>
          <div className="text-right">Best Price</div>
          <div className="text-right">Savings</div>
          <div className="text-right">Sellers</div>
          <div className="text-right">Activity</div>
          <div></div>
        </div>
        <div className="divide-y divide-border/70">
          {isLoading ? (
            <div className="px-4 py-12 text-center text-text-faint">
              <Loader2 className="h-4 w-4 inline animate-spin mr-2" /> Loading marketplace…
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <div className="text-text-faint text-sm">No {modality} models available yet.</div>
              <div className="mt-1 text-text-faint/60 text-[11px]">Once OpenRouter (or a connected provider) lists models in this category, they'll appear here.</div>
            </div>
          ) : (
            filtered.map((m, i) => (
              <ModelRow
                key={m.id}
                m={m}
                index={i}
                expanded={expanded === m.id}
                onToggle={() => setExpanded((e) => (e === m.id ? null : m.id))}
                onBuy={(offer) => setBuyTarget({ modelId: m.id, offer })}
              />
            ))
          )}
        </div>
      </div>

      <BuyCreditsModal
        open={!!buyTarget}
        onClose={() => setBuyTarget(null)}
        modelId={buyTarget?.modelId || ''}
        offer={buyTarget?.offer || null}
      />
    </div>
  );
}

/* ───── Collapsed model row ───── */
function ModelRow({
  m, index, expanded, onToggle, onBuy,
}: { m: Model; index: number; expanded: boolean; onToggle: () => void; onBuy: (o: Offer) => void }) {
  const savingsPct = Math.round(m.savings * 100);
  const [copied, setCopied] = useState(false);
  const isNew = m.listedAt ? Date.now() - Date.parse(m.listedAt) < 24 * 60 * 60 * 1000 : false;
  const listedAgo = m.listedAt ? timeAgo(m.listedAt) : null;

  return (
    <div className="group transition-colors fade-up" style={{ animationDelay: `${Math.min(index * 14, 280)}ms` }}>
      <div
        onClick={onToggle}
        className={cn(
          'grid grid-cols-[1fr_auto_auto_auto_auto_28px] gap-x-6 items-center px-5 py-4 cursor-pointer transition-colors',
          expanded ? 'bg-bg-card-hover/40' : 'hover:bg-bg-card-hover/30',
        )}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-semibold text-text truncate">{m.id}</span>
            {isNew && (
              <span className="inline-flex items-center rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-accent font-semibold">
                New
              </span>
            )}
            {listedAgo && !isNew && (
              <span className="text-[10px] text-text-faint" title={`Last listed ${m.listedAt}`}>listed {listedAgo}</span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(m.id);
                setCopied(true);
                toast.success('Model id copied');
                setTimeout(() => setCopied(false), 1200);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-bg-card/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-text-faint hover:text-accent hover:border-accent/60"
            >
              {copied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />} {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          {m.name && m.name !== m.id && (
            <div className="mt-1 flex items-center gap-2 flex-wrap text-[11px] text-text-faint">
              <span>{m.name}</span>
              {m.capabilities.map((c) => <CapabilityTag key={c} label={c} />)}
            </div>
          )}
          {(!m.name || m.name === m.id) && m.capabilities.length > 0 && (
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              {m.capabilities.map((c) => <CapabilityTag key={c} label={c} />)}
            </div>
          )}
        </div>

        <div className="text-right font-mono text-xs whitespace-nowrap">
          <div>${fmt(m.best.promptPerM)} <span className="text-text-faint">/ M input</span></div>
          <div className="text-text-dim">${fmt(m.best.completionPerM)} <span className="text-text-faint">/ M output</span></div>
        </div>

        <div className="text-right font-mono text-sm whitespace-nowrap">
          {savingsPct > 0 ? <span className="text-success">{savingsPct}%</span> : <span className="text-text-faint">—</span>}
        </div>

        <div className="text-right font-mono text-sm whitespace-nowrap">
          {m.best.sellers || <span className="text-text-faint">—</span>}
        </div>

        <div className="text-right whitespace-nowrap">
          <div className="font-mono text-sm">{formatMessages(m.activity.messages)} msgs</div>
          <div className="font-mono text-[11px] text-success">${fmt2(m.activity.volumeUsdc)} sold</div>
        </div>

        <div className="text-text-faint">
          <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
        </div>
      </div>

      {expanded && (
        <ExpandedDetail m={m} onBuy={onBuy} />
      )}
    </div>
  );
}

/* ───── Expanded view ───── */
function ExpandedDetail({ m, onBuy }: { m: Model; onBuy: (o: Offer) => void }) {
  const { data, isLoading } = useSWR<OffersPayload>(`/api/models/${encodeURIComponent(m.id)}/offers`, fetcher);
  const { authenticated, login } = usePrivy();

  if (isLoading) return <div className="px-5 py-8 text-xs text-text-faint">Loading providers…</div>;
  if (!data || data.offers.length === 0) {
    return (
      <div className="px-5 py-8 border-t border-border/60 bg-bg-elevated/20">
        <p className="text-sm text-text-faint">No active sellers for this model yet.</p>
      </div>
    );
  }

  const { offers, direct, totals } = data;
  const totalSold = offers.reduce((acc, o) => acc + o.sold24hUsdc, 0);

  return (
    <div className="border-t border-border/60 bg-bg-elevated/20 fade-up">
      {/* Chart + meta */}
      <div className="px-5 sm:px-8 py-6 grid lg:grid-cols-[1fr_280px] gap-6 items-start">
        <DiscountChart offers={offers} direct={direct} />

        <div className="space-y-3">
          <div className="rounded-lg border border-border/70 bg-bg-card/50 p-4">
            <div className="text-[10px] uppercase tracking-widest text-text-faint">Description</div>
            <p className="mt-1.5 text-xs text-text-dim leading-relaxed line-clamp-5">{m.description || 'No description.'}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Mini label="ctx" value={`${(m.contextLength / 1000).toFixed(0)}K`} />
            <Mini label="modality" value={m.modality} />
            <Mini label="direct in" value={`$${fmt(direct.promptPerM)}/M`} />
            <Mini label="direct out" value={`$${fmt(direct.completionPerM)}/M`} />
          </div>
        </div>
      </div>

      {/* Stat strip */}
      <div className="px-5 sm:px-8 pb-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-text-faint border-t border-border/40 pt-4">
        <span>Credits sold <span className="font-mono text-success">${fmt2(m.activity.volumeUsdc)}</span></span>
        <span>Inference spent <span className="font-mono text-text">${fmt2(m.activity.spentUsdc)}</span></span>
        <span>24h Volume <span className="font-mono text-text">${fmt2(totalSold)}</span></span>
        <span>Sellers <span className="font-mono text-text">{totals.sellers}</span></span>
        <span>Total Capacity <span className="font-mono text-text">${fmt2(totals.totalCapacityUsdc)}</span></span>
        <span>Activity <span className="font-mono text-text">{formatMessages(m.activity.messages)} msgs</span></span>
        <span>Tokens <span className="font-mono text-text">{formatMessages(m.activity.tokens)}</span></span>
        {m.listedAt && <span>Latest offer <span className="font-mono text-text">{timeAgo(m.listedAt)}</span></span>}
      </div>

      {/* Per-seller table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-bg-elevated/30 text-text-faint text-[10px] uppercase tracking-[0.12em]">
            <tr>
              <th className="text-left font-medium px-5 py-2.5 w-10">#</th>
              <th className="text-left font-medium px-3 py-2.5">Provider</th>
              <th className="text-left font-medium px-3 py-2.5">Discount</th>
              <th className="text-right font-medium px-3 py-2.5">Input $/M</th>
              <th className="text-right font-medium px-3 py-2.5">Output $/M</th>
              <th className="text-right font-medium px-3 py-2.5">Offered</th>
              <th className="text-right font-medium px-3 py-2.5">Total Offered</th>
              <th className="text-right font-medium px-3 py-2.5">Sold 24h</th>
              <th className="text-right font-medium px-3 py-2.5">Status</th>
              <th className="text-right font-medium px-5 py-2.5"> </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {offers.map((o) => (
              <tr key={o.id} className="hover:bg-bg-card-hover/40 transition-colors">
                <td className="px-5 py-2.5 text-text-faint">{o.rank}</td>
                <td className="px-3 py-2.5">
                  <ProviderCell slug={o.provider} sellerLabel={o.sellerLabel} />
                </td>
                <td className="px-3 py-2.5">
                  <DiscountBadge value={o.discount} />
                </td>
                <td className="px-3 py-2.5 text-right font-mono">${fmt(o.priceInPerM)}</td>
                <td className="px-3 py-2.5 text-right font-mono">${fmt(o.priceOutPerM)}</td>
                <td className="px-3 py-2.5 text-right font-mono">
                  {o.maxDailyCapacityUsdc > 100000 ? '∞' : `$${fmt2(o.maxDailyCapacityUsdc)}`}
                </td>
                <td className="px-3 py-2.5 text-right font-mono">${fmt2(o.cumulativeCapacityUsdc)}</td>
                <td className="px-3 py-2.5 text-right font-mono">
                  {o.sold24hUsdc > 0 ? `$${fmt2(o.sold24hUsdc)}` : <span className="text-text-faint">—</span>}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <StatusDot active={o.status === 'active'} />
                </td>
                <td className="px-5 py-2.5 text-right">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => (authenticated ? onBuy(o) : login())}
                    disabled={!o.sellerWallet}
                    title={!o.sellerWallet ? 'Seller has no payout wallet' : ''}
                  >
                    <Zap className="h-3 w-3" /> Buy
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───── Chart (cumulative credits offered vs discount) ───── */
function DiscountChart({ offers, direct }: { offers: Offer[]; direct: { total: number } }) {
  const w = 640, h = 240, pad = { l: 50, r: 16, t: 18, b: 32 };

  const points = useMemo(() => {
    // X axis: discount %, from 100% off (cheapest) on the left to negative on the right.
    // Step chart of cumulative capacity at each tier (sorted by discount desc).
    const sorted = [...offers].sort((a, b) => b.discount - a.discount);
    let cum = 0;
    const pts: { x: number; y: number; cap: number; cum: number; offer: Offer }[] = [];
    for (const o of sorted) {
      cum += o.maxDailyCapacityUsdc > 100000 ? 0 : o.maxDailyCapacityUsdc; // exclude ∞ from chart
      pts.push({ x: o.discount, y: cum, cap: o.maxDailyCapacityUsdc, cum, offer: o });
    }
    return pts;
  }, [offers]);

  const maxCum = Math.max(1, ...points.map((p) => p.y));
  const niceMax = nicePeak(maxCum);

  const sx = (xd: number) => {
    // map discount 1 (100%) → left, -0.1 (-10%) → right
    const clamped = Math.max(-0.1, Math.min(1, xd));
    const t = (1 - clamped) / 1.1; // 0 (left) → 1 (right)
    return pad.l + t * (w - pad.l - pad.r);
  };
  const sy = (v: number) => h - pad.b - (v / niceMax) * (h - pad.t - pad.b);

  const axTicks = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0, -0.1];
  const yTicks = [niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax];

  // Build step path
  let pathD = '';
  let areaD = '';
  if (points.length > 0) {
    pathD = `M ${sx(points[0].x)} ${sy(0)} `;
    pathD += `L ${sx(points[0].x)} ${sy(points[0].y)} `;
    for (let i = 1; i < points.length; i++) {
      pathD += `L ${sx(points[i].x)} ${sy(points[i - 1].y)} `;
      pathD += `L ${sx(points[i].x)} ${sy(points[i].y)} `;
    }
    const last = points[points.length - 1];
    pathD += `L ${sx(-0.1)} ${sy(last.y)} `;

    areaD = pathD + `L ${sx(-0.1)} ${sy(0)} L ${sx(points[0].x)} ${sy(0)} Z`;
  }

  return (
    <div className="rounded-xl border border-border/70 bg-bg-card/40 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-widest text-text-faint">Credits offered vs discount</div>
        <div className="text-[10px] text-text-faint font-mono">total ${fmt2(maxCum)}</div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
        {/* Y grid */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} y1={sy(t)} x2={w - pad.r} y2={sy(t)} stroke="rgba(148,163,184,0.12)" strokeDasharray="3 4" />
            <text x={pad.l - 6} y={sy(t) + 3} textAnchor="end" fontSize="9" fill="rgba(148,163,184,0.6)" fontFamily="ui-monospace">
              ${fmt2(t)}
            </text>
          </g>
        ))}
        {/* X ticks */}
        {axTicks.map((t, i) => (
          <g key={i}>
            <line x1={sx(t)} y1={pad.t} x2={sx(t)} y2={h - pad.b} stroke="rgba(148,163,184,0.05)" />
            <text x={sx(t)} y={h - pad.b + 14} textAnchor="middle" fontSize="9" fill="rgba(148,163,184,0.7)" fontFamily="ui-monospace">
              {Math.round(t * 100)}%
            </text>
          </g>
        ))}
        {/* Zero line marker */}
        <line x1={sx(0)} y1={pad.t} x2={sx(0)} y2={h - pad.b} stroke="rgba(34,211,238,0.35)" strokeDasharray="2 3" />
        <text x={sx(0)} y={pad.t - 4} textAnchor="middle" fontSize="9" fill="rgba(34,211,238,0.8)" fontFamily="ui-monospace">direct</text>

        {/* Area + line */}
        {areaD && <path d={areaD} fill="url(#grad)" opacity="0.35" />}
        {pathD && <path d={pathD} fill="none" stroke="#4ade80" strokeWidth="2" strokeLinejoin="round" />}
        {points.map((p, i) => (
          <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r="3" fill="#4ade80" stroke="#0f1525" strokeWidth="1.5">
            <title>{`${Math.round(p.x * 100)}% off · ${p.offer.sellerLabel} · cum $${fmt2(p.y)}`}</title>
          </circle>
        ))}

        {/* Axis labels */}
        <text x={(pad.l + w - pad.r) / 2} y={h - 4} textAnchor="middle" fontSize="10" fill="rgba(148,163,184,0.6)">discount vs direct</text>

        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4ade80" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

/* ───── Small UI atoms ───── */
function ProviderCell({ slug, sellerLabel }: { slug: string; sellerLabel: string }) {
  const p = getProvider(slug);
  const name = p?.name ?? slug;
  const tint = p?.tint ?? 'text-text';
  return (
    <div className="flex flex-col gap-0.5 min-w-[140px]">
      <span className={cn('text-[12px] font-medium', tint)}>{name}</span>
      <span className="text-[10px] font-mono text-text-faint">{sellerLabel}</span>
    </div>
  );
}

function CapabilityTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded border border-border/70 bg-bg-card/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-text-dim">
      {label}
    </span>
  );
}

function DiscountBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  if (pct > 0) {
    return (
      <span className="inline-flex items-center rounded-md border border-success/40 bg-success/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-success">
        {pct}% off
      </span>
    );
  }
  if (pct < 0) {
    return (
      <span className="inline-flex items-center rounded-md border border-danger/40 bg-danger/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-danger">
        +{Math.abs(pct)}%
      </span>
    );
  }
  return <span className="inline-flex items-center rounded-md border border-border/70 bg-bg-card/60 px-2 py-0.5 font-mono text-[11px] text-text-faint">—</span>;
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={cn('inline-block h-2.5 w-2.5 rounded-full', active ? 'bg-success shadow-[0_0_8px_rgba(74,222,128,0.7)]' : 'bg-text-faint')} />
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-bg-card/40 px-2.5 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-text-faint">{label}</div>
      <div className="font-mono text-[11px] truncate">{value}</div>
    </div>
  );
}

/* ───── helpers ───── */
function fmt(n: number) {
  if (n === 0) return '0.00';
  if (n < 0.01) return n.toFixed(4);
  if (n < 1) return n.toFixed(3);
  return n.toFixed(2);
}
function fmt2(n: number) {
  if (n === 0) return '0';
  if (n < 0.01) return n.toFixed(4);
  if (n < 1) return n.toFixed(2);
  if (n < 1000) return n.toFixed(2);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}
function timeAgo(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  if (isNaN(ms)) return '';
  const s = Math.max(1, Math.floor(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

function formatMessages(n: number): string {
  if (n === 0) return '0';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}
function nicePeak(n: number): number {
  if (n <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(n)));
  const norm = n / mag;
  let nice;
  if (norm <= 1) nice = 1;
  else if (norm <= 2) nice = 2;
  else if (norm <= 5) nice = 5;
  else nice = 10;
  return nice * mag;
}
