import {
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
  createHash,
  randomUUID,
} from 'node:crypto';
import { promisify } from 'node:util';
import { connection, ensureDatabase, transaction } from './db';
import { AppError, check } from './errors';
import { loginSchema, registerSchema } from '../lib/validation';
import type { Role, User } from '../lib/types';
const scrypt = promisify(scryptCb);
export const SESSION_COOKIE = 'reversetrip_session';
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}
async function verifyPassword(password: string, stored: string) {
  const [salt, hex] = stored.split(':');
  if (!salt || !hex) {
    await scrypt(password, 'dummy-timing-salt', 64);
    return false;
  }
  const key = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hex, 'hex');
  return key.length === expected.length && timingSafeEqual(key, expected);
}
export const digest = (s: string) => createHash('sha256').update(s).digest('hex');
export async function rateLimit(key: string, limit: number, windowMs: number) {
  await ensureDatabase();
  await transaction(async (db) => {
    const now = Date.now();
    const [r] = await db.all<{ attempts: number; reset_at: number }>(
      'SELECT attempts,reset_at FROM rate_limits WHERE key=?',
      [key],
    );
    if (r && Number(r.reset_at) > now) {
      if (r.attempts >= limit) throw new AppError('rate_limit', 429);
      await db.run('UPDATE rate_limits SET attempts=attempts+1 WHERE key=?', [key]);
    } else
      await db.run(
        'INSERT INTO rate_limits(key,attempts,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=1,reset_at=excluded.reset_at',
        [key, now + windowMs],
      );
  });
}
export async function sessionUser(token?: string): Promise<User | null> {
  if (!token) return null;
  await ensureDatabase();
  const [u] = await connection().all<User>(
    'SELECT u.id,u.email,u.name,u.role FROM users u JOIN auth_sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?',
    [digest(token), Date.now()],
  );
  return u || null;
}
export async function requireUser(token?: string, roles?: Role[]) {
  const u = await sessionUser(token);
  check(u, 'unauthorized', 401);
  if (roles) check(roles.includes(u.role), 'forbidden', 403);
  return u;
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  await connection().run(
    'INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES (?,?,?)',
    [digest(token), userId, Date.now() + 7 * 86400000],
  );
  return token;
}
export async function register(input: unknown) {
  const p = registerSchema.parse(input);
  await ensureDatabase();
  await rateLimit('register:' + digest(p.email), 4, 3600000);
  check(
    !(await connection().all('SELECT id FROM users WHERE email=?', [p.email])).length,
    'email_exists',
    409,
  );
  const user: User = { id: randomUUID(), name: p.name, email: p.email, role: 'traveler' };
  const hashed = await hashPassword(p.password);
  try {
    await connection().run(
      'INSERT INTO users(id,email,name,password_hash,role,created_at) VALUES (?,?,?,?,?,?)',
      [user.id, p.email, p.name, hashed, user.role, new Date().toISOString()],
    );
  } catch {
    throw new AppError('email_exists', 409);
  }
  return { user, token: await createSession(user.id) };
}
export async function login(input: unknown) {
  const p = loginSchema.parse(input);
  await ensureDatabase();
  await rateLimit('login:' + digest(p.email), 10, 15 * 60000);
  const [u] = await connection().all<User & { password_hash: string }>(
    'SELECT id,email,name,role,password_hash FROM users WHERE email=?',
    [p.email],
  );
  const valid = await verifyPassword(p.password, u?.password_hash || 'disabled');
  check(u && valid, 'invalid_login', 401);
  const { password_hash: _, ...user } = u;
  void _;
  return { user, token: await createSession(user.id) };
}
export async function logout(token?: string) {
  if (token)
    await connection().run('DELETE FROM auth_sessions WHERE token_hash=?', [digest(token)]);
}
