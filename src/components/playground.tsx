'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { useAuthedSWR } from '@/lib/authed-fetch';
import { Zap, Send, ArrowRight } from 'lucide-react';

const KEY_STORAGE = 'llmart-inf-key';

type UsableModel = {
  modelId: string;
  sellerUserId: string;
  sellerWallet: string | null;
  priceInPerM: number;
  priceOutPerM: number;
  provider: string;
  balance: number;
};

export function Playground() {
  const { data, isLoading } = useAuthedSWR<{ models: UsableModel[] }>(
    '/api/internal/credits/models',
    { refreshInterval: 8000 },
  );
  const usable = useMemo(() => data?.models ?? [], [data]);

  const [apiKey, setApiKey] = useState('');
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [prompt, setPrompt] = useState('Reply with the single word "ok".');
  const [output, setOutput] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>('');
  const outRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try { const s = sessionStorage.getItem(KEY_STORAGE); if (s) setApiKey(s); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { if (apiKey) sessionStorage.setItem(KEY_STORAGE, apiKey); } catch { /* ignore */ }
  }, [apiKey]);

  // Auto-pick the cheapest usable model as soon as one is available.
  useEffect(() => {
    if (usable.length > 0 && !selectedKey) {
      const first = usable[0];
      setSelectedKey(`${first.modelId}__${first.sellerUserId}`);
    }
  }, [usable, selectedKey]);

  const chosen = useMemo(
    () => usable.find((u) => `${u.modelId}__${u.sellerUserId}` === selectedKey) || null,
    [usable, selectedKey],
  );

  useEffect(() => { if (outRef.current) outRef.current.scrollTop = outRef.current.scrollHeight; }, [output]);

  const totalCredits = usable.reduce((acc, u) => acc + u.balance, 0);
  const hasCredits = totalCredits > 0;

  async function run() {
    if (busy) return;
    if (!apiKey || !apiKey.startsWith('inf_')) {
      return toast.error('Paste an inf_ key from section 1 above.');
    }
    if (!chosen) return toast.error('No model selected.');
    if (!prompt.trim()) return toast.error('Type something to send.');

    setBusy(true);
    setOutput('');
    setStatus(`Sending to ${chosen.modelId}…`);

    try {
      const res = await fetch('/api/inference/v1/chat/completions', {
        method: 'POST',
        headers: { 'authorization': `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model: chosen.modelId,
          stream: true,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({} as any));
        toast.error(j?.error?.message || `request failed (${res.status})`);
        setStatus('Failed.');
        return;
      }
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('text/event-stream')) {
        const txt = await res.text();
        try { setOutput(JSON.parse(txt)?.choices?.[0]?.message?.content || txt); } catch { setOutput(txt); }
        setStatus('Done.');
        return;
      }
      setStatus('Streaming…');
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value);
        const parts = buf.split('\n\n');
        buf = parts.pop() || '';
        for (const ev of parts) {
          const line = ev.split('\n').find((l) => l.startsWith('data: '));
          if (!line) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const j = JSON.parse(data);
            const delta = j?.choices?.[0]?.delta?.content;
            if (typeof delta === 'string') setOutput((cur) => cur + delta);
          } catch { /* ignore */ }
        }
      }
      setStatus('Done.');
    } catch (e: any) {
      toast.error(e?.message || 'request failed');
      setStatus('Failed.');
    } finally {
      setBusy(false);
    }
  }

  // ── Empty state ───────────────────────────────────────────────
  if (!isLoading && !hasCredits) {
    return (
      <div className="rounded-md border border-warn/30 bg-warn/5 p-5 text-sm">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="warn">No credit yet</Badge>
          <span className="text-text-dim">Buy credit with a seller first, then come back here.</span>
        </div>
        <Link
          href="/markets"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-black hover:bg-accent/90"
        >
          Browse marketplace <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-success/30 bg-success/5 p-3 text-xs flex items-center gap-3 flex-wrap">
        <Badge variant="success">${totalCredits.toFixed(4)} total credit</Badge>
        <span className="text-text-faint">
          {usable.length} usable model{usable.length === 1 ? '' : 's'} across{' '}
          {new Set(usable.map((u) => u.sellerUserId)).size} seller
          {new Set(usable.map((u) => u.sellerUserId)).size === 1 ? '' : 's'}.
        </span>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label>API key</Label>
          <Input
            mono
            placeholder="inf_…"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value.trim())}
            type="password"
          />
          <p className="mt-1 text-[10px] text-text-faint">From section 1 above. Stored only in this browser tab.</p>
        </div>
        <div>
          <Label>Model (auto-routes to your credit)</Label>
          <Select value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)}>
            {usable.map((u) => (
              <option key={`${u.modelId}__${u.sellerUserId}`} value={`${u.modelId}__${u.sellerUserId}`}>
                {u.modelId} · ${u.priceInPerM.toFixed(2)}/${u.priceOutPerM.toFixed(2)} per M · ${u.balance.toFixed(4)} credit
              </option>
            ))}
          </Select>
          {chosen && (
            <p className="mt-1 text-[10px] text-text-faint">
              Routes to seller{' '}
              <span className="font-mono">{chosen.sellerWallet?.slice(0, 6)}…{chosen.sellerWallet?.slice(-4)}</span>{' '}
              via <span className="font-mono">{chosen.provider}</span>.
            </p>
          )}
        </div>
      </div>

      <div>
        <Label>Prompt</Label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-border bg-bg-elevated/40 px-3 py-2 font-mono text-sm focus:outline-none focus:border-accent"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={run} disabled={busy || !chosen}>
          <Zap className="h-4 w-4" /> {busy ? 'Working…' : 'Send'}
        </Button>
        {status && (
          <span className="text-xs text-text-faint inline-flex items-center gap-1">
            <Send className="h-3 w-3" />{status}
          </span>
        )}
      </div>

      <div
        ref={outRef}
        className="rounded-md border border-border bg-bg-elevated/60 p-3 min-h-40 max-h-80 overflow-y-auto"
      >
        <pre className="font-mono text-xs whitespace-pre-wrap leading-relaxed">
          {output || (busy ? '' : 'Response will stream here…')}
        </pre>
      </div>
    </div>
  );
}
