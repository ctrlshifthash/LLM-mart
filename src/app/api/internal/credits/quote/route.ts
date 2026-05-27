import { db } from '@/lib/db';
import { users, offers } from '@/lib/db/schema';
import { getAuthedUser } from '@/lib/privy';
import { ok, err, fromError } from '@/lib/api';
import { eq } from 'drizzle-orm';
import {
  getTreasuryPublicKey, uiToBaseUnits, USDC_MINT, USDC_DECIMALS,
  getLLMMartHolding, isLLMMartHolder, LLM_MART_HOLDER_DISCOUNT,
} from '@/lib/chain';

export const runtime = 'nodejs';

const PLATFORM_FEE_RATE = Number(process.env.PLATFORM_FEE_RATE || 0.01);

export async function POST(req: Request) {
  try {
    const u = await getAuthedUser(req);
    if (!u.walletAddress) return err(400, 'no_wallet', 'connect a Solana wallet first');

    const body = (await req.json().catch(() => ({}))) as {
      sellerUserId?: string;
      offerId?: string;
      amountUsdc?: number | string;
    };
    const amount = Number(body.amountUsdc);
    if (!isFinite(amount) || amount <= 0) return err(400, 'bad_request', 'amountUsdc > 0 required');
    if (amount < 0.01) return err(400, 'bad_request', 'minimum $0.01');

    let sellerUserId = body.sellerUserId || '';
    if (!sellerUserId && body.offerId) {
      const [o] = await db.select({ s: offers.sellerUserId }).from(offers).where(eq(offers.id, body.offerId)).limit(1);
      sellerUserId = o?.s || '';
    }
    if (!sellerUserId) return err(400, 'bad_request', 'sellerUserId or offerId required');
    if (sellerUserId === u.dbUserId) return err(400, 'bad_request', 'cannot buy credits from yourself');

    const [seller] = await db
      .select({ id: users.id, wallet: users.walletAddress })
      .from(users)
      .where(eq(users.id, sellerUserId))
      .limit(1);
    if (!seller) return err(404, 'not_found', 'seller not found');
    if (!seller.wallet) return err(400, 'seller_no_wallet', 'seller has no payout wallet');

    // 50% discount on platform fee if the buyer holds $LLMMart.
    const holding = await getLLMMartHolding(u.walletAddress);
    const isHolder = isLLMMartHolder(holding);
    const effectiveFeeRate = isHolder ? PLATFORM_FEE_RATE * (1 - LLM_MART_HOLDER_DISCOUNT) : PLATFORM_FEE_RATE;

    const feeUi = +(amount * effectiveFeeRate).toFixed(8);
    const sellerUi = +(amount - feeUi).toFixed(8);
    const sellerBase = uiToBaseUnits(sellerUi);
    const feeBase = uiToBaseUnits(feeUi);
    const treasury = getTreasuryPublicKey().toBase58();

    return ok({
      buyerWallet: u.walletAddress,
      sellerWallet: seller.wallet,
      treasuryWallet: treasury,
      usdcMint: USDC_MINT.toBase58(),
      usdcDecimals: USDC_DECIMALS,
      amountUsdc: amount,
      sellerAmountUsdc: sellerUi,
      feeUsdc: feeUi,
      sellerAmountBase: sellerBase.toString(),
      feeAmountBase: feeBase.toString(),
      sellerUserId: seller.id,
      isHolder,
      effectiveFeeRate,
      llmMartBalance: holding.toString(),
    });
  } catch (e) {
    return fromError(e);
  }
}
