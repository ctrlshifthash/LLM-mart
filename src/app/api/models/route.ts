import { db } from '@/lib/db';
import { offers, requests, creditPurchases } from '@/lib/db/schema';
import { getModels } from '@/lib/pricing';
import { eq, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const revalidate = 60;

export async function GET() {
  const models = await getModels();

  const bestByModel: Record<string, { priceIn: number; priceOut: number; sellers: number; capacityUsdc: number; latestOfferAt: string | null }> = {};
  const activityByModel: Record<string, { messages: number; spentUsdc: number; tokens: number }> = {};
  const volumeByModel: Record<string, number> = {};

  try {
    const [offerRows, reqRows, volRows] = await Promise.all([
      db
        .select({
          modelId: offers.modelId,
          priceIn: sql<string>`min(${offers.priceInPerMUsdc})`,
          priceOut: sql<string>`min(${offers.priceOutPerMUsdc})`,
          sellers: sql<number>`count(*)::int`,
          capacityUsdc: sql<string>`coalesce(sum(${offers.maxDailyCapacityUsdc}), 0)`,
          latestOfferAt: sql<string | null>`max(${offers.createdAt})`,
        })
        .from(offers)
        .where(eq(offers.status, 'active'))
        .groupBy(offers.modelId),
      db
        .select({
          modelId: requests.modelId,
          messages: sql<number>`count(*)::int`,
          spent: sql<string>`coalesce(sum(${requests.buyerChargeUsdc}), 0)`,
          tokens: sql<number>`coalesce(sum(${requests.tokensIn} + ${requests.tokensOut}), 0)::bigint`,
        })
        .from(requests)
        .groupBy(requests.modelId),
      // Total USDC volume of credits buyers have bought from sellers offering this model.
      // Sums credit_purchases.amount for every (buyer, seller) where the seller has at
      // least one active offer for the model — proxies "how much credit has been sold for this model".
      db
        .select({
          modelId: offers.modelId,
          volume: sql<string>`coalesce(sum(${creditPurchases.amountUsdc}), 0)`,
        })
        .from(offers)
        .innerJoin(creditPurchases, eq(creditPurchases.sellerUserId, offers.sellerUserId))
        .where(eq(offers.status, 'active'))
        .groupBy(offers.modelId),
    ]);

    for (const r of offerRows) {
      bestByModel[r.modelId] = {
        priceIn: Number(r.priceIn),
        priceOut: Number(r.priceOut),
        sellers: r.sellers,
        capacityUsdc: Number(r.capacityUsdc),
        latestOfferAt: r.latestOfferAt,
      };
    }
    for (const r of reqRows) {
      activityByModel[r.modelId] = {
        messages: r.messages,
        spentUsdc: Number(r.spent),
        tokens: Number(r.tokens),
      };
    }
    for (const r of volRows) {
      volumeByModel[r.modelId] = Number(r.volume);
    }
  } catch (e) {
    console.warn('[api/models] db lookup failed:', e instanceof Error ? e.message : e);
  }

  const out = models.map((m) => {
    const directInPerM = m.promptUsdPerToken * 1_000_000;
    const directOutPerM = m.completionUsdPerToken * 1_000_000;
    const best = bestByModel[m.id];
    const bestInPerM = best?.priceIn ?? directInPerM;
    const bestOutPerM = best?.priceOut ?? directOutPerM;
    const direct = directInPerM + directOutPerM;
    const ours = bestInPerM + bestOutPerM;
    const savings = direct > 0 ? Math.max(0, Math.min(0.999, 1 - ours / direct)) : 0;
    const activity = activityByModel[m.id] || { messages: 0, spentUsdc: 0, tokens: 0 };

    return {
      id: m.id,
      name: m.name,
      description: m.description,
      modality: m.modality,
      contextLength: m.contextLength,
      capabilities: deriveCapabilities(m),
      direct: { promptPerM: directInPerM, completionPerM: directOutPerM },
      best: {
        promptPerM: bestInPerM,
        completionPerM: bestOutPerM,
        sellers: best?.sellers ?? 0,
        capacityUsdc: best?.capacityUsdc ?? 0,
      },
      savings,
      activity: {
        messages: activity.messages,
        spentUsdc: activity.spentUsdc,
        tokens: activity.tokens,
        volumeUsdc: volumeByModel[m.id] ?? 0,
      },
      listedAt: best?.latestOfferAt ?? null,
    };
  });

  // Sort: models with sellers first, ordered by most recently listed offer.
  // Models with no marketplace seller drop to the bottom (alphabetical fallback).
  out.sort((a, b) => {
    const aHas = (a.best.sellers ?? 0) > 0 ? 1 : 0;
    const bHas = (b.best.sellers ?? 0) > 0 ? 1 : 0;
    if (aHas !== bHas) return bHas - aHas;
    const aT = a.listedAt ? Date.parse(a.listedAt) : 0;
    const bT = b.listedAt ? Date.parse(b.listedAt) : 0;
    if (aT !== bT) return bT - aT;
    return a.id.localeCompare(b.id);
  });

  return Response.json({ models: out });
}

function deriveCapabilities(m: { id: string; description: string; modality: string }): string[] {
  const text = `${m.id} ${m.description}`.toLowerCase();
  const modality = (m.modality || '').toLowerCase();
  const tags: string[] = [];
  if (modality.includes('image') || /vision|gpt-4o|claude.*-(3|4|opus|sonnet|haiku)/.test(text)) tags.push('VISION');
  if (/o1|o3|o4|r1|reason|think/.test(text)) tags.push('REASONING');
  if (/audio/.test(modality)) tags.push('AUDIO');
  if (/gpt-|claude|llama|mistral|gemini|qwen|grok|deepseek/.test(text)) {
    tags.push('TOOLS');
    tags.push('JSON');
    tags.push('STREAMING');
  }
  return tags.slice(0, 5);
}
