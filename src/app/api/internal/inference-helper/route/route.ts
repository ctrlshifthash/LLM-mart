import { resolveRoutes, markUnhealthy } from '@/lib/router';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const internal = req.headers.get('x-internal') || '';
  const expected = process.env.INTERNAL_SHARED_SECRET || process.env.MASTER_ENCRYPTION_KEY || 'dev';
  if (internal !== expected) return new Response('forbidden', { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    op?: 'resolve' | 'mark_unhealthy';
    buyerUserId?: string;
    modelId?: string;
    estimatedTokensIn?: number;
    estimatedMaxOut?: number;
    offerId?: string;
  };

  if (body.op === 'mark_unhealthy' && body.offerId) {
    markUnhealthy(body.offerId);
    return Response.json({ ok: true });
  }

  if (!body.buyerUserId || !body.modelId) return Response.json({ error: 'bad_request' }, { status: 400 });
  const r = await resolveRoutes({
    buyerUserId: body.buyerUserId,
    modelId: body.modelId,
    estimatedTokensIn: body.estimatedTokensIn || 1000,
    estimatedMaxOut: body.estimatedMaxOut || 4096,
  });
  return Response.json(r);
}
