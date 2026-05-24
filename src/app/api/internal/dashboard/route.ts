import { db } from '@/lib/db';
import { apiKeys, requests, offers, ledger } from '@/lib/db/schema';
import { getAuthedUser } from '@/lib/privy';
import { ok, fromError } from '@/lib/api';
import { getBalance } from '@/lib/balance';
import { and, eq, isNull, desc, sql } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const u = await getAuthedUser(req);
    const userId = u.dbUserId;

    const [balance, keyAgg, buyerAgg, sellerAgg, lifetimeEarned, offersList, recentRequests, recentLedger] = await Promise.all([
      getBalance(userId),

      db
        .select({ active: sql<number>`count(*) filter (where ${apiKeys.revokedAt} is null)::int`, total: sql<number>`count(*)::int` })
        .from(apiKeys)
        .where(eq(apiKeys.userId, userId)),

      db
        .select({
          requests: sql<number>`count(*)::int`,
          paid: sql<string>`coalesce(sum(${requests.buyerChargeUsdc}), 0)`,
          direct: sql<string>`coalesce(sum(${requests.directApiCostUsdc}), 0)`,
          tokensIn: sql<number>`coalesce(sum(${requests.tokensIn}), 0)::bigint`,
          tokensOut: sql<number>`coalesce(sum(${requests.tokensOut}), 0)::bigint`,
        })
        .from(requests)
        .where(eq(requests.buyerUserId, userId)),

      db
        .select({
          sold: sql<number>`count(*)::int`,
          earnings: sql<string>`coalesce(sum(${requests.sellerPayoutUsdc}), 0)`,
        })
        .from(requests)
        .innerJoin(offers, eq(offers.id, requests.offerId))
        .where(eq(offers.sellerUserId, userId)),

      db
        .select({ s: sql<string>`coalesce(sum(${ledger.amountUsdc}), 0)` })
        .from(ledger)
        .where(and(eq(ledger.userId, userId), eq(ledger.kind, 'credit'))),

      db
        .select({
          id: offers.id,
          modelId: offers.modelId,
          priceInPerMUsdc: offers.priceInPerMUsdc,
          priceOutPerMUsdc: offers.priceOutPerMUsdc,
          status: offers.status,
        })
        .from(offers)
        .where(eq(offers.sellerUserId, userId))
        .orderBy(desc(offers.createdAt))
        .limit(5),

      db
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
        .where(eq(requests.buyerUserId, userId))
        .orderBy(desc(requests.createdAt))
        .limit(10),

      db
        .select({
          id: ledger.id,
          kind: ledger.kind,
          amountUsdc: ledger.amountUsdc,
          note: ledger.note,
          txHash: ledger.txHash,
          createdAt: ledger.createdAt,
        })
        .from(ledger)
        .where(eq(ledger.userId, userId))
        .orderBy(desc(ledger.createdAt))
        .limit(10),
    ]);

    const paid = Number(buyerAgg[0]?.paid || 0);
    const direct = Number(buyerAgg[0]?.direct || 0);
    const saved = Math.max(0, direct - paid);

    return ok({
      account: {
        wallet: u.walletAddress,
        email: u.email,
        balance,
      },
      keys: {
        active: keyAgg[0]?.active || 0,
        total: keyAgg[0]?.total || 0,
      },
      buyer: {
        requests: buyerAgg[0]?.requests || 0,
        paid,
        direct,
        saved,
        avgSavings: direct > 0 ? saved / direct : 0,
        tokensIn: Number(buyerAgg[0]?.tokensIn || 0),
        tokensOut: Number(buyerAgg[0]?.tokensOut || 0),
      },
      seller: {
        sold: sellerAgg[0]?.sold || 0,
        earnings: Number(sellerAgg[0]?.earnings || 0),
        lifetimeEarned: Number(lifetimeEarned[0]?.s || 0),
        offers: offersList,
      },
      recentRequests,
      recentLedger,
    });
  } catch (e) {
    return fromError(e);
  }
}
