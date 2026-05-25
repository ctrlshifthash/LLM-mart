'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAuthedSWR, useAuthedFetch } from '@/lib/authed-fetch';
import { PROVIDERS as PROVIDER_REGISTRY } from '@/lib/providers/registry';

const PROVIDERS = PROVIDER_REGISTRY.map((p) => ({ id: p.slug, label: p.name }));

type Config = {
  priorityProvider: string | null;
  hasPriorityKey: boolean;
  fallbackProvider: string | null;
  hasFallbackKey: boolean;
};

export function RouterConfigPanel() {
  const { data, mutate } = useAuthedSWR<Config>('/api/internal/router-config');
  const authedFetch = useAuthedFetch();

  async function put(body: any) {
    return authedFetch('/api/internal/router-config', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Card
        title="Priority Provider"
        body="The router will use this key first, then fall back to the marketplace if this key errors."
        provider={data?.priorityProvider}
        hasKey={!!data?.hasPriorityKey}
        save={async (provider, key) => {
          const res = await put({ priorityProvider: provider, priorityKey: key || undefined });
          if (res.ok) { toast.success('Saved'); mutate(); } else toast.error('Failed');
        }}
        clear={async () => {
          const res = await put({ priorityProvider: null, priorityKey: null });
          if (res.ok) { toast.success('Cleared'); mutate(); }
        }}
      />
      <Card
        title="Final Fallback"
        body="Used as a last resort if the marketplace has no healthy sellers for the model."
        provider={data?.fallbackProvider}
        hasKey={!!data?.hasFallbackKey}
        save={async (provider, key) => {
          const res = await put({ fallbackProvider: provider, fallbackKey: key || undefined });
          if (res.ok) { toast.success('Saved'); mutate(); } else toast.error('Failed');
        }}
        clear={async () => {
          const res = await put({ fallbackProvider: null, fallbackKey: null });
          if (res.ok) { toast.success('Cleared'); mutate(); }
        }}
      />
    </div>
  );
}

function Card({
  title,
  body,
  provider,
  hasKey,
  save,
  clear,
}: {
  title: string;
  body: string;
  provider: string | null | undefined;
  hasKey: boolean;
  save: (p: string, key: string) => Promise<void>;
  clear: () => Promise<void>;
}) {
  const [p, setP] = useState(provider || 'openrouter');
  const [k, setK] = useState('');
  useEffect(() => { if (provider) setP(provider); }, [provider]);
  return (
    <div className="rounded-lg border border-border bg-bg-elevated/40 p-5 space-y-3">
      <div>
        <h4 className="text-sm font-semibold">{title}</h4>
        <p className="mt-1 text-xs text-text-faint leading-relaxed">{body}</p>
      </div>
      <div>
        <Label>Provider</Label>
        <Select value={p} onChange={(e) => setP(e.target.value)} className="mt-1">
          {PROVIDERS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
        </Select>
      </div>
      <div>
        <Label>API Key</Label>
        <Input
          mono
          type="password"
          placeholder={hasKey ? '•••••••• (saved)' : 'sk-...'}
          value={k}
          onChange={(e) => setK(e.target.value)}
          className="mt-1"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => save(p, k)}>Save</Button>
        {hasKey && <Button size="sm" variant="ghost" onClick={clear}>Clear</Button>}
      </div>
    </div>
  );
}
