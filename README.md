# LLM Mart — Inference Resale Marketplace

A marketplace where buyers mint API keys, buy USDC credits from sellers (paid direct to the seller's Solana wallet, 10% to treasury, in one signed tx), and call an OpenAI-compatible endpoint that routes each request to whichever seller offers the cheapest live capacity for the requested model. Sellers resell their leftover credit from OpenRouter, Venice AI, or Uncensored AI at a markup over cost but well below sticker.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind v4
- Drizzle ORM + Postgres
- Privy for auth + Solana embedded wallets
- `@solana/web3.js` + `@solana/spl-token` for USDC settlement
- OpenRouter as the default upstream
- Vercel-ready. Inference endpoint runs on Edge runtime; everything else on Node.

## Setup

1. `cp .env.example .env.local`
2. Fill in:
   - `DATABASE_URL` — a Postgres connection string (Neon recommended)
   - `NEXT_PUBLIC_PRIVY_APP_ID` + `PRIVY_APP_SECRET` — from [Privy dashboard](https://dashboard.privy.io)
   - `OPENROUTER_API_KEY`
   - `TREASURY_PRIVATE_KEY` + `NEXT_PUBLIC_TREASURY_ADDRESS` — `pnpm gen-keypair` generates a fresh dev keypair
   - `MASTER_ENCRYPTION_KEY` — 32-byte base64, generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
3. `pnpm install`
4. `pnpm db:push`
5. `pnpm seed` — creates the platform user + 10 sample offers using `OPENROUTER_API_KEY` as the upstream
6. `pnpm dev`

## Key paths

- `src/app/api/inference/v1/chat/completions/route.ts` — Edge endpoint, OpenAI-compatible
- `src/lib/router.ts` — priority -> marketplace -> fallback routing
- `src/lib/meter.ts` — token counting + ledger debit/credit/fee
- `src/lib/chain.ts` — Solana RPC helpers (deposits, withdrawals, USDC verify)
- `src/lib/db/schema.ts` — Drizzle schema
- `drizzle/` — generated migrations

## Devnet end-to-end test

1. Sign in at `/buy` with email or Solana wallet
2. Hit a Circle devnet USDC faucet to fund your wallet
3. Deposit some USDC to the treasury via the Fund panel
4. Mint an `inf_…` key
5. `export E2E_API_KEY=inf_…` then `pnpm tsx scripts/test-e2e.ts`
6. Watch the savings dashboard fill in

## Notes

- The brief specified Base (EVM); the user requested Solana, so the entire wallet layer uses `@solana/web3.js` instead of viem. Deposits are a single signed SPL transfer (no approve+transferFrom).
- Internal helper endpoints live under `/api/internal/inference-helper/*` and are gated by an `x-internal` shared secret so they're only callable by the Edge inference route.
- Modalities other than text are greyed in the UI per the brief.
