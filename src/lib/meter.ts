import { db } from '@/lib/db';
import { requests, ledger, offers, users } from '@/lib/db/schema';
import { getPricingForModel } from '@/lib/pricing';
import { invalidateBalance } from '@/lib/balance';
import { sendUsdc, PublicKey } from '@/lib/chain';
import { eq } from 'drizzle-orm';

const PLATFORM_USER_ID = process.env.PLATFORM_USER_ID || '00000000-0000-0000-0000-000000000001';
const PLATFORM_FEE_RATE = Number(process.env.PLATFORM_FEE_RATE || 0.10);
const DUST_THRESHOLD_USDC = Number(process.env.DUST_THRESHOLD_USDC || 0.001);

export type MeterInput = {
  buyerUserId: string;
  apiKeyId: string;
  modelId: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  routeSource: 'priority' | 'marketplace' | 'fallback';
  offerId?: string | null;
  status?: string;
  error?: string;
};

export async function meter(input: MeterInput): Promise<{
  buyerCharge: number;
  sellerPayout: number;
  platformFee: number;
  directApiCost: number;
}> {
  const tokensIn = Math.max(0, input.tokensIn | 0);
  const tokensOut = Math.max(0, input.tokensOut | 0);

  let priceInPerM = 0;
  let priceOutPerM = 0;
  let sellerUserId: string | null = null;

  if (input.offerId) {
    const [offer] = await db
      .select({
        priceIn: offers.priceInPerMUsdc,
        priceOut: offers.priceOutPerMUsdc,
        seller: offers.sellerUserId,
      })
      .from(offers)
      .where(eq(offers.id, input.offerId))
      .limit(1);
    if (offer) {
      priceInPerM = Number(offer.priceIn);
      priceOutPerM = Number(offer.priceOut);
      sellerUserId = offer.seller;
    }
  }

  const direct = await getPricingForModel(input.modelId);
  const directInPerM = (direct?.promptUsdPerToken || 0) * 1_000_000;
  const directOutPerM = (direct?.completionUsdPerToken || 0) * 1_000_000;

  const buyerCharge =
    input.routeSource === 'marketplace'
      ? (tokensIn / 1_000_000) * priceInPerM + (tokensOut / 1_000_000) * priceOutPerM
      : 0;
  const directApiCost = (tokensIn / 1_000_000) * directInPerM + (tokensOut / 1_000_000) * directOutPerM;
  const platformFee = buyerCharge * PLATFORM_FEE_RATE;
  const sellerPayout = buyerCharge - platformFee;

  let requestId: string | null = null;

  await db.transaction(async (tx) => {
    const [reqRow] = await tx
      .insert(requests)
      .values({
        buyerUserId: input.buyerUserId,
        apiKeyId: input.apiKeyId,
        offerId: input.offerId || null,
        modelId: input.modelId,
        tokensIn,
        tokensOut,
        buyerChargeUsdc: buyerCharge.toFixed(8),
        sellerPayoutUsdc: sellerPayout.toFixed(8),
        platformFeeUsdc: platformFee.toFixed(8),
        directApiCostUsdc: directApiCost.toFixed(8),
        latencyMs: input.latencyMs | 0,
        routeSource: input.routeSource,
        status: input.status || 'ok',
        error: input.error,
      })
      .returning({ id: requests.id });
    requestId = reqRow.id;

    if (buyerCharge > 0) {
      await tx.insert(ledger).values({
        userId: input.buyerUserId,
        kind: 'debit',
        amountUsdc: (-buyerCharge).toFixed(8),
        requestId: reqRow.id,
        note: `inference ${input.modelId}`,
      });
      if (sellerUserId) {
        await tx.insert(ledger).values({
          userId: sellerUserId,
          kind: 'credit',
          amountUsdc: sellerPayout.toFixed(8),
          requestId: reqRow.id,
          note: `sale ${input.modelId}`,
        });
      }
      await tx.insert(ledger).values({
        userId: PLATFORM_USER_ID,
        kind: 'credit',
        amountUsdc: platformFee.toFixed(8),
        requestId: reqRow.id,
        note: `fee ${input.modelId}`,
      });
    }
  });

  invalidateBalance(input.buyerUserId);
  if (sellerUserId) invalidateBalance(sellerUserId);
  invalidateBalance(PLATFORM_USER_ID);

  // Fire-and-forget: send seller's payout directly to their Solana wallet now.
  // Treasury keeps the 10% platform fee. If the on-chain send fails, the credit
  // stays in the seller's ledger and they can Withdraw manually later.
  if (
    sellerUserId &&
    sellerUserId !== PLATFORM_USER_ID &&
    sellerPayout >= DUST_THRESHOLD_USDC &&
    requestId
  ) {
    void autoSettleToSellerWallet({
      sellerUserId,
      amount: sellerPayout,
      modelId: input.modelId,
      requestId,
    });
  }

  return { buyerCharge, sellerPayout, platformFee, directApiCost };
}

async function autoSettleToSellerWallet(opts: {
  sellerUserId: string;
  amount: number;
  modelId: string;
  requestId: string;
}) {
  try {
    const [u] = await db
      .select({ wallet: users.walletAddress })
      .from(users)
      .where(eq(users.id, opts.sellerUserId))
      .limit(1);
    if (!u?.wallet) {
      console.warn('[auto-settle] seller has no wallet, leaving credit', opts.sellerUserId);
      return;
    }
    let dest: PublicKey;
    try {
      dest = new PublicKey(u.wallet);
    } catch {
      console.warn('[auto-settle] invalid seller wallet, leaving credit', u.wallet);
      return;
    }
    const sig = await sendUsdc(dest, opts.amount);
    await db.insert(ledger).values({
      userId: opts.sellerUserId,
      kind: 'payout',
      amountUsdc: (-opts.amount).toFixed(8),
      requestId: opts.requestId,
      txHash: sig,
      note: `auto-payout for ${opts.modelId}`,
    });
    invalidateBalance(opts.sellerUserId);
  } catch (e: any) {
    console.error('[auto-settle] failed:', e?.message || e);
  }
}

export function estimateCost(tokensIn: number, maxOut: number, priceInPerM: number, priceOutPerM: number): number {
  return (tokensIn / 1_000_000) * priceInPerM + (maxOut / 1_000_000) * priceOutPerM;
}
