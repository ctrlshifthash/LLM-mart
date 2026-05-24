import 'dotenv/config';

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const KEY = process.env.E2E_API_KEY;

if (!KEY) {
  console.error('set E2E_API_KEY to an inf_ key from /buy then re-run');
  process.exit(1);
}

(async () => {
  const res = await fetch(`${BASE}/api/inference/v1/chat/completions`, {
    method: 'POST',
    headers: { 'authorization': `Bearer ${KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'openai/gpt-4.1-mini',
      messages: [{ role: 'user', content: 'Reply with the single word "ok".' }],
      stream: false,
    }),
  });
  console.log('status', res.status);
  const txt = await res.text();
  console.log(txt.slice(0, 500));
  if (!res.ok) process.exit(1);

  const json = JSON.parse(txt);
  const out = json?.choices?.[0]?.message?.content || '';
  console.log('output:', out);
  if (!out) {
    console.error('no content returned');
    process.exit(2);
  }
  console.log('OK');
})().catch((e) => { console.error(e); process.exit(1); });
