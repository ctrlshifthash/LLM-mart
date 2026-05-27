import { db } from '@/lib/db';
import { requests, offers } from '@/lib/db/schema';
import { getPricingForModel } from '@/lib/pricing';
import { debitCredits } from '@/lib/credits';
import { eq } from 'drizzle-orm';

const PLATFORM_FEE_RATE = Number(process.env.PLATFORM_FEE_RATE || 0.01);

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
      .select({ priceIn: offers.priceInPerMUsdc, priceOut: offers.priceOutPerMUsdc, seller: offers.sellerUserId })
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

  await db.insert(requests).values({
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
  });

  if (input.routeSource === 'marketplace' && sellerUserId && buyerCharge > 0) {
    // Debit the buyer's credit balance with this seller. Allowed to go slightly negative if the
    // buyer's last request finished mid-stream — the seller has already been paid on-chain at top-up
    // time, so they're not at risk; the buyer simply can't make another request until they top up.
    await debitCredits(input.buyerUserId, sellerUserId, buyerCharge).catch((e) =>
      console.error('[meter] debit failed', e),
    );
  }

  return { buyerCharge, sellerPayout, platformFee, directApiCost };
}

export function estimateCost(tokensIn: number, maxOut: number, priceInPerM: number, priceOutPerM: number): number {
  return (tokensIn / 1_000_000) * priceInPerM + (maxOut / 1_000_000) * priceOutPerM;
}
