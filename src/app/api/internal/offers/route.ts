import { db } from '@/lib/db';
import { offers } from '@/lib/db/schema';
import { getAuthedUser } from '@/lib/privy';
import { ok, err, fromError } from '@/lib/api';
import { encrypt } from '@/lib/crypto';
import { and, eq, desc } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const u = await getAuthedUser(req);
    const rows = await db
      .select({
        id: offers.id,
        modelId: offers.modelId,
        modality: offers.modality,
        priceInPerMUsdc: offers.priceInPerMUsdc,
        priceOutPerMUsdc: offers.priceOutPerMUsdc,
        upstreamProvider: offers.upstreamProvider,
        maxDailyCapacityUsdc: offers.maxDailyCapacityUsdc,
        status: offers.status,
        createdAt: offers.createdAt,
      })
      .from(offers)
      .where(eq(offers.sellerUserId, u.dbUserId))
      .orderBy(desc(offers.createdAt));
    return ok({ offers: rows });
  } catch (e) {
    return fromError(e);
  }
}

export async function POST(req: Request) {
  try {
    const u = await getAuthedUser(req);
    const b = (await req.json().catch(() => ({}))) as any;
    if (!b.modelId) return err(400, 'bad_request', 'modelId required');
    if (!b.upstreamKey) return err(400, 'bad_request', 'upstreamKey required');
    const priceIn = Number(b.priceInPerMUsdc);
    const priceOut = Number(b.priceOutPerMUsdc);
    const cap = Number(b.maxDailyCapacityUsdc);
    if (!isFinite(priceIn) || priceIn < 0) return err(400, 'bad_request', 'priceInPerMUsdc invalid');
    if (!isFinite(priceOut) || priceOut < 0) return err(400, 'bad_request', 'priceOutPerMUsdc invalid');
    if (!isFinite(cap) || cap < 0) return err(400, 'bad_request', 'maxDailyCapacityUsdc invalid');

    const upstreamKeyEncrypted = await encrypt(b.upstreamKey);
    const [row] = await db
      .insert(offers)
      .values({
        sellerUserId: u.dbUserId,
        modelId: b.modelId,
        modality: b.modality || 'text',
        priceInPerMUsdc: priceIn.toString(),
        priceOutPerMUsdc: priceOut.toString(),
        upstreamProvider: b.upstreamProvider || 'openrouter',
        upstreamKeyEncrypted,
        maxDailyCapacityUsdc: cap.toString(),
        status: 'active',
      })
      .returning({ id: offers.id });
    return ok({ id: row.id });
  } catch (e) {
    return fromError(e);
  }
}
