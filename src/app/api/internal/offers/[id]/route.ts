import { db } from '@/lib/db';
import { offers } from '@/lib/db/schema';
import { getAuthedUser } from '@/lib/privy';
import { ok, err, fromError } from '@/lib/api';
import { encrypt } from '@/lib/crypto';
import { and, eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await getAuthedUser(req);
    const { id } = await params;
    const b = (await req.json().catch(() => ({}))) as any;
    const patch: Record<string, unknown> = {};
    if (b.status && ['active', 'paused'].includes(b.status)) patch.status = b.status;
    if (b.priceInPerMUsdc != null) patch.priceInPerMUsdc = Number(b.priceInPerMUsdc).toString();
    if (b.priceOutPerMUsdc != null) patch.priceOutPerMUsdc = Number(b.priceOutPerMUsdc).toString();
    if (b.maxDailyCapacityUsdc != null) patch.maxDailyCapacityUsdc = Number(b.maxDailyCapacityUsdc).toString();
    if (b.upstreamKey) patch.upstreamKeyEncrypted = await encrypt(b.upstreamKey);
    const updated = await db
      .update(offers)
      .set(patch)
      .where(and(eq(offers.id, id), eq(offers.sellerUserId, u.dbUserId)))
      .returning({ id: offers.id });
    if (!updated.length) return err(404, 'not_found', 'offer not found');
    return ok({ ok: true });
  } catch (e) {
    return fromError(e);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await getAuthedUser(req);
    const { id } = await params;
    const removed = await db
      .delete(offers)
      .where(and(eq(offers.id, id), eq(offers.sellerUserId, u.dbUserId)))
      .returning({ id: offers.id });
    if (!removed.length) return err(404, 'not_found', 'offer not found');
    return ok({ ok: true });
  } catch (e) {
    return fromError(e);
  }
}
