import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const url = process.env.DATABASE_URL;
if (!url) {
  console.warn('[db] DATABASE_URL not set — DB operations will fail at runtime');
}

const client = postgres(url || 'postgres://placeholder', { prepare: false, max: 5 });
export const db = drizzle(client, { schema });
export { schema };
