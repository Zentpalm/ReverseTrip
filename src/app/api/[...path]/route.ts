import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import {
  SESSION_COOKIE,
  login,
  logout,
  register,
  requireUser,
  sessionUser,
  rateLimit,
  digest,
} from '@/server/auth';
import { getCatalog } from '@/server/catalog';
import { connection, ensureDatabase } from '@/server/db';
import { AppError, check } from '@/server/errors';
import * as service from '@/server/services';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function handle(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const path = (await params).path.join('/'),
      method = request.method;
    if (!['GET', 'HEAD'].includes(method)) {
      const origin = request.headers.get('origin');
      const expected = process.env.APP_ORIGIN || request.nextUrl.origin;
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
      check(
        origin &&
          (origin === expected || (!process.env.APP_ORIGIN && new URL(origin).host === host)),
        'invalid_origin',
        403,
      );
      check(
        request.headers.get('content-type')?.includes('application/json'),
        'invalid_input',
        415,
      );
      check(Number(request.headers.get('content-length') || 0) < 65536, 'invalid_input', 413);
    }
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const body =
      method === 'GET'
        ? null
        : JSON.parse(
            await request.text().then((t) => {
              check(t.length < 65536, 'invalid_input', 413);
              return t;
            }),
          );
    const ok = (data: unknown) =>
      NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
    if (path === 'catalog' && method === 'GET') return ok(await getCatalog());
    if (path === 'auth/me' && method === 'GET') return ok({ user: await sessionUser(token) });
    if (['auth/login', 'auth/register'].includes(path) && method === 'POST') {
      const address = request.headers.get('x-forwarded-for')?.split(',')[0] || 'local';
      await rateLimit('auth-ip:' + digest(address), 40, 15 * 60000);
      const result = path === 'auth/login' ? await login(body) : await register(body);
      const r = ok({ user: result.user });
      r.cookies.set(SESSION_COOKIE, result.token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.SESSION_SECURE === 'true' || process.env.APP_MODE === 'production',
        path: '/',
        maxAge: 7 * 86400,
      });
      return r;
    }
    if (path === 'auth/logout' && method === 'POST') {
      await logout(token);
      const r = ok({ ok: true });
      r.cookies.delete(SESSION_COOKIE);
      return r;
    }
    if (path === 'quote' && method === 'POST') return ok(await service.quote(body));
    const user = await requireUser(token);
    if (path === 'trip' && method === 'GET') return ok(await service.loadTrip(user));
    if (path === 'trip' && method === 'PUT') return ok(await service.saveTrip(user, body));
    if (path === 'bookings' && method === 'GET') return ok(await service.myBookings(user));
    if (path === 'bookings' && method === 'POST') {
      await rateLimit('booking:' + user.id, 20, 3600000);
      return ok(await service.createBooking(user, body));
    }
    if (path === 'bookings/items' && method === 'PATCH')
      return ok(await service.changeBookingItem(user, body));
    if (path === 'community' && method === 'POST')
      return ok(await service.registerCommunity(user, body));
    if (path === 'host' && method === 'GET') return ok(await service.hostData(user));
    if (path === 'host/activities' && method === 'POST')
      return ok(await service.saveActivity(user, body));
    if (path === 'host/sessions' && method === 'POST')
      return ok(await service.addSession(user, body));
    if (path === 'host/sessions' && method === 'DELETE')
      return ok(await service.closeSession(user, body));
    if (path === 'admin' && method === 'GET') return ok(await service.adminData(user));
    if (path === 'admin/verify' && method === 'PATCH')
      return ok(await service.verifyCommunity(user, body));
    if (path === 'profile' && method === 'PATCH') {
      const p = z.object({ name: z.string().trim().min(2).max(100) }).parse(body);
      await ensureDatabase();
      await connection().run('UPDATE users SET name=? WHERE id=?', [p.name, user.id]);
      return ok({ user: { ...user, name: p.name } });
    }
    throw new AppError('not_found', 404);
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.code }, { status: e.status });
    if (e instanceof ZodError || e instanceof SyntaxError)
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
    console.error('Request failed:', e instanceof Error ? e.message : 'unknown');
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
export const GET = handle,
  POST = handle,
  PUT = handle,
  PATCH = handle,
  DELETE = handle;
