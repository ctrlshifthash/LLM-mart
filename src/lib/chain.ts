import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import {
  getOrCreateAssociatedTokenAccount,
  createTransferCheckedInstruction,
  getAccount,
  getMint,
} from '@solana/spl-token';
import bs58 from 'bs58';

export const CLUSTER = (process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'devnet') as 'devnet' | 'mainnet-beta';
export const USDC_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USDC_MINT ||
    (CLUSTER === 'mainnet-beta'
      ? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
      : '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'),
);
export const RPC_URL =
  process.env.SOLANA_RPC_URL ||
  (CLUSTER === 'mainnet-beta' ? 'https://api.mainnet-beta.solana.com' : 'https://api.devnet.solana.com');

export const USDC_DECIMALS = 6;

// $LLMMart governance/discount token (Pump.fun). Holders get a 50% platform-fee discount.
export const LLM_MART_TOKEN_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_LLM_MART_TOKEN_MINT || '23U9HMncAwYRHTxuH32nHJHmVwXkEJyZ2Bxub8pKpump',
);
// Minimum balance (base units) required to count as a holder. Default = any positive holding.
export const LLM_MART_MIN_HOLD = BigInt(process.env.LLM_MART_MIN_HOLD || '1');
export const LLM_MART_HOLDER_DISCOUNT = 0.5; // 50% off the platform fee for holders

export function getConnection(): Connection {
  return new Connection(RPC_URL, 'confirmed');
}

export function getTreasuryKeypair(): Keypair {
  const secret = process.env.TREASURY_PRIVATE_KEY;
  if (!secret) throw new Error('TREASURY_PRIVATE_KEY not set');
  let bytes: Uint8Array;
  if (secret.trim().startsWith('[')) {
    bytes = Uint8Array.from(JSON.parse(secret));
  } else {
    bytes = bs58.decode(secret.trim());
  }
  return Keypair.fromSecretKey(bytes);
}

export function getTreasuryPublicKey(): PublicKey {
  const addr = process.env.NEXT_PUBLIC_TREASURY_ADDRESS;
  if (addr) return new PublicKey(addr);
  return getTreasuryKeypair().publicKey;
}

export function uiToBaseUnits(amount: number | string): bigint {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  return BigInt(Math.round(n * 10 ** USDC_DECIMALS));
}

export function baseUnitsToUi(amount: bigint | number | string): number {
  const n = typeof amount === 'bigint' ? Number(amount) : Number(amount);
  return n / 10 ** USDC_DECIMALS;
}

export async function verifyUsdcDeposit(txHash: string, expectedRecipient: PublicKey): Promise<{
  amount: number;
  sender: string;
  slot: number;
} | null> {
  const conn = getConnection();
  const tx = await conn.getParsedTransaction(txHash, { maxSupportedTransactionVersion: 0, commitment: 'confirmed' });
  if (!tx || tx.meta?.err) return null;

  const recipientAta = (await import('@solana/spl-token')).getAssociatedTokenAddressSync(USDC_MINT, expectedRecipient);
  const pre = tx.meta?.preTokenBalances || [];
  const post = tx.meta?.postTokenBalances || [];

  let delta = 0;
  let sender = '';
  for (const b of post) {
    if (b.mint !== USDC_MINT.toBase58()) continue;
    const accKey = tx.transaction.message.accountKeys[b.accountIndex]?.pubkey?.toBase58();
    if (accKey !== recipientAta.toBase58()) continue;
    const preMatch = pre.find((p) => p.accountIndex === b.accountIndex);
    const before = preMatch ? Number(preMatch.uiTokenAmount.amount) : 0;
    const after = Number(b.uiTokenAmount.amount);
    delta = after - before;
  }
  if (delta <= 0) return null;

  for (const b of pre) {
    if (b.mint !== USDC_MINT.toBase58()) continue;
    const accKey = tx.transaction.message.accountKeys[b.accountIndex]?.pubkey?.toBase58();
    if (accKey === recipientAta.toBase58()) continue;
    const postMatch = post.find((p) => p.accountIndex === b.accountIndex);
    const before = Number(b.uiTokenAmount.amount);
    const after = postMatch ? Number(postMatch.uiTokenAmount.amount) : 0;
    if (before - after === delta) {
      sender = b.owner || '';
      break;
    }
  }

  return { amount: delta / 10 ** USDC_DECIMALS, sender, slot: tx.slot };
}

