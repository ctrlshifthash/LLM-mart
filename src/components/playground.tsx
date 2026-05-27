'use client';
import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuthedSWR } from '@/lib/authed-fetch';
import { fetcher } from '@/lib/fetcher';
import { Zap, Send } from 'lucide-react';

const KEY_STORAGE = 'llmart-inf-key';

type CreditRow = { sellerUserId: string; sellerWallet: string | null; balance: number };
type Offer = { id: string; sellerUserId: string; sellerWallet: string | null; priceInPerM: number; priceOutPerM: number; provider: string };

export function Playground() {
  const { data: credits } = useAuthedSWR<{ credits: CreditRow[] }>('/api/internal/credits', { refreshInterval: 5000 });
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('openai/gpt-4o-mini');
  const [prompt, setPrompt] = useState('Reply with the single word "ok".');
  const [output, setOutput] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>('');
  const outRef = useRef<HTMLDivElement | null>(null);

  // Pull last-used key from sessionStorage on mount so the user doesn't paste twice.
  useEffect(() => {
    try { const s = sessionStorage.getItem(KEY_STORAGE); if (s) setApiKey(s); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { if (apiKey) sessionStorage.setItem(KEY_STORAGE, apiKey); } catch { /* ignore */ }
  }, [apiKey]);

  // Suggest a model based on whichever seller the buyer holds credit with: fetch their offers
  // for the model dropdown.
  const firstSellerCredit = credits?.credits.find((c) => c.balance > 0);
  const totalCredits = credits?.credits.reduce((acc, c) => acc + c.balance, 0) ?? 0;

  useEffect(() => {
    if (outRef.current) outRef.current.scrollTop = outRef.current.scrollHeight;
  }, [output]);

  async function run() {
    if (busy) return;
    if (!apiKey || !apiKey.startsWith('inf_')) {
      return toast.error('Paste an inf_ key from section 1 above.');
    }
    if (!prompt.trim()) return toast.error('Type something to send.');

    setBusy(true);
    setOutput('');
    setStatus('Sending…');

    try {
      const res = await fetch('/api/inference/v1/chat/completions', {
        method: 'POST',
        headers: { 'authorization': `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          stream: true,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({} as any));
        const msg = j?.error?.message || `request failed (${res.status})`;
        if (res.status === 402) setStatus('No credits with any seller for this model — buy more on /markets.');
        else setStatus('Failed.');
        toast.error(msg);
        return;
      }
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('text/event-stream')) {
        const txt = await res.text();
        try {
          const j = JSON.parse(txt);
          setOutput(j?.choices?.[0]?.message?.content || txt);
        } catch { setOutput(txt); }
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

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border/70 bg-bg-elevated/40 p-3 text-xs flex items-center gap-3">
        <Badge variant={totalCredits > 0 ? 'success' : 'warn'}>
          {totalCredits > 0 ? `$${totalCredits.toFixed(4)} credit` : 'No credit yet'}
        </Badge>
        <span className="text-text-faint">
          {totalCredits > 0
            ? 'Each request will debit one of your sellers at their listed per-million-token price.'
            : 'Buy credit with a seller on /markets first, then come back to test it here.'}
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
          <p className="mt-1 text-[10px] text-text-faint">Paste a secret from section 1 above. Stored only in this browser tab.</p>
        </div>
        <div>
          <Label>Model</Label>
          <Input
            mono
            placeholder="openai/gpt-4o-mini"
            value={model}
            onChange={(e) => setModel(e.target.value.trim())}
          />
          <p className="mt-1 text-[10px] text-text-faint">
            Use a model id offered by a seller you hold credit with. <a href="/markets" className="text-accent hover:underline">Browse /markets</a>.
          </p>
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
        <Button onClick={run} disabled={busy}>
          <Zap className="h-4 w-4" /> {busy ? 'Working…' : 'Send'}
        </Button>
        {status && <span className="text-xs text-text-faint inline-flex items-center gap-1"><Send className="h-3 w-3" />{status}</span>}
      </div>

      <div
        ref={outRef}
        className="rounded-md border border-border bg-bg-elevated/60 p-3 min-h-40 max-h-80 overflow-y-auto"
      >
        <pre className="font-mono text-xs whitespace-pre-wrap leading-relaxed">
          {output || (busy ? '' : 'Response will stream here…')}
        </pre>
      </div>

      {firstSellerCredit && (
        <p className="text-[10px] text-text-faint">
          Auto-routes to: <span className="font-mono">{firstSellerCredit.sellerWallet?.slice(0, 6)}…{firstSellerCredit.sellerWallet?.slice(-4)}</span> ·
          ${firstSellerCredit.balance.toFixed(4)} remaining
        </p>
      )}
    </div>
  );
}
