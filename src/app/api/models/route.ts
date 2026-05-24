import { db } from '@/lib/db';
import { offers } from '@/lib/db/schema';
import { getModels } from '@/lib/pricing';
import { and, eq, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const revalidate = 60;

export async function GET() {
  const models = await getModels();

  let bestByModel: Record<string, { priceIn: number; priceOut: number; sellers: number }> = {};
  try {
    const rows = await db
      .select({
        modelId: offers.modelId,
        priceIn: sql<string>`min(${offers.priceInPerMUsdc})`,
        priceOut: sql<string>`min(${offers.priceOutPerMUsdc})`,
        sellers: sql<number>`count(*)::int`,
      })
      .from(offers)
      .where(eq(offers.status, 'active'))
      .groupBy(offers.modelId);
    for (const r of rows) {
      bestByModel[r.modelId] = {
        priceIn: Number(r.priceIn),
        priceOut: Number(r.priceOut),
        sellers: r.sellers,
      };
    }
  } catch (e) {
    console.warn('[api/models] offers lookup failed (db may be unavailable):', e instanceof Error ? e.message : e);
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
    return {
      id: m.id,
      name: m.name,
      description: m.description,
      modality: m.modality,
      contextLength: m.contextLength,
      direct: { promptPerM: directInPerM, completionPerM: directOutPerM },
      best: { promptPerM: bestInPerM, completionPerM: bestOutPerM, sellers: best?.sellers ?? 0 },
      savings,
    };
  });

  return Response.json({ models: out });
}
