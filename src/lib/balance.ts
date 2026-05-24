import { db } from '@/lib/db';
import { ledger } from '@/lib/db/schema';
import { sql, eq } from 'drizzle-orm';

const cache = new Map<string, { value: number; expires: number }>();
const TTL = 5_000;

export async function getBalance(userId: string): Promise<number> {
  const now = Date.now();
  const hit = cache.get(userId);
  if (hit && hit.expires > now) return hit.value;
  const rows = await db
    .select({ sum: sql<string>`coalesce(sum(${ledger.amountUsdc}), 0)` })
    .from(ledger)
    .where(eq(ledger.userId, userId));
  const value = Number(rows[0]?.sum || 0);
  cache.set(userId, { value, expires: now + TTL });
  return value;
}

export function invalidateBalance(userId: string) {
  cache.delete(userId);
}
