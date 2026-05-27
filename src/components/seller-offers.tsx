'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { useAuthedSWR, useAuthedFetch } from '@/lib/authed-fetch';
import { Plus, Trash2, Pause, Play, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { fetcher } from '@/lib/fetcher';
import { ModelPicker, type ModelOption } from '@/components/model-picker';
import { PROVIDERS, getProviderName } from '@/lib/providers/registry';

type Offer = {
  id: string;
  modelId: string;
  modality: string;
  priceInPerMUsdc: string;
  priceOutPerMUsdc: string;
  upstreamProvider: string;
  maxDailyCapacityUsdc: string;
  status: string;
  createdAt: string;
};

type ApiModel = {
  id: string;
  name: string;
  best: { promptPerM: number; completionPerM: number };
  direct: { promptPerM: number; completionPerM: number };
};

export function SellerOffersPanel() {
  const { data, mutate, isLoading } = useAuthedSWR<{ offers: Offer[] }>('/api/internal/offers');
  const { data: modelsData } = useSWR<{ models: ApiModel[] }>('/api/models', fetcher);
  const modelOptions: ModelOption[] = (modelsData?.models || []).map((m) => ({
    id: m.id,
    name: m.name,
    promptPerM: m.direct?.promptPerM,
    completionPerM: m.direct?.completionPerM,
  }));

  return (
    <div className="space-y-4">
      <CreateForm models={modelOptions} onCreated={() => mutate()} />

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated/60 text-text-faint text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left font-medium px-4 py-3">Model</th>
              <th className="text-left font-medium px-4 py-3">Provider</th>
              <th className="text-left font-medium px-4 py-3">Price In / Out</th>
              <th className="text-left font-medium px-4 py-3">Daily Cap</th>
              <th className="text-left font-medium px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-6 text-text-faint">Loading…</td></tr>
            ) : !data?.offers?.length ? (
              <tr><td colSpan={6} className="px-4 py-6 text-text-faint">No offers yet.</td></tr>
            ) : (
              data.offers.map((o) => (
                <OfferRow key={o.id} o={o} onChanged={() => mutate()} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CreateForm({ models, onCreated }: { models: ModelOption[]; onCreated: () => void }) {
  const authedFetch = useAuthedFetch();
  const [modelId, setModelId] = useState('');
  const [priceIn, setPriceIn] = useState('0.10');
  const [priceOut, setPriceOut] = useState('0.30');
  const [cap, setCap] = useState('50');
  const [upstreamKey, setUpstreamKey] = useState('');
  const [upstreamProvider, setUpstreamProvider] = useState<string>('openrouter');
  const [busy, setBusy] = useState(false);

  const selected = models.find((m) => m.id === modelId);
  const directIn = selected?.promptPerM;
  const directOut = selected?.completionPerM;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!modelId) return toast.error('Select a model');
    if (!upstreamKey) return toast.error('Upstream API key required');
    setBusy(true);
    try {
      const res = await authedFetch('/api/internal/offers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          modelId,
          modality: 'text',
          priceInPerMUsdc: priceIn,
          priceOutPerMUsdc: priceOut,
          maxDailyCapacityUsdc: cap,
          upstreamProvider,
          upstreamKey,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'failed');
      toast.success('Offer created');
      setModelId('');
      setUpstreamKey('');
      onCreated();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-border bg-bg-elevated/40 p-5 grid sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <Label>Model</Label>
        <div className="mt-1">
          <ModelPicker models={models} value={modelId} onChange={setModelId} placeholder="Pick a model…" />
        </div>
        {selected && (directIn !== undefined || directOut !== undefined) && (
          <p className="mt-2 text-[11px] text-text-faint">
            Direct OpenRouter price: <span className="font-mono text-text-dim">${fmt(directIn || 0)}</span> in /{' '}
            <span className="font-mono text-text-dim">${fmt(directOut || 0)}</span> out per M. Undercut these to win traffic.
          </p>
        )}
      </div>
      <div>
        <Label>Modality</Label>
        <Select className="mt-1" defaultValue="text" disabled>
          <option value="text">Text</option>
        </Select>
      </div>
      <div>
        <Label>Upstream Provider</Label>
        <Select
          className="mt-1"
          value={upstreamProvider}
          onChange={(e) => setUpstreamProvider(e.target.value)}
        >
          {PROVIDERS.map((p) => (
            <option key={p.slug} value={p.slug}>{p.name}</option>
          ))}
        </Select>
        <p className="mt-1 text-[10px] text-text-faint">
          Where your leftover credit lives. The buyer's calls hit this provider with your key.
        </p>
      </div>
      <div>
        <Label>Price In (USDC / M)</Label>
        <Input mono className="mt-1" type="number" min={0} step="0.01" value={priceIn} onChange={(e) => setPriceIn(e.target.value)} />
      </div>
      <div>
        <Label>Price Out (USDC / M)</Label>
        <Input mono className="mt-1" type="number" min={0} step="0.01" value={priceOut} onChange={(e) => setPriceOut(e.target.value)} />
      </div>
      <div>
        <Label>Max Daily Capacity (USDC)</Label>
        <Input mono className="mt-1" type="number" min={0} step="1" value={cap} onChange={(e) => setCap(e.target.value)} />
      </div>
      <div>
        <Label>Upstream API Key</Label>
        <Input
          mono
          className="mt-1"
          type="password"
          placeholder="sk-or-v1-…"
          value={upstreamKey}
          onChange={(e) => setUpstreamKey(e.target.value)}
        />
      </div>
      <div className="sm:col-span-2 flex justify-end">
        <Button disabled={busy}>
          <Plus className="h-4 w-4" /> {busy ? 'Creating…' : 'Create Offer'}
        </Button>
      </div>
    </form>
  );
}

function OfferRow({ o, onChanged }: { o: Offer; onChanged: () => void }) {
  const authedFetch = useAuthedFetch();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | { ok: boolean; message?: string; sample?: string[] }>(null);

  async function patch(body: any) {
    const res = await authedFetch(`/api/internal/offers/${o.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) { toast.success('Updated'); onChanged(); } else toast.error('Failed');
  }
  async function remove() {
    if (!confirm('Delete this offer?')) return;
    const res = await authedFetch(`/api/internal/offers/${o.id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Deleted'); onChanged(); } else toast.error('Failed');
  }
  async function testKey() {
    if (testing) return;
    setTesting(true);
    try {
      const res = await authedFetch(`/api/internal/offers/${o.id}/test`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        const msg = json?.message || json?.error?.message || `HTTP ${res.status}`;
        setTestResult({ ok: false, message: msg });
        toast.error(`Upstream rejected key: ${msg}`);
      } else {
        setTestResult({ ok: true, sample: json.sample });
        toast.success(`Key works — ${json.modelsCount} models reachable`);
      }
    } catch (e: any) {
      setTestResult({ ok: false, message: e?.message || 'test failed' });
      toast.error(e?.message || 'test failed');
    } finally {
      setTesting(false);
    }
  }
  return (
    <tr className="hover:bg-bg-card-hover/40">
      <td className="px-4 py-3 font-mono text-xs">{o.modelId}</td>
      <td className="px-4 py-3 text-xs">
        <Badge variant="outline" className="font-mono">{getProviderName(o.upstreamProvider)}</Badge>
      </td>
      <td className="px-4 py-3 font-mono text-xs">
        <div>${Number(o.priceInPerMUsdc).toFixed(2)} <span className="text-text-faint">/ M in</span></div>
        <div className="text-text-dim">${Number(o.priceOutPerMUsdc).toFixed(2)} <span className="text-text-faint">/ M out</span></div>
      </td>
      <td className="px-4 py-3 font-mono text-xs">${Number(o.maxDailyCapacityUsdc).toFixed(0)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {o.status === 'active' ? <Badge variant="success">Active</Badge> : <Badge variant="warn">Paused</Badge>}
          {testResult && (
            testResult.ok
              ? <span title="Key verified" className="inline-flex items-center text-success"><CheckCircle2 className="h-3.5 w-3.5" /></span>
              : <span title={testResult.message || 'Key failed'} className="inline-flex items-center text-danger"><AlertCircle className="h-3.5 w-3.5" /></span>
          )}
        </div>
        {testResult && !testResult.ok && (
          <div className="mt-1 text-[10px] text-danger max-w-[200px] truncate" title={testResult.message}>{testResult.message}</div>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex items-center gap-2">
          <button onClick={testKey} disabled={testing} className="text-text-faint hover:text-accent disabled:opacity-50" title="Test upstream key">
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          </button>
          {o.status === 'active' ? (
            <button onClick={() => patch({ status: 'paused' })} className="text-text-faint hover:text-warn" title="Pause">
              <Pause className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button onClick={() => patch({ status: 'active' })} className="text-text-faint hover:text-success" title="Resume">
              <Play className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={remove} className="text-text-faint hover:text-danger" title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function fmt(n: number) {
  if (n === 0) return '0';
  if (n < 0.01) return n.toFixed(4);
  if (n < 1) return n.toFixed(3);
  return n.toFixed(2);
}
