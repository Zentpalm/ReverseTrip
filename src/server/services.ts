import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { connection, ensureDatabase, transaction, type Database } from './db';
import { check } from './errors';
import { digest } from './auth';
import { getActivities, getCatalog, getDiscounts } from './catalog';
import {
  activitySchema,
  bookingSchema,
  communitySchema,
  sessionSchema,
  tripSchema,
} from '../lib/validation';
import { calculateTotals, allocateFinancials } from '../lib/pricing';
import { createPlan } from '../lib/planner';
import type {
  Booking,
  BookingItem,
  Community,
  DiscountConfig,
  Status,
  Trip,
  User,
} from '../lib/types';
const now = () => new Date().toISOString();
async function audit(db: Database, user: User, action: string, target: string) {
  await db.run(
    'INSERT INTO audit_log(id,actor_id,action,target_id,created_at) VALUES (?,?,?,?,?)',
    [randomUUID(), user.id, action, target, now()],
  );
}
export async function loadTrip(user: User) {
  await ensureDatabase();
  const [r] = await connection().all<{ data_json: string; revision: number }>(
    'SELECT data_json,revision FROM trips WHERE user_id=?',
    [user.id],
  );
  return r ? { trip: JSON.parse(r.data_json) as Trip, revision: r.revision } : null;
}
export async function saveTrip(user: User, input: unknown) {
  const p = z.object({ trip: tripSchema, revision: z.number().int().min(0) }).parse(input);
  await ensureDatabase();
  return transaction(async (db) => {
    if (process.env.DATABASE_URL)
      await db.all('SELECT id FROM users WHERE id=? FOR UPDATE', [user.id]);
    const [old] = await db.all<{ id: string; revision: number }>(
      'SELECT id,revision FROM trips WHERE user_id=?',
      [user.id],
    );
    check((old?.revision || 0) === p.revision, 'trip_conflict', 409);
    const catalog = await getActivities(db);
    for (const i of p.trip.items) {
      const a = catalog.find((a) => a.id === i.activityId);
      check(a, 'activity_unavailable');
      if (i.sessionId)
        check(
          a.sessions.some((s) => s.id === i.sessionId),
          'invalid_session',
        );
    }
    const id = old?.id || randomUUID(),
      revision = (old?.revision || 0) + 1;
    await db.run(
      'INSERT INTO trips(id,user_id,data_json,revision,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET data_json=excluded.data_json,revision=excluded.revision,updated_at=excluded.updated_at',
      [id, user.id, JSON.stringify(p.trip), revision, now()],
    );
    await db.run('DELETE FROM trip_items WHERE trip_id=?', [id]);
    await db.run('DELETE FROM itinerary_items WHERE trip_id=?', [id]);
    for (const [position, i] of p.trip.items.entries())
      await db.run(
        'INSERT INTO trip_items(id,trip_id,activity_id,session_id,participants,position) VALUES (?,?,?,?,?,?)',
        [randomUUID(), id, i.activityId, i.sessionId || null, i.participants, position],
      );
    for (const r of createPlan(p.trip, catalog).rows)
      await db.run(
        'INSERT INTO itinerary_items(id,trip_id,activity_id,kind,starts_at,ends_at) VALUES (?,?,?,?,?,?)',
        [randomUUID(), id, r.activityId || null, r.type, r.start, r.end],
      );
    return { revision };
  });
}
export async function quote(input: unknown) {
  const trip = tripSchema.parse(input);
  const c = await getCatalog();
  const lines = trip.items.map((i) => {
    const a = c.activities.find((a) => a.id === i.activityId);
    check(a, 'activity_unavailable');
    check(
      i.participants >= a.min_participants && i.participants <= a.max_participants,
      'invalid_participants',
    );
    return {
      activityId: a.id,
      subtotalSatang: a.price_satang * i.participants,
      eligible: !!a.eligible,
    };
  });
  return { totals: calculateTotals(lines, c.discounts), plan: createPlan(trip, c.activities) };
}
export async function createBooking(user: User, input: unknown) {
  const p = bookingSchema.parse(input);
  check(p.trip.items.length, 'empty_trip');
  await ensureDatabase();
  return transaction(async (db) => {
    if (process.env.DATABASE_URL)
      await db.all('SELECT id FROM users WHERE id=? FOR UPDATE', [user.id]);
    const [previous] = await db.all<{ id: string }>(
      'SELECT id FROM bookings WHERE user_id=? AND request_key=?',
      [user.id, p.requestKey],
    );
    if (previous) return { id: previous.id, reused: true };
    const fingerprint = digest(
      JSON.stringify([...p.trip.items].sort((a, b) => a.activityId.localeCompare(b.activityId))),
    );
    const [duplicate] = await db.all<{ id: string }>(
      "SELECT id FROM bookings WHERE user_id=? AND fingerprint=? AND status IN ('pending','confirmed')",
      [user.id, fingerprint],
    );
    if (duplicate) return { id: duplicate.id, reused: true };
    const activities = await getActivities(db),
      config = await getDiscounts(db);
    const selected = p.trip.items.map((i) => {
      const a = activities.find((a) => a.id === i.activityId);
      check(a, 'activity_unavailable');
      const s = a.sessions.find((s) => s.id === i.sessionId);
      check(s && s.status === 'open' && Date.parse(s.starts_at) > Date.now(), 'invalid_session');
      check(
        i.participants >= a.min_participants && i.participants <= a.max_participants,
        'invalid_participants',
      );
      if (p.kind === 'group') check(s.group_mode, 'invalid_session');
      return { a, s, i };
    });
    check(!createPlan(p.trip, activities).issues.length, 'plan_conflict');
    for (const { a, s } of selected) {
      const existing = await db.all(
        "SELECT i.id FROM booking_items i JOIN bookings b ON b.id=i.booking_id WHERE b.user_id=? AND i.activity_id=? AND i.session_id=? AND i.status IN ('pending','confirmed')",
        [user.id, a.id, s.id],
      );
      check(!existing.length, 'already_requested', 409);
    }
    const totals = calculateTotals(
      selected.map(({ a, i }) => ({
        activityId: a.id,
        subtotalSatang: a.price_satang * i.participants,
        eligible: !!a.eligible,
      })),
      config,
    );
    const id = randomUUID();
    const [savedTrip] = await db.all<{ id: string }>('SELECT id FROM trips WHERE user_id=?', [
      user.id,
    ]);
    await db.run(
      `INSERT INTO bookings(id,user_id,trip_name,trip_json,request_key,fingerprint,kind,status,payment_status,contact_name,contact_phone,contact_email,config_json,totals_json,created_at,trip_id) VALUES (${Array(16).fill('?').join(',')})`,
      [
        id,
        user.id,
        p.trip.name || 'ReverseTrip',
        JSON.stringify(p.trip),
        p.requestKey,
        fingerprint,
        p.kind,
        'pending',
        'not_collected',
        p.contactName,
        p.contactPhone,
        p.contactEmail,
        JSON.stringify(config),
        JSON.stringify(totals),
        now(),
        savedTrip?.id || null,
      ],
    );
    for (const { a, s, i } of [...selected].sort((x, y) => x.s.id.localeCompare(y.s.id))) {
      const changed = await db.run(
        "UPDATE activity_sessions SET reserved=reserved+? WHERE id=? AND status='open' AND reserved+?<=capacity",
        [i.participants, s.id, i.participants],
      );
      check(changed.changes === 1, 'capacity', 409);
      const itemId = randomUUID();
      await db.run(
        'INSERT INTO booking_items(id,booking_id,activity_id,session_id,community_id,participants,price_satang,eligible,status,title_th_snapshot,title_en_snapshot) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        [
          itemId,
          id,
          a.id,
          s.id,
          a.community_id,
          i.participants,
          a.price_satang,
          a.eligible,
          'pending',
          a.title_th,
          a.title_en,
        ],
      );
      if (p.kind === 'group')
        await db.run(
          'INSERT INTO group_participation_requests(id,booking_item_id,user_id,created_at) VALUES (?,?,?,?)',
          [randomUUID(), itemId, user.id, now()],
        );
    }
    await audit(db, user, 'booking.requested', id);
    return { id, reused: false };
  });
}
const itemQuery = `SELECT i.*,i.title_th_snapshot AS title_th,i.title_en_snapshot AS title_en,a.image,s.starts_at,s.ends_at,c.name AS host_name FROM booking_items i JOIN activities a ON a.id=i.activity_id JOIN activity_sessions s ON s.id=i.session_id JOIN communities c ON c.id=i.community_id`;
export async function myBookings(user: User): Promise<Booking[]> {
  await ensureDatabase();
  const db = connection();
  const bookings = await db.all<Booking & { totals_json: string }>(
    'SELECT * FROM bookings WHERE user_id=? ORDER BY created_at DESC',
    [user.id],
  );
  const items = await db.all<BookingItem>(
    itemQuery + ' JOIN bookings b ON b.id=i.booking_id WHERE b.user_id=?',
    [user.id],
  );
  return bookings.map((b) => ({
    id: b.id,
    user_id: b.user_id,
    trip_name: b.trip_name,
    status: b.status,
    payment_status: b.payment_status,
    created_at: b.created_at,
    contact_name: b.contact_name,
    contact_email: b.contact_email,
    contact_phone: b.contact_phone,
    kind: b.kind,
    items: items.filter((i) => i.booking_id === b.id),
    totals: JSON.parse(b.totals_json),
  }));
}
export function canTransition(from: Status, to: Status) {
  return (
    (from === 'pending' && ['confirmed', 'rejected', 'cancelled'].includes(to)) ||
    (from === 'confirmed' && ['cancelled', 'completed'].includes(to))
  );
}
async function recalculateBooking(db: Database, id: string) {
  const items = await db.all<BookingItem>('SELECT * FROM booking_items WHERE booking_id=?', [id]);
  const [b] = await db.all<{ config_json: string }>('SELECT config_json FROM bookings WHERE id=?', [
    id,
  ]);
  const active = items.filter((i) => !['rejected', 'cancelled'].includes(i.status));
  let status: Status = 'pending';
  if (!active.length)
    status = items.every((i) => i.status === 'rejected') ? 'rejected' : 'cancelled';
  else if (active.every((i) => i.status === 'completed')) status = 'completed';
  else if (active.every((i) => ['confirmed', 'completed'].includes(i.status))) status = 'confirmed';
  const totals = calculateTotals(
    active.map((i) => ({
      activityId: i.activity_id,
      subtotalSatang: i.price_satang * i.participants,
      eligible: !!i.eligible,
    })),
    JSON.parse(b.config_json) as DiscountConfig,
  );
  await db.run('UPDATE bookings SET totals_json=?,status=? WHERE id=?', [
    JSON.stringify(totals),
    status,
    id,
  ]);
}
export async function changeBookingItem(user: User, input: unknown) {
  const p = z
    .object({
      itemId: z.string(),
      status: z.enum(['confirmed', 'rejected', 'cancelled', 'completed']),
    })
    .parse(input);
  await ensureDatabase();
  return transaction(async (db) => {
    const [r] = await db.all<BookingItem & { owner_id: string; user_id: string }>(
      `${itemQuery} JOIN bookings b ON b.id=i.booking_id WHERE i.id=?`,
      [p.itemId],
    );
    check(r, 'not_found', 404);
    if (process.env.DATABASE_URL)
      await db.all('SELECT id FROM bookings WHERE id=? FOR UPDATE', [r.booking_id]);
    const [current] = await db.all<BookingItem>('SELECT * FROM booking_items WHERE id=?', [
      p.itemId,
    ]);
    const [community] = await db.all<{ owner_id: string }>(
      'SELECT owner_id FROM communities WHERE id=?',
      [r.community_id],
    );
    const [booking] = await db.all<{ user_id: string }>('SELECT user_id FROM bookings WHERE id=?', [
      r.booking_id,
    ]);
    const host = community.owner_id === user.id && ['host', 'admin'].includes(user.role),
      traveler = booking.user_id === user.id;
    check(host || (traveler && p.status === 'cancelled'), 'forbidden', 403);
    check(canTransition(current.status, p.status), 'invalid_transition', 409);
    if (p.status === 'completed') check(Date.parse(r.ends_at) <= Date.now(), 'not_ended');
    else check(Date.parse(r.starts_at) > Date.now(), 'session_started');
    if (['rejected', 'cancelled'].includes(p.status))
      await db.run('UPDATE activity_sessions SET reserved=reserved-? WHERE id=? AND reserved>=?', [
        r.participants,
        r.session_id,
        r.participants,
      ]);
    await db.run('UPDATE booking_items SET status=? WHERE id=?', [p.status, p.itemId]);
    await recalculateBooking(db, r.booking_id);
    await audit(db, user, 'booking.' + p.status, p.itemId);
    return { ok: true };
  });
}
export async function registerCommunity(user: User, input: unknown) {
  const p = communitySchema.parse(input);
  await ensureDatabase();
  return transaction(async (db) => {
    check(
      !(await db.all('SELECT id FROM communities WHERE owner_id=?', [user.id])).length,
      'community_exists',
      409,
    );
    const id = randomUUID();
    await db.run(
      'INSERT INTO communities(id,owner_id,name,province,description,verification_info,verification,demo,image,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [
        id,
        user.id,
        p.name,
        p.province,
        p.description,
        p.verificationInfo,
        'pending',
        0,
        '/images/community-mae-kampong.webp',
        now(),
      ],
    );
    if (user.role === 'traveler')
      await db.run("UPDATE users SET role='host' WHERE id=?", [user.id]);
    await audit(db, user, 'community.submitted', id);
    return { id };
  });
}
export async function hostData(user: User) {
  check(['host', 'admin'].includes(user.role), 'forbidden', 403);
  await ensureDatabase();
  const db = connection();
  const [community] = await db.all<Community & { verification_info: string }>(
    'SELECT * FROM communities WHERE owner_id=?',
    [user.id],
  );
  if (!community) return { community: null, activities: [], bookings: [], expectedPayout: 0 };
  const activities = await getActivities(db, user.id);
  const bookings = await db.all<
    BookingItem & {
      contact_name: string;
      contact_phone: string;
      contact_email: string;
      kind: string;
    }
  >(
    `${itemQuery.replace('SELECT i.*', 'SELECT b.contact_name,b.contact_email,b.contact_phone,b.kind,i.*')} JOIN bookings b ON b.id=i.booking_id WHERE c.owner_id=? ORDER BY b.created_at DESC`,
    [user.id],
  );
  // Shared financial rule is snapshotted per booking; never treat expected receipts as paid revenue.
  let expectedPayout = 0;
  for (const bookingId of new Set(
    bookings.filter((i) => ['confirmed', 'completed'].includes(i.status)).map((i) => i.booking_id),
  )) {
    const lines = await db.all<BookingItem & { config_json: string }>(
      "SELECT i.*,b.config_json FROM booking_items i JOIN bookings b ON b.id=i.booking_id WHERE b.id=? AND i.status IN ('pending','confirmed','completed')",
      [bookingId],
    );
    const shares = allocateFinancials(
      lines.map((i) => ({
        activityId: i.activity_id,
        subtotalSatang: i.price_satang * i.participants,
        eligible: !!i.eligible,
      })),
      JSON.parse(lines[0].config_json) as DiscountConfig,
    );
    expectedPayout += lines
      .filter(
        (i) => i.community_id === community.id && ['confirmed', 'completed'].includes(i.status),
      )
      .reduce((n, i) => n + shares[i.activity_id].hostPayoutSatang, 0);
  }

  return { community, activities, bookings, expectedPayout };
}
export async function saveActivity(user: User, input: unknown) {
  check(['host', 'admin'].includes(user.role), 'forbidden', 403);
  const p = activitySchema.parse(input);
  await ensureDatabase();
  return transaction(async (db) => {
    const [c] = await db.all<Community>('SELECT * FROM communities WHERE owner_id=?', [user.id]);
    check(c, 'no_community');
    check(c.verification !== 'suspended', 'forbidden', 403);
    if (p.status === 'published') check(c.verification === 'verified', 'verification_required');
    const { id: inputId, ...values } = p;
    const id = inputId || randomUUID();
    if (inputId) {
      const [existing] = await db.all<{ community_id: string }>(
        'SELECT community_id FROM activities WHERE id=?',
        [inputId],
      );
      check(existing && existing.community_id === c.id, 'forbidden', 403);
      await db.run(
        `UPDATE activities SET ${Object.keys(values)
          .map((k) => k + '=?')
          .join(',')} WHERE id=?`,
        [...Object.values(values), id],
      );
    } else {
      const row = { ...values, id, community_id: c.id, eligible: 1, demo: 0, created_at: now() };
      await db.run(
        `INSERT INTO activities(${Object.keys(row).join(',')}) VALUES (${Object.keys(row)
          .map(() => '?')
          .join(',')})`,
        Object.values(row),
      );
    }
    await audit(db, user, 'activity.saved', id);
    return { id };
  });
}
export async function addSession(user: User, input: unknown) {
  const p = sessionSchema.parse(input);
  await ensureDatabase();
  return transaction(async (db) => {
    const [a] = await db.all<{
      duration_minutes: number;
      max_participants: number;
      owner_id: string;
    }>(
      'SELECT a.duration_minutes,a.max_participants,c.owner_id FROM activities a JOIN communities c ON c.id=a.community_id WHERE a.id=?',
      [p.activityId],
    );
    check(a && a.owner_id === user.id && ['host', 'admin'].includes(user.role), 'forbidden', 403);
    check(p.capacity <= a.max_participants, 'invalid_participants');
    const start = `${p.date}T${p.time}:00+07:00`;
    check(Date.parse(start) > Date.now(), 'invalid_session');
    const end = new Date(Date.parse(start) + a.duration_minutes * 60000);
    const endDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(end);
    const endTime = end.toLocaleTimeString('en-GB', { timeZone: 'Asia/Bangkok', hour12: false });
    const id = randomUUID();
    await db.run(
      'INSERT INTO activity_sessions(id,activity_id,starts_at,ends_at,capacity,reserved,group_mode,status) VALUES (?,?,?,?,?,0,?,?)',
      [id, p.activityId, start, `${endDate}T${endTime}+07:00`, p.capacity, p.group ? 1 : 0, 'open'],
    );
    return { id };
  });
}
export async function closeSession(user: User, input: unknown) {
  const p = z.object({ id: z.string() }).parse(input);
  await ensureDatabase();
  return transaction(async (db) => {
    const [s] = await db.all<{ owner_id: string }>(
      'SELECT c.owner_id FROM activity_sessions s JOIN activities a ON a.id=s.activity_id JOIN communities c ON c.id=a.community_id WHERE s.id=?',
      [p.id],
    );
    check(s && s.owner_id === user.id, 'forbidden', 403);
    const r = await db.run(
      "UPDATE activity_sessions SET status='closed' WHERE id=? AND reserved=0",
      [p.id],
    );
    check(r.changes, 'session_has_bookings', 409);
    return { ok: true };
  });
}
export async function adminData(user: User) {
  check(user.role === 'admin', 'forbidden', 403);
  await ensureDatabase();
  return {
    communities: await connection().all<Community & { verification_info: string }>(
      'SELECT * FROM communities WHERE demo=0 ORDER BY created_at DESC',
    ),
    audit: await connection().all(
      'SELECT action,target_id,created_at FROM audit_log ORDER BY created_at DESC LIMIT 50',
    ),
  };
}
export async function verifyCommunity(user: User, input: unknown) {
  check(user.role === 'admin', 'forbidden', 403);
  const p = z
    .object({ id: z.string(), status: z.enum(['verified', 'rejected', 'suspended', 'pending']) })
    .parse(input);
  return transaction(async (db) => {
    const r = await db.run('UPDATE communities SET verification=? WHERE id=?', [p.status, p.id]);
    check(r.changes, 'not_found', 404);
    await audit(db, user, 'community.' + p.status, p.id);
    return { ok: true };
  });
}
