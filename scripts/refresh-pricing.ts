import 'dotenv/config';
import { persistPricing } from '../src/lib/pricing';

(async () => {
  const n = await persistPricing();
  console.log(`refreshed pricing for ${n} models`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
