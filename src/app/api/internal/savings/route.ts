import { db } from '@/lib/db';
import { requests } from '@/lib/db/schema';
import { getAuthedUser } from '@/lib/privy';
import { ok, fromError } from '@/lib/api';
import { eq, sql, desc } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const u = await getAuthedUser(req);
    const [agg] = await db
      .select({
        paid: sql<string>`coalesce(sum(${requests.buyerChargeUsdc}), 0)`,
        direct: sql<string>`coalesce(sum(${requests.directApiCostUsdc}), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(requests)
      .where(eq(requests.buyerUserId, u.dbUserId));

    const rows = await db
      .select({
        id: requests.id,
        modelId: requests.modelId,
        tokensIn: requests.tokensIn,
        tokensOut: requests.tokensOut,
        buyerCharge: requests.buyerChargeUsdc,
        directCost: requests.directApiCostUsdc,
        routeSource: requests.routeSource,
        createdAt: requests.createdAt,
      })
      .from(requests)
      .where(eq(requests.buyerUserId, u.dbUserId))
      .orderBy(desc(requests.createdAt))
      .limit(50);

    const paid = Number(agg?.paid || 0);
    const direct = Number(agg?.direct || 0);
    const saved = Math.max(0, direct - paid);
    const avgSavings = direct > 0 ? saved / direct : 0;

    return ok({ totals: { paid, direct, saved, avgSavings, count: agg?.count || 0 }, requests: rows });
  } catch (e) {
    return fromError(e);
  }
}
