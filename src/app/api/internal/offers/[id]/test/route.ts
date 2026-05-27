import { db } from '@/lib/db';
import { offers } from '@/lib/db/schema';
import { getAuthedUser } from '@/lib/privy';
import { ok, err, fromError } from '@/lib/api';
import { decrypt } from '@/lib/crypto';
import { and, eq } from 'drizzle-orm';
import { testProviderKey } from '@/lib/providers/test-key';

export const runtime = 'nodejs';

// POST /api/internal/offers/[id]/test
// Re-runs save-time validation against the stored upstream key.
// Used by the "Test" button on each row in the seller's offer table.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const u = await getAuthedUser(req);
    const { id } = await ctx.params;
    const [row] = await db
      .select({
        provider: offers.upstreamProvider,
        keyEnc: offers.upstreamKeyEncrypted,
        sellerUserId: offers.sellerUserId,
      })
      .from(offers)
      .where(and(eq(offers.id, id), eq(offers.sellerUserId, u.dbUserId)))
      .limit(1);
    if (!row) return err(404, 'not_found', 'offer not found');

    let apiKey = '';
    try { apiKey = await decrypt(row.keyEnc); }
    catch (e: any) { return err(400, 'decrypt_failed', e?.message || 'could not decrypt stored key'); }

    const probe = await testProviderKey(row.provider, apiKey);
    if (probe.ok) {
      return ok({ ok: true, provider: row.provider, modelsCount: probe.modelsCount, sample: probe.sample });
    }
    return ok({ ok: false, provider: row.provider, status: probe.status, message: probe.message });
  } catch (e) {
    return fromError(e);
  }
}
