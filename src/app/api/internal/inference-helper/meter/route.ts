import { db } from '@/lib/db';
import { requests } from '@/lib/db/schema';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const internal = req.headers.get('x-internal') || '';
  const expected = process.env.INTERNAL_SHARED_SECRET || process.env.MASTER_ENCRYPTION_KEY || 'dev';
  if (internal !== expected) return new Response('forbidden', { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    apiKeyId: string;
    buyerUserId: string;
    modelId: string;
    tokensIn: number;
    tokensOut: number;
    latencyMs: number;
    routeSource: string;
    offerId?: string;
  };

  await db.insert(requests).values({
    buyerUserId: body.buyerUserId,
    apiKeyId: body.apiKeyId,
    offerId: body.offerId || null,
    modelId: body.modelId,
    tokensIn: body.tokensIn || 0,
    tokensOut: body.tokensOut || 0,
    latencyMs: body.latencyMs || 0,
    routeSource: body.routeSource || 'fallback',
    status: 'ok',
  });
  return Response.json({ ok: true });
}
