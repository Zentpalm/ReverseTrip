import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GET, POST, PATCH } from '../src/app/api/[...path]/route';
import { closeDatabase, connection, ensureDatabase } from '../src/server/db';
import { digest } from '../src/server/auth';
import { emptyTrip } from '../src/lib/trip';
const dir = mkdtempSync(join(tmpdir(), 'reversetrip-api-'));
process.env.SQLITE_PATH = join(dir, 'test.sqlite');
process.env.APP_MODE = 'demo';
delete process.env.DATABASE_URL;
let cookie = '';
const credentials = {
  name: 'API Test User',
  email: 'api-test@example.invalid',
  password: 'A-strong-test-password',
  consent: true,
};
async function request(
  path: string,
  method = 'GET',
  body?: unknown,
  options: { cookie?: string; origin?: string; contentType?: string } = {},
) {
  const headers: Record<string, string> = {};
  if (options.cookie) headers.cookie = options.cookie;
  if (method !== 'GET') {
    headers.origin = options.origin ?? 'http://localhost';
    headers['content-type'] = options.contentType || 'application/json';
  }
  const r = new NextRequest('http://localhost/api/' + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const handler = method === 'GET' ? GET : method === 'PATCH' ? PATCH : POST;
  return handler(r, { params: Promise.resolve({ path: path.split('/') }) });
}
beforeAll(async () => {
  await ensureDatabase();
});
afterAll(async () => {
  await closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});
describe('HTTP route contracts', () => {
  it('rejects cross-origin writes before authentication', async () => {
    const r = await request('auth/register', 'POST', credentials, {
      origin: 'https://untrusted.example',
    });
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ error: 'invalid_origin' });
  });
  it('returns translated error codes for invalid JSON content type', async () => {
    const r = await request('auth/register', 'POST', credentials, { contentType: 'text/plain' });
    expect(r.status).toBe(415);
  });
  it('registers a traveler and issues HttpOnly SameSite cookies with no password in response', async () => {
    const r = await request('auth/register', 'POST', { ...credentials, role: 'admin' });
    expect(r.status).toBe(200);
    const setCookie = r.headers.get('set-cookie')!;
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toMatch(/SameSite=lax/i);
    cookie = setCookie.split(';')[0];
    const data = await r.json();
    expect(data.user.role).toBe('traveler');
    expect(data.user).not.toHaveProperty('password_hash');
    expect(data).not.toHaveProperty('token');
  });
  it('returns the authenticated session from a server cookie', async () => {
    const r = await request('auth/me', 'GET', undefined, { cookie });
    expect((await r.json()).user.email).toBe(credentials.email);
  });
  it('protects private data and administrator APIs', async () => {
    expect((await request('bookings')).status).toBe(401);
    expect((await request('admin', 'GET', undefined, { cookie })).status).toBe(403);
    expect((await request('host', 'GET', undefined, { cookie })).status).toBe(403);
  });
  it('profile updates cannot grant roles', async () => {
    const r = await request(
      'profile',
      'PATCH',
      { name: 'Updated User', role: 'admin' },
      { cookie },
    );
    expect(r.status).toBe(200);
    expect((await r.json()).user.role).toBe('traveler');
  });
  it('public catalog is usable without login and has no private community verification details', async () => {
    const r = await request('catalog');
    expect(r.status).toBe(200);
    const c = await r.json();
    expect(c.activities).toHaveLength(6);
    expect(c.communities[0]).not.toHaveProperty('verification_info');
  });
  it('quotes from server catalog rather than trusting submitted totals', async () => {
    const r = await request('quote', 'POST', {
      ...emptyTrip(),
      items: [{ activityId: 'cooking', sessionId: '', participants: 2 }],
      totalSatang: 1,
    });
    expect(r.status).toBe(200);
    expect((await r.json()).totals.totalSatang).toBe(170000);
  });
  it('sets no-store on personalized responses', async () => {
    const r = await request('auth/me', 'GET', undefined, { cookie });
    expect(r.headers.get('cache-control')).toBe('no-store');
  });
  it('rejects expired sessions', async () => {
    await connection().run('UPDATE auth_sessions SET expires_at=? WHERE token_hash=?', [
      Date.now() - 1000,
      digest(cookie.split('=')[1]),
    ]);
    expect((await request('bookings', 'GET', undefined, { cookie })).status).toBe(401);
  });
});
