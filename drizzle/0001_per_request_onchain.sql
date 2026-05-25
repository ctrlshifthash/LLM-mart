ALTER TABLE "requests" ADD COLUMN "settlement_tx_hash" text;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "payer_wallet" text;--> statement-breakpoint
CREATE UNIQUE INDEX "requests_settlement_tx_uniq" ON "requests" USING btree ("settlement_tx_hash");
