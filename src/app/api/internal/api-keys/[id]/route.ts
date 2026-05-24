import { db } from '@/lib/db';
import { apiKeys } from '@/lib/db/schema';
import { getAuthedUser } from '@/lib/privy';
import { ok, err, fromError } from '@/lib/api';
import { and, eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await getAuthedUser(req);
    const { id } = await params;
    const updated = await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, u.dbUserId)))
      .returning({ id: apiKeys.id });
    if (updated.length === 0) return err(404, 'not_found', 'key not found');
    return ok({ ok: true });
  } catch (e) {
    return fromError(e);
  }
}
