'use client';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Search, Loader2, TrendingDown, Users, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { fetcher } from '@/lib/fetcher';

type Model = {
  id: string;
  name: string;
  description: string;
  modality: string;
  contextLength: number;
  direct: { promptPerM: number; completionPerM: number };
  best: { promptPerM: number; completionPerM: number; sellers: number };
  savings: number;
};

const MODALITIES = [
  { id: 'text', label: 'Text', enabled: true },
  { id: 'image', label: 'Image', enabled: false },
  { id: 'video', label: 'Video', enabled: false },
  { id: 'music', label: 'Music', enabled: false },
  { id: 'tts', label: 'TTS', enabled: false },
  { id: 'stt', label: 'STT', enabled: false },
] as const;

export function MarketplaceTable() {
  const { data, isLoading } = useSWR<{ models: Model[] }>('/api/models', fetcher, { refreshInterval: 60_000 });
  const [q, setQ] = useState('');
  const [modality, setModality] = useState<string>('text');
  const [expanded, setExpanded] = useState<string | null>(null);

  const models = data?.models || [];
  const filtered = useMemo(() => {
    return models.filter((m) => {
      if (modality === 'text') {
        if (m.modality !== 'text' && m.modality !== 'text->text' && !/text/.test(m.modality || '')) return false;
      } else if (m.modality !== modality) return false;
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
        <div className="flex items-center gap-1 rounded-full border border-border bg-bg-card/60 p-1 overflow-x-auto">
          {MODALITIES.map((m) => (
            <button
              key={m.id}
              onClick={() => m.enabled && setModality(m.id)}
              disabled={!m.enabled}
              title={!m.enabled ? 'Coming soon' : ''}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
                m.id === modality ? 'bg-accent text-black' : 'text-text-dim hover:text-text',
                !m.enabled && 'opacity-40 cursor-not-allowed',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="text-xs text-text-faint">
        Showing {filtered.length} of {models.length} models
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-bg-card/40 backdrop-blur-sm card-glow">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated/60 text-text-faint text-[11px] uppercase tracking-wider">
            <tr>
              <th className="text-left font-medium px-4 py-3">Model</th>
              <th className="text-left font-medium px-4 py-3">Best Price</th>
              <th className="text-left font-medium px-4 py-3">Savings</th>
              <th className="text-left font-medium px-4 py-3">Sellers</th>
              <th className="text-left font-medium px-4 py-3">Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-text-faint">
                <Loader2 className="h-4 w-4 inline animate-spin mr-2" /> Loading marketplace…
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-text-faint">No models match.</td></tr>
            ) : (
              filtered.map((m) => (
                <Row key={m.id} m={m} expanded={expanded === m.id} onToggle={() => setExpanded((e) => (e === m.id ? null : m.id))} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ m, expanded, onToggle }: { m: Model; expanded: boolean; onToggle: () => void }) {
  const savingsPct = Math.round(m.savings * 100);
  return (
    <>
      <tr className="hover:bg-bg-card-hover/40 cursor-pointer" onClick={onToggle}>
        <td className="px-4 py-3">
          <div className="font-mono text-xs text-text">{m.id}</div>
          {m.name && m.name !== m.id && <div className="text-[11px] text-text-faint">{m.name}</div>}
        </td>
        <td className="px-4 py-3 font-mono text-xs">
          <div>${fmt(m.best.promptPerM)} <span className="text-text-faint">/ M in</span></div>
          <div className="text-text-dim">${fmt(m.best.completionPerM)} <span className="text-text-faint">/ M out</span></div>
        </td>
        <td className="px-4 py-3">
          {savingsPct > 0 ? (
            <Badge variant="success" className="font-mono">
              <TrendingDown className="h-3 w-3" /> {savingsPct}%
            </Badge>
          ) : (
            <span className="text-text-faint text-xs">—</span>
          )}
        </td>
        <td className="px-4 py-3">
          <span className="inline-flex items-center gap-1 text-xs text-text-dim">
            <Users className="h-3 w-3" /> {m.best.sellers}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="inline-flex items-center gap-1 text-xs text-text-faint">
            <MessageSquare className="h-3 w-3" /> —
          </span>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-bg-elevated/30">
          <td colSpan={5} className="px-6 py-4">
            <div className="grid sm:grid-cols-[2fr_1fr] gap-6">
              <div>
                <h4 className="text-xs uppercase tracking-wider text-text-faint mb-2">About</h4>
                <p className="text-sm text-text-dim leading-relaxed">
                  {m.description || 'No description.'}
                </p>
                <div className="mt-3 flex gap-2 text-xs">
                  <Badge variant="outline">ctx {m.contextLength.toLocaleString()}</Badge>
                  <Badge variant="outline">{m.modality}</Badge>
                </div>
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-wider text-text-faint mb-2">Direct API price</h4>
                <div className="font-mono text-sm space-y-1">
                  <div>${fmt(m.direct.promptPerM)} <span className="text-text-faint">/ M input</span></div>
                  <div>${fmt(m.direct.completionPerM)} <span className="text-text-faint">/ M output</span></div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function fmt(n: number) {
  if (n === 0) return '0.00';
  if (n < 0.01) return n.toFixed(4);
  if (n < 1) return n.toFixed(3);
  return n.toFixed(2);
}
