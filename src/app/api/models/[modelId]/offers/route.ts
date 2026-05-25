import { db } from '@/lib/db';
import { offers, users, requests, creditPurchases } from '@/lib/db/schema';
import { and, eq, asc, gte, sql } from 'drizzle-orm';
import { getPricingForModel } from '@/lib/pricing';

export const runtime = 'nodejs';

export async function GET(_req: Request, ctx: { params: Promise<{ modelId: string }> }) {
  const { modelId } = await ctx.params;
  const id = decodeURIComponent(modelId);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [rows, soldByOffer, soldBySeller, direct] = await Promise.all([
    db
      .select({
        id: offers.id,
        sellerUserId: offers.sellerUserId,
        sellerWallet: users.walletAddress,
        sellerEmail: users.email,
        priceIn: offers.priceInPerMUsdc,
        priceOut: offers.priceOutPerMUsdc,
        capacity: offers.maxDailyCapacityUsdc,
        provider: offers.upstreamProvider,
        status: offers.status,
        createdAt: offers.createdAt,
      })
      .from(offers)
      .innerJoin(users, eq(users.id, offers.sellerUserId))
      .where(and(eq(offers.modelId, id), eq(offers.status, 'active')))
      .orderBy(asc(offers.priceInPerMUsdc)),
    db
      .select({
        offerId: requests.offerId,
        sold24h: sql<string>`coalesce(sum(${requests.buyerChargeUsdc}), 0)`,
      })
      .from(requests)
      .where(and(eq(requests.modelId, id), gte(requests.createdAt, since)))
      .groupBy(requests.offerId),
    db
      .select({
        sellerUserId: creditPurchases.sellerUserId,
        creditsSold: sql<string>`coalesce(sum(${creditPurchases.amountUsdc}), 0)`,
      })
      .from(creditPurchases)
      .groupBy(creditPurchases.sellerUserId),
    getPricingForModel(id),
  ]);

  const directInPerM = (direct?.promptUsdPerToken || 0) * 1_000_000;
  const directOutPerM = (direct?.completionUsdPerToken || 0) * 1_000_000;
  const directTotal = directInPerM + directOutPerM;

  const sold24hByOffer = new Map(soldByOffer.map((s) => [s.offerId, Number(s.sold24h)]));
  const creditsBySeller = new Map(soldBySeller.map((s) => [s.sellerUserId, Number(s.creditsSold)]));

  let cumulative = 0;
  const out = rows.map((r, i) => {
    const priceInPerM = Number(r.priceIn);
    const priceOutPerM = Number(r.priceOut);
    const offerTotal = priceInPerM + priceOutPerM;
    const discount = directTotal > 0 ? Math.max(-2, Math.min(1, 1 - offerTotal / directTotal)) : 0;
    const capacityUsdc = Number(r.capacity);
    cumulative += capacityUsdc;
    return {
      id: r.id,
      rank: i + 1,
      sellerUserId: r.sellerUserId,
      sellerWallet: r.sellerWallet,
      sellerLabel: shortSellerLabel(r.sellerWallet, r.sellerEmail),
      provider: r.provider,
      priceInPerM,
      priceOutPerM,
      maxDailyCapacityUsdc: capacityUsdc,
      cumulativeCapacityUsdc: cumulative,
      sold24hUsdc: sold24hByOffer.get(r.id) || 0,
      creditsSoldUsdc: creditsBySeller.get(r.sellerUserId) || 0,
      discount,
      status: r.status,
    };
  });

  return Response.json({
    offers: out,
    direct: { promptPerM: directInPerM, completionPerM: directOutPerM, total: directTotal },
    totals: {
      sellers: rows.length,
      totalCapacityUsdc: cumulative,
      sold24hUsdc: out.reduce((acc, o) => acc + o.sold24hUsdc, 0),
    },
  });
}

function shortSellerLabel(wallet?: string | null, email?: string | null): string {
  if (wallet) return `${wallet.slice(0, 5)}…${wallet.slice(-4)}`;
  if (email) return email;
  return 'unknown';
}
