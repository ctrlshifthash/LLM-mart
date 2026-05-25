import { db } from '@/lib/db';
import { offers, requests } from '@/lib/db/schema';
import { getModels } from '@/lib/pricing';
import { eq, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const revalidate = 60;

export async function GET() {
  const models = await getModels();

  const bestByModel: Record<string, { priceIn: number; priceOut: number; sellers: number; capacityUsdc: number }> = {};
  const activityByModel: Record<string, { messages: number; creditsSold: number; tokens: number }> = {};

  try {
    const [offerRows, reqRows] = await Promise.all([
      db
        .select({
          modelId: offers.modelId,
          priceIn: sql<string>`min(${offers.priceInPerMUsdc})`,
          priceOut: sql<string>`min(${offers.priceOutPerMUsdc})`,
          sellers: sql<number>`count(*)::int`,
          capacityUsdc: sql<string>`coalesce(sum(${offers.maxDailyCapacityUsdc}), 0)`,
        })
        .from(offers)
        .where(eq(offers.status, 'active'))
        .groupBy(offers.modelId),
      db
        .select({
          modelId: requests.modelId,
          messages: sql<number>`count(*)::int`,
          creditsSold: sql<string>`coalesce(sum(${requests.buyerChargeUsdc}), 0)`,
          tokens: sql<number>`coalesce(sum(${requests.tokensIn} + ${requests.tokensOut}), 0)::bigint`,
        })
        .from(requests)
        .groupBy(requests.modelId),
    ]);

    for (const r of offerRows) {
      bestByModel[r.modelId] = {
        priceIn: Number(r.priceIn),
        priceOut: Number(r.priceOut),
        sellers: r.sellers,
        capacityUsdc: Number(r.capacityUsdc),
      };
    }
    for (const r of reqRows) {
      activityByModel[r.modelId] = {
        messages: r.messages,
        creditsSold: Number(r.creditsSold),
        tokens: Number(r.tokens),
      };
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
    const activity = activityByModel[m.id] || { messages: 0, creditsSold: 0, tokens: 0 };

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
      activity,
    };
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
  // Most modern chat models support tools + json + streaming. Conservative defaults below.
  if (/gpt-|claude|llama|mistral|gemini|qwen|grok|deepseek/.test(text)) {
    tags.push('TOOLS');
    tags.push('JSON');
    tags.push('STREAMING');
  }
  return tags.slice(0, 5);
}
