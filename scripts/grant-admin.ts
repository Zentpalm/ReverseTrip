import './load-env';
import { ensureDatabase, transaction, closeDatabase } from '../src/server/db';
const email = process.argv[2]?.trim().toLowerCase();
if (!email) throw new Error('Usage: npm run admin:grant -- your-registered-email');
await ensureDatabase();
await transaction(async (db) => {
  const r = await db.run("UPDATE users SET role='admin' WHERE email=?", [email]);
  if (!r.changes) throw new Error('Register this account first.');
});
console.log('Administrator role assigned to the existing local account.');
await closeDatabase();
