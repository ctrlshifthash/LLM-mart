import { db } from '@/lib/db';
import { ledger } from '@/lib/db/schema';
import { getAuthedUser } from '@/lib/privy';
import { ok, fromError } from '@/lib/api';
import { getBalance } from '@/lib/balance';
import { and, eq, gt, sql } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const u = await getAuthedUser(req);
    const balance = await getBalance(u.dbUserId);
    const [row] = await db
      .select({
        lifetime: sql<string>`coalesce(sum(${ledger.amountUsdc}), 0)`,
      })
      .from(ledger)
      .where(and(eq(ledger.userId, u.dbUserId), eq(ledger.kind, 'credit')));
    return ok({ balance, lifetimeEarned: Number(row?.lifetime || 0) });
  } catch (e) {
    return fromError(e);
  }
}
