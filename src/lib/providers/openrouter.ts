const BASE = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

export async function openrouterChat(opts: {
  apiKey: string;
  body: any;
  signal?: AbortSignal;
}): Promise<Response> {
  const { apiKey, body, signal } = opts;
  const payload = { ...body };
  if (payload.stream) {
    payload.stream_options = { ...(payload.stream_options || {}), include_usage: true };
  }
  return fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${apiKey}`,
      'content-type': 'application/json',
      'http-referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'x-title': 'Surplus Intelligence',
    },
    body: JSON.stringify(payload),
    signal,
  });
}
