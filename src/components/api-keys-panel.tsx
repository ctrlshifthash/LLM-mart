'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Plus, Trash2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAuthedSWR, useAuthedFetch } from '@/lib/authed-fetch';

type ApiKey = {
  id: string;
  prefix: string;
  name: string | null;
  lastUsedAt: string | null;
  createdAt: string;
};

export function ApiKeysPanel() {
  const { data, mutate, isLoading, error } = useAuthedSWR<{ keys: ApiKey[] }>('/api/internal/api-keys');
  const authedFetch = useAuthedFetch();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [created, setCreated] = useState<{ secret: string; name: string } | null>(null);
  const [creating, setCreating] = useState(false);

  async function create() {
    if (creating) return;
    setCreating(true);
    try {
      const res = await authedFetch('/api/internal/api-keys', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name || 'Untitled' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'failed');
      setCreated({ secret: json.key.secret, name: json.key.name });
      setName('');
      mutate();
      toast.success('API key created');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm('Revoke this key? Requests using it will start failing.')) return;
    const res = await authedFetch(`/api/internal/api-keys/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Key revoked');
      mutate();
    } else toast.error('Failed to revoke');
  }

  function copy(s: string) {
    navigator.clipboard.writeText(s);
    toast.success('Copied to clipboard');
  }

  return (
    <div className="space-y-4">
      {error && <div className="text-sm text-danger">{error.message}</div>}
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated/60 text-text-faint text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left font-medium px-4 py-3">Name</th>
              <th className="text-left font-medium px-4 py-3">Key</th>
              <th className="text-left font-medium px-4 py-3">Last Used</th>
              <th className="text-left font-medium px-4 py-3">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-6 text-text-faint">Loading…</td></tr>
            ) : !data?.keys?.length ? (
              <tr><td colSpan={5} className="px-4 py-6 text-text-faint">No keys yet. Create one to start making requests.</td></tr>
            ) : (
              data.keys.map((k) => (
                <tr key={k.id} className="hover:bg-bg-card-hover/40">
                  <td className="px-4 py-3 font-medium">{k.name || 'Untitled'}</td>
                  <td className="px-4 py-3 font-mono text-text-dim">{k.prefix}••••••••</td>
                  <td className="px-4 py-3 text-text-faint">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3 text-text-faint">{new Date(k.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => revoke(k.id)}
                      className="inline-flex items-center gap-1 text-xs text-text-faint hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Revoke
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Button onClick={() => setOpen(true)} variant="secondary">
        <Plus className="h-4 w-4" /> Create New Key
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setCreated(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-accent" /> Create API Key</DialogTitle>
            <DialogDescription>Give it a name so you remember what it&apos;s for.</DialogDescription>
          </DialogHeader>
          {!created ? (
            <div className="space-y-3">
              <Input placeholder="e.g. claude-code-local" value={name} onChange={(e) => setName(e.target.value)} />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={create} disabled={creating}>{creating ? 'Creating…' : 'Create'}</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Badge variant="warn">Copy now — this is the only time you&apos;ll see it.</Badge>
              <div className="rounded-md border border-border bg-bg-elevated/60 p-3 font-mono text-xs break-all">
                {created.secret}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => copy(created.secret)}><Copy className="h-4 w-4" /> Copy</Button>
                <Button onClick={() => { setOpen(false); setCreated(null); }}>Done</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
