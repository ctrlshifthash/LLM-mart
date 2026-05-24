import 'dotenv/config';
import { db } from '../src/lib/db';
import { users, offers } from '../src/lib/db/schema';
import { encrypt } from '../src/lib/crypto';
import { eq } from 'drizzle-orm';

const PLATFORM_USER_ID = process.env.PLATFORM_USER_ID || '00000000-0000-0000-0000-000000000001';
const PLATFORM_PRIVY_DID = 'did:privy:platform';

const SAMPLE = [
  { modelId: 'openai/gpt-4.1-mini', priceIn: '0.10', priceOut: '0.30' },
  { modelId: 'openai/gpt-4.1', priceIn: '1.00', priceOut: '4.00' },
  { modelId: 'anthropic/claude-3.5-sonnet', priceIn: '1.50', priceOut: '7.50' },
  { modelId: 'anthropic/claude-3.5-haiku', priceIn: '0.25', priceOut: '1.25' },
  { modelId: 'google/gemini-2.5-flash', priceIn: '0.05', priceOut: '0.20' },
  { modelId: 'google/gemini-2.5-pro', priceIn: '0.75', priceOut: '3.00' },
  { modelId: 'meta-llama/llama-3.3-70b-instruct', priceIn: '0.08', priceOut: '0.30' },
  { modelId: 'deepseek/deepseek-chat', priceIn: '0.04', priceOut: '0.12' },
  { modelId: 'mistralai/mistral-large', priceIn: '0.70', priceOut: '2.00' },
  { modelId: 'qwen/qwen-2.5-72b-instruct', priceIn: '0.12', priceOut: '0.40' },
];

async function main() {
  const existing = await db.select().from(users).where(eq(users.privyDid, PLATFORM_PRIVY_DID));
  let platformId = existing[0]?.id;
  if (!platformId) {
    const ins = await db
      .insert(users)
      .values({ id: PLATFORM_USER_ID, privyDid: PLATFORM_PRIVY_DID, email: 'platform@surplus.local' })
      .returning({ id: users.id });
    platformId = ins[0].id;
    console.log('platform user created', platformId);
  } else {
    console.log('platform user exists', platformId);
  }

  const upstreamKey = process.env.OPENROUTER_API_KEY;
  if (!upstreamKey) {
    console.error('OPENROUTER_API_KEY not set — cannot seed offers');
    process.exit(1);
  }
  const enc = await encrypt(upstreamKey);

  for (const s of SAMPLE) {
    await db.insert(offers).values({
      sellerUserId: platformId,
      modelId: s.modelId,
      modality: 'text',
      priceInPerMUsdc: s.priceIn,
      priceOutPerMUsdc: s.priceOut,
      upstreamProvider: 'openrouter',
      upstreamKeyEncrypted: enc,
      maxDailyCapacityUsdc: '100',
      status: 'active',
    });
    console.log('seeded', s.modelId);
  }
  console.log('done');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
