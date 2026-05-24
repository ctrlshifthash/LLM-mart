import { db } from '@/lib/db';
import { routerConfig } from '@/lib/db/schema';
import { getAuthedUser } from '@/lib/privy';
import { ok, fromError } from '@/lib/api';
import { encrypt } from '@/lib/crypto';
import { eq, sql } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const u = await getAuthedUser(req);
    const rows = await db.select().from(routerConfig).where(eq(routerConfig.userId, u.dbUserId)).limit(1);
    const r = rows[0];
    return ok({
      priorityProvider: r?.priorityProvider || null,
      hasPriorityKey: !!r?.priorityKeyEncrypted,
      fallbackProvider: r?.fallbackProvider || null,
      hasFallbackKey: !!r?.fallbackKeyEncrypted,
    });
  } catch (e) {
    return fromError(e);
  }
}

export async function PUT(req: Request) {
  try {
    const u = await getAuthedUser(req);
    const b = (await req.json().catch(() => ({}))) as {
      priorityProvider?: string | null;
      priorityKey?: string | null;
      fallbackProvider?: string | null;
      fallbackKey?: string | null;
    };
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (b.priorityProvider !== undefined) patch.priorityProvider = b.priorityProvider || null;
    if (b.priorityKey !== undefined) patch.priorityKeyEncrypted = b.priorityKey ? await encrypt(b.priorityKey) : null;
    if (b.fallbackProvider !== undefined) patch.fallbackProvider = b.fallbackProvider || null;
    if (b.fallbackKey !== undefined) patch.fallbackKeyEncrypted = b.fallbackKey ? await encrypt(b.fallbackKey) : null;

    await db
      .insert(routerConfig)
      .values({
        userId: u.dbUserId,
        priorityProvider: (patch.priorityProvider as string) || null,
        priorityKeyEncrypted: (patch.priorityKeyEncrypted as string) || null,
        fallbackProvider: (patch.fallbackProvider as string) || null,
        fallbackKeyEncrypted: (patch.fallbackKeyEncrypted as string) || null,
      })
      .onConflictDoUpdate({
        target: routerConfig.userId,
        set: patch,
      });
    return ok({ ok: true });
  } catch (e) {
    return fromError(e);
  }
}
