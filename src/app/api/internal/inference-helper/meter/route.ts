import { meter } from '@/lib/meter';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const internal = req.headers.get('x-internal') || '';
  const expected = process.env.INTERNAL_SHARED_SECRET || process.env.MASTER_ENCRYPTION_KEY || 'dev';
  if (internal !== expected) return new Response('forbidden', { status: 403 });

  const body = (await req.json().catch(() => ({}))) as any;
  try {
    const r = await meter(body);
    return Response.json({ ok: true, ...r });
  } catch (e: any) {
    console.error('[meter] failed', e);
    return Response.json({ ok: false, error: e?.message || 'meter failed' }, { status: 500 });
  }
}
