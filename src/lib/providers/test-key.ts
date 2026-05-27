import { getProvider } from './registry';

export type KeyTestResult =
  | { ok: true; modelsCount: number; sample: string[] }
  | { ok: false; status: number; message: string };

/** Hits the provider's GET /models endpoint with the candidate API key.
 *  Returns ok=true with a few example model ids if the key is accepted,
 *  ok=false with the upstream's message + status otherwise.
 *  Times out at 8s so a stuck endpoint doesn't hang offer creation. */
export async function testProviderKey(slug: string, apiKey: string): Promise<KeyTestResult> {
  const p = getProvider(slug);
  if (!p) return { ok: false, status: 0, message: `unknown provider "${slug}"` };
  if (!apiKey || apiKey.length < 4) return { ok: false, status: 0, message: 'key is empty' };
  const trimmed = apiKey.trim();
  if (trimmed !== apiKey) {
    return { ok: false, status: 0, message: 'key has leading/trailing whitespace — paste it again cleanly' };
  }
  if (/[\r\n\t]/.test(apiKey)) {
    return { ok: false, status: 0, message: 'key contains a newline or tab character — re-paste it without breaks' };
  }

  const url = `${p.baseUrl}/models`;
  const controller = new AbortController();
  const tm = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(url, {
      headers: { authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    if (!res.ok) {
      let body = '';
      try { body = await res.text(); } catch { /* ignore */ }
      let parsed = '';
      try { parsed = JSON.parse(body)?.error?.message || ''; } catch { /* ignore */ }
      return { ok: false, status: res.status, message: parsed || body.slice(0, 240) || `HTTP ${res.status}` };
    }
    let json: any = null;
    try { json = await res.json(); } catch { /* ignore */ }
    const list: any[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
    const sample = list.slice(0, 3).map((m) => m?.id || m?.name || String(m));
    return { ok: true, modelsCount: list.length, sample };
  } catch (e: any) {
    return { ok: false, status: 0, message: e?.name === 'AbortError' ? 'upstream timeout (>8s)' : (e?.message || 'fetch failed') };
  } finally {
    clearTimeout(tm);
  }
}
