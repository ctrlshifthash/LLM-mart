import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { getAuthedUser } from '@/lib/privy';
import { ok, fromError } from '@/lib/api';
import { listBuyerCredits } from '@/lib/credits';
import { inArray } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const u = await getAuthedUser(req);
    const rows = await listBuyerCredits(u.dbUserId);
    if (rows.length === 0) return ok({ credits: [] });
    const sellerIds = rows.map((r) => r.sellerUserId);
    const sellers = await db
      .select({ id: users.id, wallet: users.walletAddress, email: users.email })
      .from(users)
      .where(inArray(users.id, sellerIds));
    const byId = new Map(sellers.map((s) => [s.id, s]));
    const out = rows.map((r) => ({
      sellerUserId: r.sellerUserId,
      sellerWallet: byId.get(r.sellerUserId)?.wallet || null,
      balance: Number(r.balance),
      lifetime: Number(r.lifetime),
      updatedAt: r.updatedAt,
    }));
    return ok({ credits: out });
  } catch (e) {
    return fromError(e);
  }
}
