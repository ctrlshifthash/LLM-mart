import { db } from '@/lib/db';
import { apiKeys } from '@/lib/db/schema';
import { getAuthedUser } from '@/lib/privy';
import { ok, err, fromError } from '@/lib/api';
import { sha256Hex } from '@/lib/crypto';
import { eq, desc, and, isNull } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const u = await getAuthedUser(req);
    const rows = await db
      .select({
        id: apiKeys.id,
        prefix: apiKeys.prefix,
        name: apiKeys.name,
        lastUsedAt: apiKeys.lastUsedAt,
        revokedAt: apiKeys.revokedAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, u.dbUserId), isNull(apiKeys.revokedAt)))
      .orderBy(desc(apiKeys.createdAt));
    return ok({ keys: rows });
  } catch (e) {
    return fromError(e);
  }
}

export async function POST(req: Request) {
  try {
    const u = await getAuthedUser(req);
    const body = (await req.json().catch(() => ({}))) as { name?: string };
    const name = (body.name || 'Untitled').slice(0, 64);
    const secret = randomSecret(40);
    const full = `inf_${secret}`;
    const hashed = await sha256Hex(full);
    const [row] = await db
      .insert(apiKeys)
      .values({ userId: u.dbUserId, name, hashedSecret: hashed })
      .returning({ id: apiKeys.id, prefix: apiKeys.prefix, name: apiKeys.name, createdAt: apiKeys.createdAt });
    return ok({ key: { ...row, secret: full } });
  } catch (e) {
    return fromError(e);
  }
}

function randomSecret(n: number): string {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64url').slice(0, n);
}
