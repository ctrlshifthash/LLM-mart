import { openrouterChat } from '@/lib/providers/openrouter';

export const runtime = 'edge';

const ENC = new TextEncoder();

export async function POST(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token.startsWith('inf_')) {
    return json({ error: { code: 'unauthorized', message: 'missing or invalid bearer token' } }, 401);
  }

  const keyInfo = await validateKey(token, req.url);
  if (!keyInfo) return json({ error: { code: 'unauthorized', message: 'invalid api key' } }, 401);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: { code: 'bad_request', message: 'invalid json body' } }, 400);
  }
  if (!body?.model) return json({ error: { code: 'bad_request', message: 'model required' } }, 400);

  const upstreamKey = process.env.OPENROUTER_API_KEY;
  if (!upstreamKey) return json({ error: { code: 'config', message: 'OPENROUTER_API_KEY not set' } }, 500);

  const isStream = !!body.stream;
  const started = Date.now();
  const upstream = await openrouterChat({ apiKey: upstreamKey, body, signal: req.signal });

  if (!upstream.ok) {
    const text = await upstream.text();
    return new Response(text, { status: upstream.status, headers: { 'content-type': upstream.headers.get('content-type') || 'application/json' } });
  }

  if (!isStream) {
    const txt = await upstream.text();
    let parsed: any = null;
    try { parsed = JSON.parse(txt); } catch {}
    const usage = parsed?.usage;
    await meterAsync({
      apiKeyId: keyInfo.apiKeyId,
      buyerUserId: keyInfo.buyerUserId,
      modelId: body.model,
      tokensIn: usage?.prompt_tokens ?? 0,
      tokensOut: usage?.completion_tokens ?? 0,
      latencyMs: Date.now() - started,
      routeSource: 'fallback',
    }, req.url);
    return new Response(txt, { status: 200, headers: { 'content-type': 'application/json' } });
  }

  // Streaming: tee the upstream, forward to client, accumulate usage from final chunk
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
          modelId: body.model,
          tokensIn: promptTokens,
          tokensOut: completionTokens,
          latencyMs: Date.now() - started,
          routeSource: 'fallback',
        }, req.url);
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

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
}

async function validateKey(fullKey: string, currentUrl: string): Promise<{ apiKeyId: string; buyerUserId: string } | null> {
  const origin = new URL(currentUrl).origin;
  const internal = process.env.INTERNAL_SHARED_SECRET || process.env.MASTER_ENCRYPTION_KEY || 'dev';
  const res = await fetch(`${origin}/api/internal/inference-helper/validate-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-internal': internal },
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
  offerId?: string;
}, currentUrl: string) {
  try {
    const origin = new URL(currentUrl).origin;
    const internal = process.env.INTERNAL_SHARED_SECRET || process.env.MASTER_ENCRYPTION_KEY || 'dev';
    await fetch(`${origin}/api/internal/inference-helper/meter`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal': internal },
      body: JSON.stringify(args),
    });
  } catch (e) {
    console.error('[meter] failed', e);
  }
}
