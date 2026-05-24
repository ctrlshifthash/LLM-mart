import { db } from '@/lib/db';
import { apiKeys } from '@/lib/db/schema';
import { sha256Hex } from '@/lib/crypto';
import { and, eq, isNull } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const internal = req.headers.get('x-internal') || '';
  const expected = process.env.INTERNAL_SHARED_SECRET || process.env.MASTER_ENCRYPTION_KEY || 'dev';
  if (internal !== expected) return new Response('forbidden', { status: 403 });

  const { key } = (await req.json().catch(() => ({}))) as { key?: string };
  if (!key) return new Response('bad', { status: 400 });
  const hashed = await sha256Hex(key);
  const rows = await db
    .select({ id: apiKeys.id, userId: apiKeys.userId })
    .from(apiKeys)
    .where(and(eq(apiKeys.hashedSecret, hashed), isNull(apiKeys.revokedAt)))
    .limit(1);
  if (rows.length === 0) return new Response('not found', { status: 404 });
  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, rows[0].id));
  return Response.json({ apiKeyId: rows[0].id, buyerUserId: rows[0].userId });
}
