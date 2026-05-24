import { getBalance } from '@/lib/balance';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const internal = req.headers.get('x-internal') || '';
  const expected = process.env.INTERNAL_SHARED_SECRET || process.env.MASTER_ENCRYPTION_KEY || 'dev';
  if (internal !== expected) return new Response('forbidden', { status: 403 });

  const { userId } = (await req.json().catch(() => ({}))) as { userId?: string };
  if (!userId) return Response.json({ balance: 0 });
  const balance = await getBalance(userId);
  return Response.json({ balance });
}
