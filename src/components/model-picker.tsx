'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ModelOption = {
  id: string;
  name?: string;
  promptPerM?: number;
  completionPerM?: number;
};

export function ModelPicker({
  models,
  value,
  onChange,
  placeholder = 'Pick a model',
}: {
  models: ModelOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const filtered = useMemo(() => {
    const f = q.toLowerCase().trim();
    const base = f
      ? models.filter((m) => m.id.toLowerCase().includes(f) || (m.name || '').toLowerCase().includes(f))
      : models;
    return base.slice(0, 200);
  }, [q, models]);

  const selected = models.find((m) => m.id === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border bg-bg-elevated/60 px-3 py-2 text-left text-sm transition-colors',
          open ? 'border-accent/60 ring-2 ring-accent/30' : 'border-border hover:border-border-strong',
        )}
      >
        <div className="flex-1 min-w-0">
          {selected ? (
            <div className="flex flex-col leading-tight">
              <span className="font-mono text-xs truncate">{selected.id}</span>
              {selected.name && selected.name !== selected.id && (
                <span className="text-[11px] text-text-faint truncate">{selected.name}</span>
              )}
            </div>
          ) : (
            <span className="text-text-faint">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={cn('h-4 w-4 text-text-faint shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-md border border-border bg-bg-card shadow-2xl card-glow overflow-hidden fade-up">
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-faint" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Search ${models.length} models…`}
                className="w-full rounded bg-bg-elevated/60 border border-border pl-8 pr-3 py-1.5 text-xs font-mono focus:outline-none focus:border-accent/50"
              />
            </div>
          </div>
          <ul className="max-h-72 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-xs text-text-faint">No matches.</li>
            ) : (
              filtered.map((m) => {
                const isSel = m.id === value;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(m.id);
                        setOpen(false);
                        setQ('');
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2 text-xs hover:bg-bg-card-hover/60 flex items-start gap-2',
                        isSel && 'bg-accent/5',
                      )}
                    >
                      <Check className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', isSel ? 'text-accent' : 'opacity-0')} />
                      <div className="flex-1 min-w-0">
                        <div className="font-mono truncate">{m.id}</div>
                        {m.name && m.name !== m.id && (
                          <div className="text-[11px] text-text-faint truncate">{m.name}</div>
                        )}
                      </div>
                      {(m.promptPerM !== undefined || m.completionPerM !== undefined) && (
                        <div className="text-right text-[10px] text-text-faint font-mono shrink-0">
                          {m.promptPerM !== undefined && <div>${fmt(m.promptPerM)} in</div>}
                          {m.completionPerM !== undefined && <div>${fmt(m.completionPerM)} out</div>}
                        </div>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
          {filtered.length === 200 && (
            <div className="border-t border-border px-3 py-2 text-[10px] text-text-faint">
              Showing first 200 — refine search to narrow.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function fmt(n: number) {
  if (n === 0) return '0';
  if (n < 0.01) return n.toFixed(4);
  if (n < 1) return n.toFixed(3);
  return n.toFixed(2);
}
