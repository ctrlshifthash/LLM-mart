import { PrivyClient } from '@privy-io/server-auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const appSecret = process.env.PRIVY_APP_SECRET;

let _client: PrivyClient | null = null;
export function privy(): PrivyClient {
  if (_client) return _client;
  if (!appId || !appSecret) throw new Error('Privy credentials not set');
  _client = new PrivyClient(appId, appSecret);
  return _client;
}

export type AuthedUser = {
  privyDid: string;
  walletAddress: string | null;
  email: string | null;
  dbUserId: string;
};

export async function getAuthedUser(req: Request | NextRequest): Promise<AuthedUser> {
  const auth = req.headers.get('authorization') || '';
  const cookieHeader = req.headers.get('cookie') || '';
  let token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    const match = cookieHeader.match(/privy-token=([^;]+)/);
    token = match ? decodeURIComponent(match[1]) : null;
  }
  if (!token) throw unauthorized('missing token');

  let verified;
  try {
    verified = await privy().verifyAuthToken(token);
  } catch {
    throw unauthorized('invalid token');
  }
  const privyDid = verified.userId;

  let user;
  try {
    user = await privy().getUserById(privyDid);
  } catch {
    user = null;
  }

  const wallet = pickWallet(user);
  const email = pickEmail(user);

  const existing = await db.select().from(users).where(eq(users.privyDid, privyDid)).limit(1);
  let dbUserId: string;
  if (existing.length === 0) {
    const inserted = await db
      .insert(users)
      .values({ privyDid, walletAddress: wallet, email })
      .returning({ id: users.id });
    dbUserId = inserted[0].id;
  } else {
    dbUserId = existing[0].id;
    if ((wallet && existing[0].walletAddress !== wallet) || (email && existing[0].email !== email)) {
      await db.update(users).set({ walletAddress: wallet, email }).where(eq(users.id, dbUserId));
    }
  }

  return { privyDid, walletAddress: wallet, email, dbUserId };
}

function pickWallet(user: any): string | null {
  if (!user) return null;
  const linked = user.linkedAccounts || [];
  const external = linked.find((a: any) => a.type === 'wallet' && a.walletClientType !== 'privy' && a.chainType === 'solana');
  if (external?.address) return external.address;
  const embedded = linked.find((a: any) => a.type === 'wallet' && a.walletClientType === 'privy' && a.chainType === 'solana');
  if (embedded?.address) return embedded.address;
  const anyWallet = linked.find((a: any) => a.type === 'wallet');
  return anyWallet?.address || null;
}

function pickEmail(user: any): string | null {
  if (!user) return null;
  const linked = user.linkedAccounts || [];
  const e = linked.find((a: any) => a.type === 'email');
  return e?.address || user.email?.address || null;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
export function unauthorized(msg = 'unauthorized') {
  return new HttpError(401, msg);
}
