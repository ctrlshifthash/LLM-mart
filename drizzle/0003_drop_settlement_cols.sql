DROP INDEX IF EXISTS "requests_settlement_tx_uniq";--> statement-breakpoint
ALTER TABLE "requests" DROP COLUMN IF EXISTS "settlement_tx_hash";--> statement-breakpoint
ALTER TABLE "requests" DROP COLUMN IF EXISTS "payer_wallet";
