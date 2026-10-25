import { DatabaseSync } from 'node:sqlite';
import { Pool, type PoolClient } from 'pg';
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
export type DbRow = Record<string, unknown>;
export interface Database {
  all<T = DbRow>(sql: string, params?: unknown[]): Promise<T[]>;
  run(sql: string, params?: unknown[]): Promise<{ changes: number }>;
  exec(sql: string): Promise<void>;
}
let sqlite: DatabaseSync | undefined;
let pool: Pool | undefined;
let queue: Promise<unknown> = Promise.resolve();
function serializeSqlite<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.then(operation);
  queue = result.catch(() => {});
  return result;
}
function postgresSql(sql: string) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}
function adaptPg(client: Pool | PoolClient): Database {
  return {
    async all<T>(s: string, p: unknown[] = []) {
      return (await client.query(postgresSql(s), p)).rows as T[];
    },
    async run(s, p = []) {
      const r = await client.query(postgresSql(s), p);
      return { changes: r.rowCount || 0 };
    },
    async exec(s) {
      await client.query(s);
    },
  };
}
export function connection(): Database {
  if (process.env.DATABASE_URL) {
    pool ??= new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    });
    return adaptPg(pool);
  }
  const db = sqliteConnection();
  // Standalone reads and writes must not join another request's open transaction.
  return {
    all: <T>(sql: string, params?: unknown[]) => serializeSqlite(() => db.all<T>(sql, params)),
    run: (sql, params) => serializeSqlite(() => db.run(sql, params)),
    exec: (sql) => serializeSqlite(() => db.exec(sql)),
  };
}
function sqliteConnection(): Database {
  if (!sqlite) {
    const path = process.env.SQLITE_PATH || resolve('data/reversetrip.sqlite');
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    sqlite = new DatabaseSync(path);
    sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  }
  const db = sqlite;
  return {
    async all<T>(s: string, p: unknown[] = []) {
      return db
        .prepare(s)
        .all(...(p as (string | number | null)[]))
        .map((row) => ({ ...row })) as T[];
    },
    async run(s, p = []) {
      const r = db.prepare(s).run(...(p as (string | number | null)[]));
      return { changes: Number(r.changes) };
    },
    async exec(s) {
      db.exec(s);
    },
  };
}
export function transaction<T>(fn: (db: Database) => Promise<T>): Promise<T> {
  if (process.env.DATABASE_URL) {
    connection();
    return (async () => {
      const c = await pool!.connect();
      try {
        await c.query('BEGIN');
        const result = await fn(adaptPg(c));
        await c.query('COMMIT');
        return result;
      } catch (e) {
        await c.query('ROLLBACK');
        throw e;
      } finally {
        c.release();
      }
    })();
  }
  return serializeSqlite(async () => {
    const db = sqliteConnection();
    await db.exec('BEGIN IMMEDIATE');
    try {
      const result = await fn(db);
      await db.exec('COMMIT');
      return result;
    } catch (e) {
      await db.exec('ROLLBACK');
      throw e;
    }
  });
}
let initialized: Promise<void> | undefined;
export function ensureDatabase() {
  initialized ??= (async () => {
    if (!isDemo()) {
      const origin = process.env.APP_ORIGIN;
      if (!origin || !origin.startsWith('https://'))
        throw new Error('Production requires an explicit HTTPS APP_ORIGIN.');
    }
    await transaction(async (db) => {
      await db.exec(
        'CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)',
      );
      for (const file of readdirSync(resolve('migrations'))
        .filter((f) => /^\d+.*\.sql$/.test(f))
        .sort()) {
        if (
          !(await db.all('SELECT version FROM schema_migrations WHERE version=?', [file])).length
        ) {
          await db.exec(readFileSync(resolve('migrations', file), 'utf8'));
          await db.run('INSERT INTO schema_migrations(version,applied_at) VALUES (?,?)', [
            file,
            new Date().toISOString(),
          ]);
        }
      }
      const mode = isDemo() ? 'demo' : 'production';
      const [environment] = await db.all<{ mode: string }>(
        'SELECT mode FROM app_environment WHERE id=?',
        ['singleton'],
      );
      if (environment && environment.mode !== mode)
        throw new Error(
          'Database environment mismatch. Use a dedicated database for demo or production.',
        );
      if (
        !environment &&
        mode === 'production' &&
        (await db.all('SELECT id FROM activities WHERE demo=1 LIMIT 1')).length
      )
        throw new Error('Refusing to open demo data in production mode.');
      await db.run('INSERT INTO app_environment(id,mode) VALUES (?,?) ON CONFLICT(id) DO NOTHING', [
        'singleton',
        mode,
      ]);
      const { seedDatabase } = await import('./seed');
      await seedDatabase(db);
    });
  })();
  return initialized;
}
export function isDemo() {
  return process.env.APP_MODE !== 'production';
}
export async function closeDatabase() {
  await queue;
  sqlite?.close();
  sqlite = undefined;
  if (pool) await pool.end();
  pool = undefined;
  initialized = undefined;
}
