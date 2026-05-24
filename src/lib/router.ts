import { db } from '@/lib/db';
import { offers, routerConfig, requests, ledger } from '@/lib/db/schema';
import { decrypt } from '@/lib/crypto';
import { and, eq, gte, sql, desc, asc } from 'drizzle-orm';
import { getBalance } from '@/lib/balance';
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
  priceInPerM: number;
  priceOutPerM: number;
};

export async function resolveRoutes(input: {
  buyerUserId: string;
  modelId: string;
  estimatedTokensIn: number;
  estimatedMaxOut: number;
}): Promise<{ attempts: RouteAttempt[]; balance: number; reason?: string }> {
  const attempts: RouteAttempt[] = [];

  const [cfg] = await db.select().from(routerConfig).where(eq(routerConfig.userId, input.buyerUserId)).limit(1);

  if (cfg?.priorityKeyEncrypted && cfg.priorityProvider) {
    attempts.push({
      source: 'priority',
      provider: cfg.priorityProvider,
      apiKey: await decrypt(cfg.priorityKeyEncrypted),
      offerId: null,
      priceInPerM: 0,
      priceOutPerM: 0,
    });
  }

  const cands = await db
    .select()
    .from(offers)
    .where(and(eq(offers.modelId, input.modelId), eq(offers.status, 'active')))
    .orderBy(asc(offers.priceInPerMUsdc))
    .limit(5);

  const balance = await getBalance(input.buyerUserId);
  for (const o of cands) {
    if (!isHealthy(o.id)) continue;
    const spent = await dailySpend(o.id);
    if (spent >= Number(o.maxDailyCapacityUsdc)) continue;
    const est = estimateCost(input.estimatedTokensIn, input.estimatedMaxOut, Number(o.priceInPerMUsdc), Number(o.priceOutPerMUsdc));
    if (balance < est) {
      return { attempts, balance, reason: 'insufficient_balance' };
    }
    attempts.push({
      source: 'marketplace',
      provider: o.upstreamProvider,
      apiKey: await decrypt(o.upstreamKeyEncrypted),
      offerId: o.id,
      priceInPerM: Number(o.priceInPerMUsdc),
      priceOutPerM: Number(o.priceOutPerMUsdc),
    });
  }

  if (cfg?.fallbackKeyEncrypted && cfg.fallbackProvider) {
    attempts.push({
      source: 'fallback',
      provider: cfg.fallbackProvider,
      apiKey: await decrypt(cfg.fallbackKeyEncrypted),
      offerId: null,
      priceInPerM: 0,
      priceOutPerM: 0,
    });
  }

  return { attempts, balance };
}

export async function dailySpend(offerId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ s: sql<string>`coalesce(sum(${requests.buyerChargeUsdc}), 0)` })
    .from(requests)
    .where(and(eq(requests.offerId, offerId), gte(requests.createdAt, since)));
  return Number(rows[0]?.s || 0);
}
