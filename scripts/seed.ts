import './load-env';
import { ensureDatabase, closeDatabase, isDemo } from '../src/server/db';
if (!isDemo()) throw new Error('Demo seed is disabled in production mode.');
await ensureDatabase();
console.log('Demo catalog ready. No usable account passwords were seeded.');
await closeDatabase();
