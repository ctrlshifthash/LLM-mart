import { db } from '@/lib/db';
import { deposits, ledger } from '@/lib/db/schema';
import { getAuthedUser } from '@/lib/privy';
import { ok, err, fromError } from '@/lib/api';
import { getTreasuryPublicKey, verifyUsdcDeposit } from '@/lib/chain';
import { invalidateBalance } from '@/lib/balance';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const u = await getAuthedUser(req);
    const body = (await req.json().catch(() => ({}))) as { txHash?: string };
    const txHash = (body.txHash || '').trim();
    if (!txHash) return err(400, 'bad_request', 'txHash required');

    const existing = await db.select().from(deposits).where(eq(deposits.txHash, txHash)).limit(1);
    if (existing.length) return err(409, 'duplicate', 'tx already recorded');

    const treasury = getTreasuryPublicKey();
    let info = null as Awaited<ReturnType<typeof verifyUsdcDeposit>>;
    for (let i = 0; i < 8; i++) {
      info = await verifyUsdcDeposit(txHash, treasury);
      if (info) break;
      await new Promise((r) => setTimeout(r, 1500));
    }
    if (!info) return err(400, 'tx_not_found', 'transaction not confirmed or did not credit treasury');

    await db.transaction(async (tx) => {
      await tx.insert(deposits).values({
        userId: u.dbUserId,
        txHash,
        amountUsdc: info!.amount.toString(),
        blockNumber: info!.slot,
        confirmedAt: new Date(),
      });
      await tx.insert(ledger).values({
        userId: u.dbUserId,
        kind: 'deposit',
        amountUsdc: info!.amount.toString(),
        txHash,
        note: `deposit from ${info!.sender || 'unknown'}`,
      });
    });
    invalidateBalance(u.dbUserId);
    return ok({ amount: info.amount, txHash });
  } catch (e) {
    return fromError(e);
  }
}
