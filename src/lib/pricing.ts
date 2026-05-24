import { db } from '@/lib/db';
import { modelPricing } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

const BASE = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

export type ModelInfo = {
  id: string;
  name: string;
  description: string;
  modality: string;
  contextLength: number;
  promptUsdPerToken: number;
  completionUsdPerToken: number;
};

let cache: { fetched: number; rows: ModelInfo[] } | null = null;
const TTL = 60_000;

export async function getModels(opts?: { fresh?: boolean }): Promise<ModelInfo[]> {
  const now = Date.now();
  if (!opts?.fresh && cache && cache.fetched + TTL > now) return cache.rows;
  try {
    const res = await fetch(`${BASE}/models`, {
      headers: process.env.OPENROUTER_API_KEY ? { authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` } : {},
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`openrouter models ${res.status}`);
    const { data } = (await res.json()) as { data: any[] };
    const rows: ModelInfo[] = data.map((m) => ({
      id: m.id,
      name: m.name || m.id,
      description: m.description || '',
      modality: m.architecture?.modality || 'text',
      contextLength: m.context_length || 0,
      promptUsdPerToken: Number(m.pricing?.prompt || 0),
      completionUsdPerToken: Number(m.pricing?.completion || 0),
    }));
    cache = { fetched: now, rows };
    return rows;
  } catch (e) {
    console.warn('[pricing] openrouter fetch failed, using cached/empty', e);
    return cache?.rows || [];
  }
}

export async function getPricingForModel(modelId: string): Promise<{ promptUsdPerToken: number; completionUsdPerToken: number } | null> {
  const all = await getModels();
  const m = all.find((x) => x.id === modelId);
  if (!m) return null;
  return { promptUsdPerToken: m.promptUsdPerToken, completionUsdPerToken: m.completionUsdPerToken };
}

export async function persistPricing(): Promise<number> {
  const rows = await getModels({ fresh: true });
  let n = 0;
  for (const r of rows) {
    await db
      .insert(modelPricing)
      .values({
        modelId: r.id,
        name: r.name,
        description: r.description,
        modality: r.modality,
        contextLength: r.contextLength,
        promptUsd: r.promptUsdPerToken.toString(),
        completionUsd: r.completionUsdPerToken.toString(),
      })
      .onConflictDoUpdate({
        target: modelPricing.modelId,
        set: {
          name: r.name,
          description: r.description,
          modality: r.modality,
          contextLength: r.contextLength,
          promptUsd: r.promptUsdPerToken.toString(),
          completionUsd: r.completionUsdPerToken.toString(),
          updatedAt: sql`now()`,
        },
      });
    n++;
  }
  return n;
}
