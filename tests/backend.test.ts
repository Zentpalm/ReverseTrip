import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { ensureDatabase, connection, closeDatabase, transaction } from '../src/server/db';
import { register, login, logout, sessionUser, requireUser } from '../src/server/auth';
import { getCatalog } from '../src/server/catalog';
import * as service from '../src/server/services';
import { emptyTrip, addDays, bangkokDate } from '../src/lib/trip';
import type { Activity, Trip, User } from '../src/lib/types';
const directory = mkdtempSync(join(tmpdir(), 'reversetrip-test-'));
process.env.SQLITE_PATH = join(directory, 'test.sqlite');
process.env.APP_MODE = 'demo';
delete process.env.DATABASE_URL;
let traveler: User, other: User, host: User, admin: User, activities: Activity[];
const password = 'Test-only-long-password!';
const credentials = (name: string) => ({
  name,
  email: `${name.replaceAll(' ', '-').toLowerCase()}@example.invalid`,
  password,
  consent: true,
});
const payload = (trip: Trip) => ({
  trip,
  requestKey: randomUUID(),
  contactName: 'Demo Traveler',
  contactEmail: 'traveler@example.invalid',
  contactPhone: '0800000000',
  consent: true,
});
function oneTrip(a: Activity, participants = 1, day = 8): Trip {
  const s = a.sessions[day];
  return {
    ...emptyTrip(),
    startDate: s.starts_at.slice(0, 10),
    endDate: s.starts_at.slice(0, 10),
    items: [{ activityId: a.id, sessionId: s.id, participants }],
  };
}
beforeAll(async () => {
  await ensureDatabase();
  traveler = (await register(credentials('Traveler Test'))).user;
  other = (await register(credentials('Other Test'))).user;
  host = (await register(credentials('Host Test'))).user;
  admin = (await register(credentials('Admin Test'))).user;
  await connection().run("UPDATE users SET role='admin' WHERE id=?", [admin.id]);
  admin = { ...admin, role: 'admin' };
  activities = (await getCatalog()).activities;
});
afterAll(async () => {
  await closeDatabase();
  rmSync(directory, { recursive: true, force: true });
});
describe('Authentication and authorization', () => {
  it('returns plain serializable objects for React server-to-client rendering', async () => {
    const catalog = await getCatalog();
    expect(Object.getPrototypeOf(catalog.communities[0])).toBe(Object.prototype);
    expect(Object.getPrototypeOf(catalog.activities[0].sessions[0])).toBe(Object.prototype);
  });
  it('stores a salted hash and returns a revocable server session', async () => {
    const result = await login(credentials('Traveler Test'));
    expect(await sessionUser(result.token)).toMatchObject({ id: traveler.id });
    const [row] = await connection().all<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id=?',
      [traveler.id],
    );
    expect(row.password_hash).not.toContain(password);
    expect(row.password_hash).toContain(':');
    await logout(result.token);
    expect(await sessionUser(result.token)).toBe(null);
  });
  it('rejects invalid passwords, missing sessions and unprivileged admin access', async () => {
    await expect(login({ ...credentials('Traveler Test'), password: 'wrong' })).rejects.toThrow(
      'invalid_login',
    );
    await expect(requireUser('forged')).rejects.toThrow('unauthorized');
    await expect(service.adminData(traveler)).rejects.toThrow('forbidden');
  });
  it('rejects invalid registration input', async () => {
    await expect(register({ ...credentials('Bad Test'), password: '123' })).rejects.toThrow();
  });
  it('persists trip data and rejects stale edits', async () => {
    const t = oneTrip(activities[0]);
    expect(await service.saveTrip(traveler, { trip: t, revision: 0 })).toEqual({ revision: 1 });
    expect((await service.loadTrip(traveler))?.trip).toEqual(t);
    expect(await service.loadTrip(other)).toBe(null);
    await expect(service.saveTrip(traveler, { trip: t, revision: 0 })).rejects.toThrow(
      'trip_conflict',
    );
  });
});
describe('Authoritative booking and inventory', () => {
  it('reprices on server, holds capacity and deduplicates repeated submissions', async () => {
    const a = activities.find((a) => a.id === 'cooking')!,
      t = oneTrip(a, 2),
      p = payload(t);
    const first = await service.createBooking(traveler, {
      ...p,
      totalSatang: 1,
      discountSatang: 999999,
    });
    const second = await service.createBooking(traveler, p);
    expect(second.id).toBe(first.id);
    const third = await service.createBooking(traveler, { ...p, requestKey: randomUUID() });
    expect(third.id).toBe(first.id);
    const bookings = await service.myBookings(traveler),
      b = bookings.find((b) => b.id === first.id)!;
    expect(b.totals.totalSatang).toBe(a.price_satang * 2);
    expect(b.payment_status).toBe('not_collected');
    const [s] = await connection().all<{ reserved: number }>(
      'SELECT reserved FROM activity_sessions WHERE id=?',
      [t.items[0].sessionId],
    );
    expect(s.reserved).toBe(2);
  });
  it('rejects a second active request for the same session with altered quantities', async () => {
    const a = activities.find((a) => a.id === 'cooking')!;
    await expect(service.createBooking(traveler, payload(oneTrip(a, 3)))).rejects.toThrow(
      'already_requested',
    );
  });
  it('rejects duplicate item IDs and mismatched sessions', async () => {
    const t = oneTrip(activities[0]);
    await expect(
      service.createBooking(traveler, payload({ ...t, items: [...t.items, ...t.items] })),
    ).rejects.toThrow();
    await expect(
      service.createBooking(
        traveler,
        payload({ ...t, items: [{ ...t.items[0], sessionId: activities[1].sessions[0].id }] }),
      ),
    ).rejects.toThrow('invalid_session');
  });
  it('prevents overbooking under concurrent requests', async () => {
    const a = activities.find((a) => a.id === 'pottery')!,
      t = oneTrip(a, 2, 12);
    await connection().run('UPDATE activity_sessions SET capacity=2 WHERE id=?', [
      t.items[0].sessionId,
    ]);
    const results = await Promise.allSettled([
      service.createBooking(traveler, payload(t)),
      service.createBooking(other, payload(t)),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const [s] = await connection().all<{ reserved: number }>(
      'SELECT reserved FROM activity_sessions WHERE id=?',
      [t.items[0].sessionId],
    );
    expect(s.reserved).toBe(2);
  });
  it('rejects cross-account changes and releases inventory on cancellation', async () => {
    const b = (await service.myBookings(traveler))[0];
    await expect(
      service.changeBookingItem(other, { itemId: b.items[0].id, status: 'cancelled' }),
    ).rejects.toThrow('forbidden');
    await service.changeBookingItem(traveler, { itemId: b.items[0].id, status: 'cancelled' });
    const changed = (await service.myBookings(traveler)).find((row) => row.id === b.id)!;
    expect(changed.status).toBe('cancelled');
    expect(changed.totals.totalSatang).toBe(0);
    await expect(
      service.changeBookingItem(traveler, { itemId: b.items[0].id, status: 'cancelled' }),
    ).rejects.toThrow('invalid_transition');
  });
  it('recalculates the bundle tier after partial cancellation', async () => {
    const cooking = activities.find((a) => a.id === 'cooking')!,
      pottery = activities.find((a) => a.id === 'pottery')!,
      day = 20;
    const t = oneTrip(cooking, 1, day);
    t.items.push({
      activityId: pottery.id,
      sessionId: pottery.sessions[day + 1].id,
      participants: 1,
    });
    const result = await service.createBooking(other, payload(t));
    let b = (await service.myBookings(other)).find((b) => b.id === result.id)!;
    expect(b.totals.discountSatang).toBe(1600);
    await service.changeBookingItem(other, {
      itemId: b.items.find((i) => i.activity_id === pottery.id)!.id,
      status: 'cancelled',
    });
    b = (await service.myBookings(other)).find((b) => b.id === result.id)!;
    expect(b.totals).toMatchObject({
      subtotalSatang: 85000,
      discountSatang: 0,
      totalSatang: 85000,
    });
  });
  it('rolls back all writes if a transaction fails', async () => {
    const a = activities[0].sessions[30];
    await expect(
      transaction(async (db) => {
        await db.run('UPDATE activity_sessions SET reserved=reserved+1 WHERE id=?', [a.id]);
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');
    const [s] = await connection().all<{ reserved: number }>(
      'SELECT reserved FROM activity_sessions WHERE id=?',
      [a.id],
    );
    expect(s.reserved).toBe(0);
  });
  it('does not roll back a concurrent standalone write with another request’s transaction', async () => {
    let started!: () => void;
    let release!: () => void;
    const running = new Promise<void>((resolve) => {
      started = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const failed = transaction(async (db) => {
      await db.run('UPDATE users SET name=? WHERE id=?', ['Uncommitted name', traveler.id]);
      started();
      await gate;
      throw new Error('isolated rollback');
    });
    const rejected = expect(failed).rejects.toThrow('isolated rollback');
    await running;
    const independent = connection().run('UPDATE users SET name=? WHERE id=?', [
      'Independent name',
      other.id,
    ]);
    release();
    await rejected;
    await independent;
    const [retained] = await connection().all<{ name: string }>(
      'SELECT name FROM users WHERE id=?',
      [other.id],
    );
    const [rolledBack] = await connection().all<{ name: string }>(
      'SELECT name FROM users WHERE id=?',
      [traveler.id],
    );
    expect(retained.name).toBe('Independent name');
    expect(rolledBack.name).toBe(traveler.name);
  });
});
describe('Community ownership and workflow', () => {
  let communityId: string, activityId: string;
  const listing = {
    title_th: 'ทดลองกิจกรรมชุมชน',
    title_en: 'Local test experience',
    description_th: 'กิจกรรมทดสอบสำหรับการตรวจสอบระบบจองและสิทธิ์',
    description_en: 'A local test experience for booking and authorization testing.',
    province: 'เชียงใหม่',
    category: 'food',
    price_satang: 50000,
    duration_minutes: 120,
    min_participants: 1,
    max_participants: 6,
    min_age: 8,
    image: '/images/cooking.webp',
    included_th: 'อุปกรณ์สำหรับกิจกรรม',
    included_en: 'Activity equipment',
    safety_th: 'ผู้เยาว์ต้องมีผู้ปกครองร่วมกิจกรรม',
    safety_en: 'Minors must attend with a guardian.',
    cancellation_th: 'ยกเลิกได้ก่อนเริ่มกิจกรรม',
    cancellation_en: 'Cancel before the session starts.',
    status: 'published',
  };
  it('creates a pending community and blocks publication until administrator review', async () => {
    communityId = (
      await service.registerCommunity(host, {
        name: 'Test local community',
        province: 'เชียงใหม่',
        description: 'Local community created only for testing.',
        verificationInfo: 'Public demo reference only.',
        consent: true,
      })
    ).id;
    host = { ...host, role: 'host' };
    await expect(service.saveActivity(host, listing)).rejects.toThrow('verification_required');
    await expect(
      service.verifyCommunity(traveler, { id: communityId, status: 'verified' }),
    ).rejects.toThrow('forbidden');
    await service.verifyCommunity(admin, { id: communityId, status: 'verified' });
    activityId = (await service.saveActivity(host, listing)).id;
  });
  it('blocks editing another host’s activity', async () => {
    await expect(service.saveActivity(host, { ...listing, id: activities[0].id })).rejects.toThrow(
      'forbidden',
    );
  });
  it('supports organizer group sessions, host confirmation, and private contact data', async () => {
    const date = addDays(bangkokDate(), 12);
    const sessionId = (
      await service.addSession(host, { activityId, date, time: '10:00', capacity: 6, group: true })
    ).id;
    const trip = {
      ...emptyTrip(),
      startDate: date,
      endDate: date,
      items: [{ activityId, sessionId, participants: 1 }],
    };
    const b = await service.createBooking(traveler, { ...payload(trip), kind: 'group' });
    let record = (await service.myBookings(traveler)).find((row) => row.id === b.id)!;
    const h = await service.hostData(host);
    expect(h.bookings).toHaveLength(1);
    expect(h.bookings[0].contact_email).toBe('traveler@example.invalid');
    await service.changeBookingItem(host, { itemId: record.items[0].id, status: 'confirmed' });
    record = (await service.myBookings(traveler)).find((row) => row.id === b.id)!;
    expect(record.status).toBe('confirmed');
    expect(record.payment_status).toBe('not_collected');
    await expect(
      service.changeBookingItem(host, { itemId: record.items[0].id, status: 'completed' }),
    ).rejects.toThrow('not_ended');
    await expect(service.closeSession(host, { id: sessionId })).rejects.toThrow(
      'session_has_bookings',
    );
    expect((await service.hostData(host)).expectedPayout).toBe(44000);
    expect((await service.myBookings(other)).some((row) => row.id === b.id)).toBe(false);
  });
});
