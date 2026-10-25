import './load-env';
import { ensureDatabase, closeDatabase } from '../src/server/db';
await ensureDatabase();
console.log('Schema ready. Demo seed is enabled only when APP_MODE is not production.');
await closeDatabase();
