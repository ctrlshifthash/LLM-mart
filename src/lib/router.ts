import { db } from '@/lib/db';
import { offers, routerConfig, requests, credits } from '@/lib/db/schema';
import { decrypt } from '@/lib/crypto';
import { and, eq, gte, sql, asc } from 'drizzle-orm';
import { estimateCost } from '@/lib/meter';

const unhealthy = new Map<string, number>();
const UNHEALTHY_MS = 60_000;

export function markUnhealthy(offerId: string) {
  unhealthy.set(offerId, Date.now() + UNHEALTHY_MS);
}
export function isHealthy(offerId: string): boolean {
  const t = unhealthy.get(offerId);
  if (!t) return true;
  if (t < Date.now()) { unhealthy.delete(offerId); return true; }
  return false;
}

export type RouteAttempt = {
  source: 'priority' | 'marketplace' | 'fallback';
  provider: string;
  apiKey: string;
  offerId: string | null;
  sellerUserId: string | null;
  priceInPerM: number;
  priceOutPerM: number;
};

export async function resolveRoutes(input: {
  buyerUserId: string;
  modelId: string;
  estimatedTokensIn: number;
  estimatedMaxOut: number;
}): Promise<{ attempts: RouteAttempt[]; reason?: 'insufficient_credits' }> {
  const attempts: RouteAttempt[] = [];

  const [cfg] = await db.select().from(routerConfig).where(eq(routerConfig.userId, input.buyerUserId)).limit(1);

  if (cfg?.priorityKeyEncrypted && cfg.priorityProvider) {
    attempts.push({
      source: 'priority',
      provider: cfg.priorityProvider,
      apiKey: await decrypt(cfg.priorityKeyEncrypted),
      offerId: null,
      sellerUserId: null,
      priceInPerM: 0,
      priceOutPerM: 0,
    });
  }

  const cands = await db
    .select({
      id: offers.id,
      sellerUserId: offers.sellerUserId,
      priceIn: offers.priceInPerMUsdc,
      priceOut: offers.priceOutPerMUsdc,
      cap: offers.maxDailyCapacityUsdc,
      provider: offers.upstreamProvider,
      keyEnc: offers.upstreamKeyEncrypted,
      creditBalance: credits.balanceUsdc,
    })
    .from(offers)
    .leftJoin(
      credits,
      and(eq(credits.sellerUserId, offers.sellerUserId), eq(credits.buyerUserId, input.buyerUserId)),
    )
    .where(and(eq(offers.modelId, input.modelId), eq(offers.status, 'active')))
    .orderBy(asc(offers.priceInPerMUsdc))
    .limit(5);

  let sawCandidate = false;
  for (const o of cands) {
    sawCandidate = true;
    if (!isHealthy(o.id)) continue;
    const spent = await dailySpend(o.id);
    if (spent >= Number(o.cap)) continue;
    const balance = Number(o.creditBalance || 0);
    if (balance <= 0) continue;
    const est = estimateCost(input.estimatedTokensIn, input.estimatedMaxOut, Number(o.priceIn), Number(o.priceOut));
    // Require at least a tiny buffer; if we have any balance but not enough for the worst case,
    // we still try — the meter will debit actuals and fail open if we go negative.
    if (balance < est && balance < 0.0001) continue;
    attempts.push({
      source: 'marketplace',
      provider: o.provider,
      apiKey: await decrypt(o.keyEnc),
      offerId: o.id,
      sellerUserId: o.sellerUserId,
      priceInPerM: Number(o.priceIn),
      priceOutPerM: Number(o.priceOut),
    });
  }

  if (cfg?.fallbackKeyEncrypted && cfg.fallbackProvider) {
    attempts.push({
      source: 'fallback',
      provider: cfg.fallbackProvider,
      apiKey: await decrypt(cfg.fallbackKeyEncrypted),
      offerId: null,
      sellerUserId: null,
      priceInPerM: 0,
      priceOutPerM: 0,
    });
  }

  if (attempts.length === 0 && sawCandidate) {
    return { attempts, reason: 'insufficient_credits' };
  }
  return { attempts };
}

export async function dailySpend(offerId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ s: sql<string>`coalesce(sum(${requests.buyerChargeUsdc}), 0)` })
    .from(requests)
    .where(and(eq(requests.offerId, offerId), gte(requests.createdAt, since)));
  return Number(rows[0]?.s || 0);
}
