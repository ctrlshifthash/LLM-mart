export const runtime = 'edge';

const ENC = new TextEncoder();
const OPENROUTER = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

export async function POST(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token.startsWith('inf_')) {
    return json({ error: { code: 'unauthorized', message: 'missing or invalid bearer token' } }, 401);
  }

  const keyInfo = await validateKey(token, req.url);
  if (!keyInfo) return json({ error: { code: 'unauthorized', message: 'invalid api key' } }, 401);

  let body: any;
  try { body = await req.json(); }
  catch { return json({ error: { code: 'bad_request', message: 'invalid json body' } }, 400); }
  if (!body?.model) return json({ error: { code: 'bad_request', message: 'model required' } }, 400);

  const isStream = !!body.stream;
  const estimatedIn = estimateInputTokens(body.messages);
  const estimatedOut = Math.min(body.max_tokens || 4096, 8192);

  const routes = await fetch(originURL(req.url, '/api/internal/inference-helper/route'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-internal': internalSecret() },
    body: JSON.stringify({
      op: 'resolve',
      buyerUserId: keyInfo.buyerUserId,
      modelId: body.model,
      estimatedTokensIn: estimatedIn,
      estimatedMaxOut: estimatedOut,
    }),
  }).then((r) => r.json());

  if (routes?.reason === 'insufficient_balance') {
    return json({
      error: { code: 'insufficient_balance', message: 'Add USDC to your account to continue.', balance: routes.balance },
    }, 402);
  }
  const attempts: RouteAttempt[] = routes?.attempts || [];
  if (attempts.length === 0) {
    return json({ error: { code: 'no_provider', message: 'No available provider for this model.' } }, 503);
  }

  const started = Date.now();
  let lastErr: any = null;
  for (const attempt of attempts) {
    try {
      const upstream = await callUpstream(attempt, body, req.signal);
      if (!upstream.ok) {
        lastErr = await upstream.text().catch(() => '');
        if (attempt.offerId) markUnhealthy(req.url, attempt.offerId);
        continue;
      }
      return await forward(upstream, {
        isStream,
        keyInfo,
        modelId: body.model,
        attempt,
        started,
        reqUrl: req.url,
      });
    } catch (e: any) {
      lastErr = e?.message || String(e);
      if (attempt.offerId) markUnhealthy(req.url, attempt.offerId);
    }
  }
  return json({ error: { code: 'all_failed', message: `All routes failed: ${lastErr || 'unknown'}` } }, 503);
}

type RouteAttempt = {
  source: 'priority' | 'marketplace' | 'fallback';
  provider: string;
  apiKey: string;
  offerId: string | null;
  priceInPerM: number;
  priceOutPerM: number;
};

async function callUpstream(a: RouteAttempt, body: any, signal: AbortSignal): Promise<Response> {
  const payload = { ...body };
  if (payload.stream) payload.stream_options = { ...(payload.stream_options || {}), include_usage: true };

  if (a.provider === 'openrouter') {
    return fetch(`${OPENROUTER}/chat/completions`, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${a.apiKey}`,
        'content-type': 'application/json',
        'http-referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'x-title': 'Surplus Intelligence',
      },
      body: JSON.stringify(payload),
      signal,
    });
  }
  if (a.provider === 'openai') {
    return fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'authorization': `Bearer ${a.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });
  }
  return new Response(`unsupported provider ${a.provider}`, { status: 501 });
}

async function forward(
  upstream: Response,
  ctx: {
    isStream: boolean;
    keyInfo: { apiKeyId: string; buyerUserId: string };
    modelId: string;
    attempt: RouteAttempt;
    started: number;
    reqUrl: string;
  },
): Promise<Response> {
  const { isStream, keyInfo, modelId, attempt, started, reqUrl } = ctx;

  if (!isStream) {
    const txt = await upstream.text();
    let parsed: any = null;
    try { parsed = JSON.parse(txt); } catch {}
    const usage = parsed?.usage;
    await meterAsync({
      apiKeyId: keyInfo.apiKeyId,
      buyerUserId: keyInfo.buyerUserId,
      modelId,
      tokensIn: usage?.prompt_tokens ?? 0,
      tokensOut: usage?.completion_tokens ?? 0,
      latencyMs: Date.now() - started,
      routeSource: attempt.source,
      offerId: attempt.offerId,
    }, reqUrl);
    return new Response(txt, { status: 200, headers: { 'content-type': 'application/json' } });
  }

  const reader = upstream.body!.getReader();
  let buffered = '';
  let promptTokens = 0;
  let completionTokens = 0;
  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = new TextDecoder().decode(value);
          buffered += chunk;
          const events = buffered.split('\n\n');
          buffered = events.pop() || '';
          for (const ev of events) {
            controller.enqueue(ENC.encode(ev + '\n\n'));
            const dataLine = ev.split('\n').find((l) => l.startsWith('data: '));
            if (!dataLine) continue;
            const dataStr = dataLine.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed?.usage) {
                promptTokens = parsed.usage.prompt_tokens ?? promptTokens;
                completionTokens = parsed.usage.completion_tokens ?? completionTokens;
              }
            } catch {}
          }
        }
        if (buffered.trim()) controller.enqueue(ENC.encode(buffered));
        controller.close();
        await meterAsync({
          apiKeyId: keyInfo.apiKeyId,
          buyerUserId: keyInfo.buyerUserId,
          modelId,
          tokensIn: promptTokens,
          tokensOut: completionTokens,
          latencyMs: Date.now() - started,
          routeSource: attempt.source,
          offerId: attempt.offerId,
        }, reqUrl);
      } catch (e) {
        controller.error(e);
      }
    },
    cancel() { reader.cancel(); },
  });
  return new Response(stream, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'connection': 'keep-alive',
    },
  });
}

function estimateInputTokens(messages: any[] = []): number {
  let chars = 0;
  for (const m of messages || []) {
    if (typeof m?.content === 'string') chars += m.content.length;
    else if (Array.isArray(m?.content)) {
      for (const c of m.content) if (typeof c?.text === 'string') chars += c.text.length;
    }
  }
  return Math.ceil(chars / 4);
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
}

function originURL(reqUrl: string, path: string) {
  return new URL(path, reqUrl).toString();
}
function internalSecret() {
  return process.env.INTERNAL_SHARED_SECRET || process.env.MASTER_ENCRYPTION_KEY || 'dev';
}

async function validateKey(fullKey: string, currentUrl: string): Promise<{ apiKeyId: string; buyerUserId: string } | null> {
  const res = await fetch(originURL(currentUrl, '/api/internal/inference-helper/validate-key'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-internal': internalSecret() },
    body: JSON.stringify({ key: fullKey }),
  });
  if (!res.ok) return null;
  return await res.json();
}

async function meterAsync(args: {
  apiKeyId: string;
  buyerUserId: string;
  modelId: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  routeSource: string;
  offerId?: string | null;
}, currentUrl: string) {
  try {
    await fetch(originURL(currentUrl, '/api/internal/inference-helper/meter'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal': internalSecret() },
      body: JSON.stringify(args),
    });
  } catch (e) {
    console.error('[meter] failed', e);
  }
}

async function markUnhealthy(currentUrl: string, offerId: string) {
  try {
    await fetch(originURL(currentUrl, '/api/internal/inference-helper/route'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal': internalSecret() },
      body: JSON.stringify({ op: 'mark_unhealthy', offerId }),
    });
  } catch (e) {
    console.warn('[unhealthy] notify failed', e);
  }
}
