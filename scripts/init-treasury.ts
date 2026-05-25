import { config } from 'dotenv';
config({ path: '.env.local' });
config();

async function main() {
  const { getOrCreateAssociatedTokenAccount, getAccount } = await import('@solana/spl-token');
  const { getConnection, getTreasuryKeypair, USDC_MINT, getTreasuryPublicKey } = await import('../src/lib/chain');

  const conn = getConnection();
  const payer = getTreasuryKeypair();
  const owner = getTreasuryPublicKey();

  console.log('treasury wallet:', owner.toBase58());

  const lamports = await conn.getBalance(owner);
  const sol = lamports / 1_000_000_000;
  console.log(`treasury SOL balance: ${sol.toFixed(6)} SOL`);
  if (sol < 0.003) {
    console.error(`treasury needs ~0.003 SOL to create its USDC ATA. Send some SOL to ${owner.toBase58()} and retry.`);
    process.exit(1);
  }

  console.log('ensuring treasury USDC ATA exists…');
  const ata = await getOrCreateAssociatedTokenAccount(conn, payer, USDC_MINT, owner);
  console.log('treasury USDC ATA:', ata.address.toBase58());

  const acc = await getAccount(conn, ata.address);
  console.log(`current USDC balance: ${Number(acc.amount) / 1_000_000} USDC`);
  console.log('done — buyers no longer pay the 0.00203 SOL rent for first-time deposits.');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
