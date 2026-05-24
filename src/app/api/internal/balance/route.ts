import { getAuthedUser } from '@/lib/privy';
import { getBalance } from '@/lib/balance';
import { ok, fromError } from '@/lib/api';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const u = await getAuthedUser(req);
    const balance = await getBalance(u.dbUserId);
    return ok({ balance });
  } catch (e) {
    return fromError(e);
  }
}
