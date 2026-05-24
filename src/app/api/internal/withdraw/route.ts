import { db } from '@/lib/db';
import { ledger } from '@/lib/db/schema';
import { getAuthedUser } from '@/lib/privy';
import { ok, err, fromError } from '@/lib/api';
import { sendUsdc, PublicKey } from '@/lib/chain';
import { getBalance, invalidateBalance } from '@/lib/balance';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const u = await getAuthedUser(req);
    const b = (await req.json().catch(() => ({}))) as { amount?: number | string; destination?: string };
    const amount = Number(b.amount);
    if (!isFinite(amount) || amount <= 0) return err(400, 'bad_request', 'amount > 0 required');
    const destination = (b.destination || u.walletAddress || '').trim();
    if (!destination) return err(400, 'bad_request', 'destination required');

    let dest: PublicKey;
    try { dest = new PublicKey(destination); } catch { return err(400, 'bad_request', 'invalid destination address'); }

    const balance = await getBalance(u.dbUserId);
    if (balance < amount) return err(400, 'insufficient_balance', `balance ${balance.toFixed(4)} < ${amount}`);

    // Reserve the funds first (pending payout)
    const [pending] = await db
      .insert(ledger)
      .values({
        userId: u.dbUserId,
        kind: 'payout',
        amountUsdc: (-amount).toFixed(8),
        note: `withdraw to ${destination} (pending)`,
      })
      .returning({ id: ledger.id });
    invalidateBalance(u.dbUserId);

    let sig: string;
    try {
      sig = await sendUsdc(dest, amount);
    } catch (e: any) {
      // Refund on failure
      await db.insert(ledger).values({
        userId: u.dbUserId,
        kind: 'refund',
        amountUsdc: amount.toFixed(8),
        note: `refund failed payout ${pending.id}: ${e?.message || 'unknown'}`,
      });
      invalidateBalance(u.dbUserId);
      return err(500, 'payout_failed', e?.message || 'payout failed');
    }

    await db.insert(ledger).values({
      userId: u.dbUserId,
      kind: 'payout',
      amountUsdc: '0',
      txHash: sig,
      note: `payout confirmed for ledger ${pending.id}`,
    });

    return ok({ txHash: sig, amount });
  } catch (e) {
    return fromError(e);
  }
}
