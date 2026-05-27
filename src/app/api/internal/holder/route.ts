import { getAuthedUser } from '@/lib/privy';
import { ok, fromError } from '@/lib/api';
import {
  getLLMMartHolding,
  isLLMMartHolder,
  LLM_MART_TOKEN_MINT,
  LLM_MART_MIN_HOLD,
  LLM_MART_HOLDER_DISCOUNT,
} from '@/lib/chain';

export const runtime = 'nodejs';

// GET /api/internal/holder
// Returns the authed user's $LLMMart balance + whether they qualify for the
// 50% platform-fee discount. Used by the buy modal to render a "Holder discount"
// badge and reflect the lowered fee in the preview.
export async function GET(req: Request) {
  try {
    const u = await getAuthedUser(req);
    if (!u.walletAddress) {
      return ok({
        isHolder: false,
        balance: '0',
        mint: LLM_MART_TOKEN_MINT.toBase58(),
        minHold: LLM_MART_MIN_HOLD.toString(),
        discount: LLM_MART_HOLDER_DISCOUNT,
        reason: 'no_wallet',
      });
    }
    const balance = await getLLMMartHolding(u.walletAddress);
    return ok({
      isHolder: isLLMMartHolder(balance),
      balance: balance.toString(),
      mint: LLM_MART_TOKEN_MINT.toBase58(),
      minHold: LLM_MART_MIN_HOLD.toString(),
      discount: LLM_MART_HOLDER_DISCOUNT,
    });
  } catch (e) {
    return fromError(e);
  }
}
