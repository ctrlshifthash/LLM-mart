/* Full end-to-end smoke test:
 *   1. Buyer keypair → on-chain credit purchase (buyer → seller 99% + treasury 1% in one tx)
 *   2. DB credit row updated
 *   3. inf_ API key → /api/inference/v1/chat/completions
 *   4. Final credit balance + token usage
 *
 * Prints every signature with a Solscan link.
 *
 * Required env (.env.local):
 *   BUYER_PRIVATE_KEY   base58 string OR JSON array of bytes (test buyer wallet — needs USDC)
 *   E2E_API_KEY         an inf_ key minted on /buy belonging to that buyer
 *   E2E_SELLER_USER_ID  uuid of a seller who has at least one active offer
 *   E2E_AMOUNT_USDC     amount of USDC to spend on credits (default 0.5)
 *   E2E_MODEL           model id to call (default openai/gpt-4o-mini)
 *   BASE_URL            dev/prod URL (default http://localhost:3000)
 *
 * Run with:  pnpm test:e2e
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import {
  Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import bs58 from 'bs58';
import { db } from '../src/lib/db';
import { users, creditPurchases, offers, apiKeys } from '../src/lib/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import {
  getTreasuryPublicKey, USDC_MINT, USDC_DECIMALS, getConnection,
  uiToBaseUnits, verifyCreditPurchase, RPC_URL, CLUSTER,
} from '../src/lib/chain';
import { creditTopUp, getCreditBalance } from '../src/lib/credits';
import { sha256Hex } from '../src/lib/crypto';

const PLATFORM_FEE_RATE = Number(process.env.PLATFORM_FEE_RATE || 0.01);
const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

const required = ['BUYER_PRIVATE_KEY', 'E2E_API_KEY', 'E2E_SELLER_USER_ID'];
for (const k of required) if (!process.env[k]) { console.error(`Missing env ${k}`); process.exit(1); }

const AMOUNT_USDC = Number(process.env.E2E_AMOUNT_USDC || '0.5');
const MODEL_ID = process.env.E2E_MODEL || 'openai/gpt-4o-mini';

function solscan(sig: string) {
  return CLUSTER === 'mainnet-beta' ? `https://solscan.io/tx/${sig}` : `https://solscan.io/tx/${sig}?cluster=devnet`;
}
function step(n: number, title: string) {
  console.log(`\n\x1b[36m─── ${n}. ${title}\x1b[0m`);
}
function ok(msg: string)   { console.log(`  \x1b[32m✓\x1b[0m ${msg}`); }
function info(msg: string) { console.log(`  \x1b[2m·\x1b[0m ${msg}`); }
function fail(msg: string) { console.log(`  \x1b[31m✗\x1b[0m ${msg}`); }

function parseKeypair(secret: string): Keypair {
  const t = secret.trim();
  if (t.startsWith('[')) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(t)));
  return Keypair.fromSecretKey(bs58.decode(t));
}

async function main() {
  console.log(`\x1b[1mLLM Mart — end-to-end smoke test\x1b[0m`);
  console.log(`base:      ${BASE_URL}`);
  console.log(`cluster:   ${CLUSTER}`);
  console.log(`rpc:       ${RPC_URL}`);
  console.log(`usdc mint: ${USDC_MINT.toBase58()}`);
  console.log(`amount:    ${AMOUNT_USDC} USDC`);
  console.log(`model:     ${MODEL_ID}`);

  /* ─────────────────────────────────────────────────────────────── */
  step(1, 'Resolve buyer + seller + offer');
  const buyerKp = parseKeypair(process.env.BUYER_PRIVATE_KEY!);
  const buyerWalletStr = buyerKp.publicKey.toBase58();
  info(`buyer wallet:      ${buyerWalletStr}`);

  const [buyerRow] = await db.select({ id: users.id }).from(users).where(eq(users.walletAddress, buyerWalletStr)).limit(1);
  if (!buyerRow) { fail(`No user row with wallet ${buyerWalletStr}. Sign in once at ${BASE_URL} first.`); process.exit(2); }
  const buyerUserId = buyerRow.id;
  ok(`buyer user id:    ${buyerUserId}`);

  const sellerUserId = process.env.E2E_SELLER_USER_ID!;
  const [seller] = await db
    .select({ id: users.id, wallet: users.walletAddress, email: users.email })
    .from(users)
    .where(eq(users.id, sellerUserId))
    .limit(1);
  if (!seller?.wallet) { fail(`Seller ${sellerUserId} has no wallet on file`); process.exit(2); }
  ok(`seller wallet:    ${seller.wallet}`);

  const sellerOffers = await db
    .select({ id: offers.id, modelId: offers.modelId, priceIn: offers.priceInPerMUsdc, priceOut: offers.priceOutPerMUsdc, provider: offers.upstreamProvider })
    .from(offers)
    .where(and(eq(offers.sellerUserId, sellerUserId), eq(offers.status, 'active')));
  if (sellerOffers.length === 0) { fail(`Seller has no active offers`); process.exit(2); }
  const matchingOffer = sellerOffers.find((o) => o.modelId === MODEL_ID) || sellerOffers[0];
  ok(`seller offer:     model=${matchingOffer.modelId} provider=${matchingOffer.provider} in=$${matchingOffer.priceIn}/M out=$${matchingOffer.priceOut}/M`);
  const effectiveModel = matchingOffer.modelId;
  if (effectiveModel !== MODEL_ID) info(`note: chosen seller doesn't offer ${MODEL_ID}, falling back to their listed model ${effectiveModel}`);

  // Verify the inf_ key belongs to this buyer
  const inferKey = process.env.E2E_API_KEY!.trim();
  if (!inferKey.startsWith('inf_')) { fail('E2E_API_KEY must start with inf_'); process.exit(2); }
  const hashed = await sha256Hex(inferKey);
  const [keyRow] = await db.select({ id: apiKeys.id, userId: apiKeys.userId })
    .from(apiKeys).where(and(eq(apiKeys.hashedSecret, hashed), isNull(apiKeys.revokedAt))).limit(1);
  if (!keyRow) { fail('inf_ key not found or revoked'); process.exit(2); }
  if (keyRow.userId !== buyerUserId) { fail(`inf_ key belongs to user ${keyRow.userId}, not buyer ${buyerUserId}`); process.exit(2); }
  ok(`inf_ key:         valid, owned by buyer`);

  /* ─────────────────────────────────────────────────────────────── */
  step(2, 'Check buyer wallet USDC balance');
  const conn = getConnection();
  const buyerAta = getAssociatedTokenAddressSync(USDC_MINT, buyerKp.publicKey);
  let buyerUsdcBefore = 0;
  try {
    const acc = await getAccount(conn, buyerAta);
    buyerUsdcBefore = Number(acc.amount) / 10 ** USDC_DECIMALS;
    ok(`wallet USDC:      ${buyerUsdcBefore.toFixed(6)}`);
  } catch {
    fail(`Buyer wallet has no USDC ATA / balance. Fund it first.`);
    process.exit(2);
  }
  if (buyerUsdcBefore < AMOUNT_USDC) { fail(`Insufficient USDC (${buyerUsdcBefore} < ${AMOUNT_USDC})`); process.exit(2); }

  /* ─────────────────────────────────────────────────────────────── */
  step(3, 'Build + sign credit-purchase transaction');
  const treasury = getTreasuryPublicKey();
  const sellerPk = new PublicKey(seller.wallet);

  const feeUi = +(AMOUNT_USDC * PLATFORM_FEE_RATE).toFixed(8);
  const sellerUi = +(AMOUNT_USDC - feeUi).toFixed(8);
  const sellerBase = uiToBaseUnits(sellerUi);
  const feeBase = uiToBaseUnits(feeUi);
  info(`split:            seller ${sellerUi} + fee ${feeUi} = ${AMOUNT_USDC} USDC`);

  const sellerAta = getAssociatedTokenAddressSync(USDC_MINT, sellerPk);
  const treasuryAta = getAssociatedTokenAddressSync(USDC_MINT, treasury);

  const ixs = [];
  if (!(await conn.getAccountInfo(sellerAta))) {
    ixs.push(createAssociatedTokenAccountInstruction(
      buyerKp.publicKey, sellerAta, sellerPk, USDC_MINT, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
    ));
    info(`creating seller ATA in this tx`);
  }
  if (!(await conn.getAccountInfo(treasuryAta))) {
    ixs.push(createAssociatedTokenAccountInstruction(
      buyerKp.publicKey, treasuryAta, treasury, USDC_MINT, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
    ));
    info(`creating treasury ATA in this tx`);
  }
  ixs.push(
    createTransferCheckedInstruction(buyerAta, USDC_MINT, sellerAta, buyerKp.publicKey, sellerBase, USDC_DECIMALS),
    createTransferCheckedInstruction(buyerAta, USDC_MINT, treasuryAta, buyerKp.publicKey, feeBase, USDC_DECIMALS),
  );

  const { blockhash } = await conn.getLatestBlockhash('confirmed');
  const tx = new Transaction({ feePayer: buyerKp.publicKey, recentBlockhash: blockhash }).add(...ixs);

  const t0 = Date.now();
  let sig: string;
  try {
    sig = await sendAndConfirmTransaction(conn, tx, [buyerKp], { commitment: 'confirmed' });
  } catch (e: any) {
    fail(`Tx failed: ${e?.message || e}`);
    process.exit(3);
  }
  ok(`signature:        ${sig}`);
  ok(`solscan:          ${solscan(sig)}`);
  ok(`confirmed in:     ${Date.now() - t0}ms`);

  /* ─────────────────────────────────────────────────────────────── */
  step(4, 'Verify on-chain settlement matches the quote');
  try {
    const verify = await verifyCreditPurchase({
      txHash: sig,
      buyerWallet: buyerWalletStr,
      sellerWallet: seller.wallet,
      treasuryWallet: treasury.toBase58(),
      expectedSellerBase: sellerBase,
      expectedFeeBase: feeBase,
    });
    ok(`slot:             ${verify.slot}`);
  } catch (e: any) {
    fail(`verifyCreditPurchase failed: ${e?.message || e}`);
    process.exit(4);
  }

  /* ─────────────────────────────────────────────────────────────── */
  step(5, 'Record credit_purchase + credit balance');
  const existing = await db.select({ id: creditPurchases.id }).from(creditPurchases).where(eq(creditPurchases.txHash, sig)).limit(1);
  if (existing.length) {
    info(`already recorded for this tx hash (skipping insert)`);
  } else {
    await db.insert(creditPurchases).values({
      buyerUserId,
      sellerUserId,
      txHash: sig,
      amountUsdc: AMOUNT_USDC.toFixed(8),
      sellerReceivedUsdc: sellerUi.toFixed(8),
      feeUsdc: feeUi.toFixed(8),
      confirmedAt: new Date(),
    });
    await creditTopUp(buyerUserId, sellerUserId, AMOUNT_USDC);
    ok(`credit_purchases inserted`);
  }
  const balAfter = await getCreditBalance(buyerUserId, sellerUserId);
  ok(`credit balance:   $${balAfter.toFixed(6)} with seller`);

  /* ─────────────────────────────────────────────────────────────── */
  step(6, `Call /v1/chat/completions on ${effectiveModel}`);
  const t1 = Date.now();
  const res = await fetch(`${BASE_URL}/api/inference/v1/chat/completions`, {
    method: 'POST',
    headers: { 'authorization': `Bearer ${inferKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: effectiveModel,
      messages: [{ role: 'user', content: 'Reply with the single word "ok".' }],
      stream: false,
    }),
  });
  const bodyTxt = await res.text();
  info(`status:           ${res.status}`);
  info(`latency:          ${Date.now() - t1}ms`);
  if (!res.ok) {
    fail(`upstream error: ${bodyTxt.slice(0, 500)}`);
    process.exit(5);
  }
  let parsed: any = null;
  try { parsed = JSON.parse(bodyTxt); } catch { fail('non-JSON response'); console.log(bodyTxt); process.exit(5); }
  const content = parsed?.choices?.[0]?.message?.content || '';
  const usage = parsed?.usage;
  ok(`response:         "${content.trim()}"`);
  if (usage) ok(`tokens:           in=${usage.prompt_tokens} out=${usage.completion_tokens}`);

  /* ─────────────────────────────────────────────────────────────── */
  step(7, 'Confirm credit was debited');
  // Wait a beat for the meter helper to insert + debit (fire-and-forget)
  await new Promise((r) => setTimeout(r, 1200));
  const balFinal = await getCreditBalance(buyerUserId, sellerUserId);
  const debit = balAfter - balFinal;
  ok(`balance now:      $${balFinal.toFixed(6)}`);
  ok(`debited:          $${debit.toFixed(6)}`);

  console.log(`\n\x1b[1;32mAll steps passed.\x1b[0m`);
  console.log(`tx:     ${solscan(sig)}`);
  console.log(`buyer:  $${AMOUNT_USDC.toFixed(2)} USDC → -$${(buyerUsdcBefore - (buyerUsdcBefore - AMOUNT_USDC)).toFixed(2)}`);
  console.log(`credit: $${balFinal.toFixed(6)} remaining with seller`);
  process.exit(0);
}

main().catch((e) => { console.error('\n\x1b[31mFatal:\x1b[0m', e); process.exit(99); });
