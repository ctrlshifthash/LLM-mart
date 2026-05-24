import { pgTable, uuid, text, timestamp, numeric, integer, bigint, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  privyDid: text('privy_did').notNull().unique(),
  walletAddress: text('wallet_address'),
  email: text('email'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  prefix: text('prefix').default('inf_').notNull(),
  hashedSecret: text('hashed_secret').notNull().unique(),
  name: text('name'),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userIdx: index('api_keys_user_idx').on(t.userId),
}));

export const offers = pgTable('offers', {
  id: uuid('id').primaryKey().defaultRandom(),
  sellerUserId: uuid('seller_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  modelId: text('model_id').notNull(),
  modality: text('modality').default('text').notNull(),
  priceInPerMUsdc: numeric('price_in_per_m_usdc', { precision: 20, scale: 8 }).notNull(),
  priceOutPerMUsdc: numeric('price_out_per_m_usdc', { precision: 20, scale: 8 }).notNull(),
  upstreamProvider: text('upstream_provider').notNull(),
  upstreamKeyEncrypted: text('upstream_key_encrypted').notNull(),
  maxDailyCapacityUsdc: numeric('max_daily_capacity_usdc', { precision: 20, scale: 8 }).notNull(),
  status: text('status').default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  routeIdx: index('offers_route_idx').on(t.modelId, t.status, t.priceInPerMUsdc),
  sellerIdx: index('offers_seller_idx').on(t.sellerUserId),
}));

export const requests = pgTable('requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  buyerUserId: uuid('buyer_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  apiKeyId: uuid('api_key_id').references(() => apiKeys.id, { onDelete: 'set null' }),
  offerId: uuid('offer_id').references(() => offers.id, { onDelete: 'set null' }),
  modelId: text('model_id').notNull(),
  tokensIn: integer('tokens_in').default(0).notNull(),
  tokensOut: integer('tokens_out').default(0).notNull(),
  buyerChargeUsdc: numeric('buyer_charge_usdc', { precision: 20, scale: 8 }).default('0').notNull(),
  sellerPayoutUsdc: numeric('seller_payout_usdc', { precision: 20, scale: 8 }).default('0').notNull(),
  platformFeeUsdc: numeric('platform_fee_usdc', { precision: 20, scale: 8 }).default('0').notNull(),
  directApiCostUsdc: numeric('direct_api_cost_usdc', { precision: 20, scale: 8 }).default('0').notNull(),
  latencyMs: integer('latency_ms').default(0).notNull(),
  status: text('status').default('ok').notNull(),
  error: text('error'),
  routeSource: text('route_source').default('marketplace').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  buyerIdx: index('requests_buyer_idx').on(t.buyerUserId, t.createdAt),
}));

export const ledger = pgTable('ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),
  amountUsdc: numeric('amount_usdc', { precision: 20, scale: 8 }).notNull(),
  requestId: uuid('request_id').references(() => requests.id, { onDelete: 'set null' }),
  txHash: text('tx_hash'),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userIdx: index('ledger_user_idx').on(t.userId, t.createdAt),
}));

export const routerConfig = pgTable('router_config', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  priorityProvider: text('priority_provider'),
  priorityKeyEncrypted: text('priority_key_encrypted'),
  fallbackProvider: text('fallback_provider'),
  fallbackKeyEncrypted: text('fallback_key_encrypted'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const deposits = pgTable('deposits', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  txHash: text('tx_hash').notNull().unique(),
  amountUsdc: numeric('amount_usdc', { precision: 20, scale: 8 }).notNull(),
  blockNumber: bigint('block_number', { mode: 'number' }),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const modelPricing = pgTable('model_pricing', {
  modelId: text('model_id').primaryKey(),
  promptUsd: numeric('prompt_usd', { precision: 20, scale: 10 }).notNull(),
  completionUsd: numeric('completion_usd', { precision: 20, scale: 10 }).notNull(),
  contextLength: integer('context_length').default(0).notNull(),
  modality: text('modality').default('text').notNull(),
  name: text('name'),
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
