import { db } from '@/lib/db';
import { users, creditPurchases } from '@/lib/db/schema';
import { getAuthedUser } from '@/lib/privy';
import { ok, err, fromError } from '@/lib/api';
import { eq } from 'drizzle-orm';
import {
  getTreasuryPublicKey, uiToBaseUnits, verifyCreditPurchase,
  getLLMMartHolding, isLLMMartHolder, LLM_MART_HOLDER_DISCOUNT,
} from '@/lib/chain';
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

    // Same holder discount as /quote applied. If the buyer's $LLMMart balance changed
    // between quote and confirm we attempt verify against both fee splits and accept
    // whichever matches the on-chain amounts.
    const holding = await getLLMMartHolding(u.walletAddress);
    const isHolder = isLLMMartHolder(holding);
    const discountedRate = PLATFORM_FEE_RATE * (1 - LLM_MART_HOLDER_DISCOUNT);

    const splits = isHolder
      ? [{ rate: discountedRate, kind: 'holder' as const }, { rate: PLATFORM_FEE_RATE, kind: 'full' as const }]
      : [{ rate: PLATFORM_FEE_RATE, kind: 'full' as const }, { rate: discountedRate, kind: 'holder' as const }];

    let appliedRate = 0;
    let appliedKind: 'holder' | 'full' = 'full';
    let feeUi = 0;
    let sellerUi = 0;
    let lastErr: any = null;
    for (const s of splits) {
      const f = +(amount * s.rate).toFixed(8);
      const ss = +(amount - f).toFixed(8);
      try {
        await verifyCreditPurchase({
          txHash,
          buyerWallet: u.walletAddress,
          sellerWallet: seller.wallet,
          treasuryWallet: getTreasuryPublicKey().toBase58(),
          expectedSellerBase: uiToBaseUnits(ss),
          expectedFeeBase: uiToBaseUnits(f),
        });
        appliedRate = s.rate;
        appliedKind = s.kind;
        feeUi = f;
        sellerUi = ss;
        lastErr = null;
        break;
      } catch (e: any) {
        lastErr = e;
      }
    }
    if (!appliedRate) {
      return err(400, 'verify_failed', lastErr?.message || 'on-chain verification failed');
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
      isHolder,
      appliedFeeRate: appliedRate,
      discountApplied: appliedKind === 'holder',
    });
  } catch (e) {
    return fromError(e);
  }
}
