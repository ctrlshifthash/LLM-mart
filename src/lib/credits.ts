import { db } from '@/lib/db';
import { credits } from '@/lib/db/schema';
import { and, eq, sql } from 'drizzle-orm';

export async function getCreditBalance(buyerUserId: string, sellerUserId: string): Promise<number> {
  const [row] = await db
    .select({ b: credits.balanceUsdc })
    .from(credits)
    .where(and(eq(credits.buyerUserId, buyerUserId), eq(credits.sellerUserId, sellerUserId)))
    .limit(1);
  return Number(row?.b || 0);
}

export async function listBuyerCredits(buyerUserId: string) {
  return db
    .select({
      sellerUserId: credits.sellerUserId,
      balance: credits.balanceUsdc,
      lifetime: credits.lifetimeUsdc,
      updatedAt: credits.updatedAt,
    })
    .from(credits)
    .where(eq(credits.buyerUserId, buyerUserId));
}

export async function listSellerCredits(sellerUserId: string) {
  return db
    .select({
      buyerUserId: credits.buyerUserId,
      balance: credits.balanceUsdc,
      lifetime: credits.lifetimeUsdc,
      updatedAt: credits.updatedAt,
    })
    .from(credits)
    .where(eq(credits.sellerUserId, sellerUserId));
}

export async function debitCredits(
  buyerUserId: string,
  sellerUserId: string,
  amount: number,
): Promise<{ ok: boolean; balanceAfter: number }> {
  if (amount <= 0) {
    return { ok: true, balanceAfter: await getCreditBalance(buyerUserId, sellerUserId) };
  }
  const rows = await db
    .update(credits)
    .set({
      balanceUsdc: sql`${credits.balanceUsdc} - ${amount.toFixed(8)}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(credits.buyerUserId, buyerUserId),
        eq(credits.sellerUserId, sellerUserId),
        sql`${credits.balanceUsdc} >= ${amount.toFixed(8)}`,
      ),
    )
    .returning({ balanceAfter: credits.balanceUsdc });
  if (rows.length === 0) return { ok: false, balanceAfter: await getCreditBalance(buyerUserId, sellerUserId) };
  return { ok: true, balanceAfter: Number(rows[0].balanceAfter) };
}

export async function creditTopUp(
  buyerUserId: string,
  sellerUserId: string,
  amount: number,
): Promise<{ balance: number }> {
  const [existing] = await db
    .select({ id: credits.id, balance: credits.balanceUsdc, lifetime: credits.lifetimeUsdc })
    .from(credits)
    .where(and(eq(credits.buyerUserId, buyerUserId), eq(credits.sellerUserId, sellerUserId)))
    .limit(1);
  if (existing) {
    const [r] = await db
      .update(credits)
      .set({
        balanceUsdc: sql`${credits.balanceUsdc} + ${amount.toFixed(8)}`,
        lifetimeUsdc: sql`${credits.lifetimeUsdc} + ${amount.toFixed(8)}`,
        updatedAt: new Date(),
      })
      .where(eq(credits.id, existing.id))
      .returning({ balance: credits.balanceUsdc });
    return { balance: Number(r.balance) };
  }
  const [r] = await db
    .insert(credits)
    .values({
      buyerUserId,
      sellerUserId,
      balanceUsdc: amount.toFixed(8),
      lifetimeUsdc: amount.toFixed(8),
    })
    .returning({ balance: credits.balanceUsdc });
  return { balance: Number(r.balance) };
}
