import { db } from '@/lib/db';
import { credits, offers, users } from '@/lib/db/schema';
import { getAuthedUser } from '@/lib/privy';
import { ok, fromError } from '@/lib/api';
import { and, eq, gt, sql } from 'drizzle-orm';

export const runtime = 'nodejs';

// Returns every (model, seller) pair the buyer can currently call.
// The Playground uses this to populate its model dropdown so users
// can only pick something that's actually going to work.
export async function GET(req: Request) {
  try {
    const u = await getAuthedUser(req);

    const rows = await db
      .select({
        modelId: offers.modelId,
        sellerUserId: offers.sellerUserId,
        sellerWallet: users.walletAddress,
        priceInPerM: offers.priceInPerMUsdc,
        priceOutPerM: offers.priceOutPerMUsdc,
        provider: offers.upstreamProvider,
        balance: credits.balanceUsdc,
      })
      .from(credits)
      .innerJoin(offers, eq(offers.sellerUserId, credits.sellerUserId))
      .innerJoin(users, eq(users.id, credits.sellerUserId))
      .where(
        and(
          eq(credits.buyerUserId, u.dbUserId),
          gt(credits.balanceUsdc, '0'),
          eq(offers.status, 'active'),
        ),
      )
      .orderBy(sql`${offers.priceInPerMUsdc} asc`);

    return ok({
      models: rows.map((r) => ({
        modelId: r.modelId,
        sellerUserId: r.sellerUserId,
        sellerWallet: r.sellerWallet,
        priceInPerM: Number(r.priceInPerM),
        priceOutPerM: Number(r.priceOutPerM),
        provider: r.provider,
        balance: Number(r.balance),
      })),
    });
  } catch (e) {
    return fromError(e);
  }
}
