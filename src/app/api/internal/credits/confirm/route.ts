import { db } from '@/lib/db';
import { users, creditPurchases } from '@/lib/db/schema';
import { getAuthedUser } from '@/lib/privy';
import { ok, err, fromError } from '@/lib/api';
import { eq } from 'drizzle-orm';
import { getTreasuryPublicKey, uiToBaseUnits, verifyCreditPurchase } from '@/lib/chain';
import { creditTopUp } from '@/lib/credits';

export const runtime = 'nodejs';

const PLATFORM_FEE_RATE = Number(process.env.PLATFORM_FEE_RATE || 0.01);

export async function POST(req: Request) {
  try {
    const u = await getAuthedUser(req);
    if (!u.walletAddress) return err(400, 'no_wallet', 'connect a Solana wallet first');

    const body = (await req.json().catch(() => ({}))) as {
      sellerUserId?: string;
      amountUsdc?: number;
      txHash?: string;
    };
    const amount = Number(body.amountUsdc);
    const txHash = (body.txHash || '').trim();
    if (!isFinite(amount) || amount <= 0) return err(400, 'bad_request', 'amountUsdc required');
    if (!txHash) return err(400, 'bad_request', 'txHash required');
    if (!body.sellerUserId) return err(400, 'bad_request', 'sellerUserId required');

    const existing = await db
      .select({ id: creditPurchases.id })
      .from(creditPurchases)
      .where(eq(creditPurchases.txHash, txHash))
      .limit(1);
    if (existing.length) return err(409, 'duplicate', 'tx already recorded');

    const [seller] = await db
      .select({ id: users.id, wallet: users.walletAddress })
      .from(users)
      .where(eq(users.id, body.sellerUserId))
      .limit(1);
    if (!seller?.wallet) return err(400, 'seller_no_wallet', 'seller has no wallet');

    const feeUi = +(amount * PLATFORM_FEE_RATE).toFixed(8);
    const sellerUi = +(amount - feeUi).toFixed(8);
    const sellerBase = uiToBaseUnits(sellerUi);
    const feeBase = uiToBaseUnits(feeUi);

    try {
      await verifyCreditPurchase({
        txHash,
        buyerWallet: u.walletAddress,
        sellerWallet: seller.wallet,
        treasuryWallet: getTreasuryPublicKey().toBase58(),
        expectedSellerBase: sellerBase,
        expectedFeeBase: feeBase,
      });
    } catch (e: any) {
      return err(400, 'verify_failed', e?.message || 'on-chain verification failed');
    }

    await db.insert(creditPurchases).values({
      buyerUserId: u.dbUserId,
      sellerUserId: seller.id,
      txHash,
      amountUsdc: amount.toFixed(8),
      sellerReceivedUsdc: sellerUi.toFixed(8),
      feeUsdc: feeUi.toFixed(8),
      confirmedAt: new Date(),
    });

    const { balance } = await creditTopUp(u.dbUserId, seller.id, amount);

    return ok({
      txHash,
      amountUsdc: amount,
      sellerReceivedUsdc: sellerUi,
      feeUsdc: feeUi,
      balance,
    });
  } catch (e) {
    return fromError(e);
  }
}