export async function sendUsdc(to: PublicKey, amountUi: number): Promise<string> {
  const conn = getConnection();
  const payer = getTreasuryKeypair();
  const mint = await getMint(conn, USDC_MINT);
  const fromAta = await getOrCreateAssociatedTokenAccount(conn, payer, USDC_MINT, payer.publicKey);
  const toAta = await getOrCreateAssociatedTokenAccount(conn, payer, USDC_MINT, to);
  const ix = createTransferCheckedInstruction(
    fromAta.address,
    USDC_MINT,
    toAta.address,
    payer.publicKey,
    uiToBaseUnits(amountUi),
    mint.decimals,
  );
  const tx = new Transaction().add(ix);
  return await sendAndConfirmTransaction(conn, tx, [payer]);
}

export async function getLLMMartHolding(walletAddress: string): Promise<bigint> {
  try {
    const conn = getConnection();
    const owner = new PublicKey(walletAddress);
    const ata = (await import('@solana/spl-token')).getAssociatedTokenAddressSync(LLM_MART_TOKEN_MINT, owner);
    const acc = await getAccount(conn, ata);
    return acc.amount;
  } catch {
    return BigInt(0);
  }
}

export function isLLMMartHolder(balance: bigint): boolean {
  return balance >= LLM_MART_MIN_HOLD && balance > BigInt(0);
}

export async function verifyCreditPurchase(opts: {
  txHash: string;
  buyerWallet: string;
  sellerWallet: string;
  treasuryWallet: string;
  expectedSellerBase: bigint;
  expectedFeeBase: bigint;
}): Promise<{ slot: number }> {
  const conn = getConnection();
  let tx = null as Awaited<ReturnType<typeof conn.getParsedTransaction>>;
  for (let i = 0; i < 8; i++) {
    tx = await conn.getParsedTransaction(opts.txHash, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    });
    if (tx) break;
    await new Promise((r) => setTimeout(r, 1200));
  }
  if (!tx) throw new Error('tx_not_found');
  if (tx.meta?.err) throw new Error(`tx_failed: ${JSON.stringify(tx.meta.err)}`);

  const pre = tx.meta?.preTokenBalances || [];
  const post = tx.meta?.postTokenBalances || [];
  const mint = USDC_MINT.toBase58();
  const deltas = new Map<string, bigint>();

  for (const b of post) {
    if (b.mint !== mint) continue;
    const owner = b.owner || '';
    const preMatch = pre.find((p) => p.accountIndex === b.accountIndex);
    const before = preMatch ? BigInt(preMatch.uiTokenAmount.amount) : BigInt(0);
    const after = BigInt(b.uiTokenAmount.amount);
    deltas.set(owner, (deltas.get(owner) || BigInt(0)) + (after - before));
  }
  for (const b of pre) {
    if (b.mint !== mint) continue;
    const owner = b.owner || '';
    const postMatch = post.find((p) => p.accountIndex === b.accountIndex);
    if (postMatch) continue;
    deltas.set(owner, (deltas.get(owner) || BigInt(0)) - BigInt(b.uiTokenAmount.amount));
  }

  const buyerDelta = deltas.get(opts.buyerWallet) ?? BigInt(0);
  if (-buyerDelta < opts.expectedSellerBase + opts.expectedFeeBase) {
    throw new Error(`buyer_underpaid (${-buyerDelta} < ${opts.expectedSellerBase + opts.expectedFeeBase})`);
  }
  const sellerDelta = deltas.get(opts.sellerWallet) ?? BigInt(0);
  if (sellerDelta < opts.expectedSellerBase) {
    throw new Error(`seller_underreceived (${sellerDelta} < ${opts.expectedSellerBase})`);
  }
  const treasuryDelta = deltas.get(opts.treasuryWallet) ?? BigInt(0);
  if (treasuryDelta < opts.expectedFeeBase) {
    throw new Error(`treasury_underreceived (${treasuryDelta} < ${opts.expectedFeeBase})`);
  }

  return { slot: tx.slot };
}

export async function getTreasuryUsdcBalance(): Promise<number> {
  try {
    const conn = getConnection();
    const owner = getTreasuryPublicKey();
    const ata = (await import('@solana/spl-token')).getAssociatedTokenAddressSync(USDC_MINT, owner);
    const acc = await getAccount(conn, ata);
    return Number(acc.amount) / 10 ** USDC_DECIMALS;
  } catch {
    return 0;
  }
}

export { PublicKey };
