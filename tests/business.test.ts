import { describe, it, expect } from 'vitest';
import { calculateTotals, DEFAULT_DISCOUNTS, allocateFinancials } from '../src/lib/pricing';
import { addTripItem, reorderTrip, emptyTrip } from '../src/lib/trip';
import { filterActivities } from '../src/lib/search';
import { basicPlanner, createPlan } from '../src/lib/planner';
import { registerSchema, tripSchema } from '../src/lib/validation';
import type { Activity, Trip } from '../src/lib/types';
const activity = (id: string, price = 75000): Activity => ({
  id,
  community_id: 'c',
  title_th: 'ปั้นดินเผา',
  title_en: 'Pottery workshop',
  description_th: 'คำอธิบาย',
  description_en: 'Description',
  category: 'craft',
  province: 'เชียงใหม่',
  latitude: 18,
  longitude: 98,
  duration_minutes: 180,
  price_satang: price,
  min_participants: 1,
  max_participants: 10,
  min_age: 8,
  image: '/images/pottery.webp',
  included_th: '',
  included_en: '',
  safety_th: '',
  safety_en: '',
  cancellation_th: '',
  cancellation_en: '',
  eligible: 1,
  demo: 1,
  status: 'published',
  host_name: 'Local studio',
  verification: 'verified',
  images: [],
  sessions: [
    {
      id: id + '-am',
      activity_id: id,
      starts_at: '2030-01-10T09:00:00+07:00',
      ends_at: '2030-01-10T12:00:00+07:00',
      capacity: 10,
      reserved: 0,
      group_mode: 1,
      status: 'open',
    },
    {
      id: id + '-pm',
      activity_id: id,
      starts_at: '2030-01-10T14:00:00+07:00',
      ends_at: '2030-01-10T17:00:00+07:00',
      capacity: 10,
      reserved: 0,
      group_mode: 1,
      status: 'open',
    },
  ],
});
const trip = (items: Trip['items']): Trip => ({
  ...emptyTrip(),
  startDate: '2030-01-10',
  endDate: '2030-01-11',
  items,
});
describe('Bundle economics in integer satang', () => {
  it.each([
    [1, 150000, 0],
    [2, 150000, 1500],
    [3, 250000, 5000],
    [4, 400000, 12000],
    [4, 300000, 6000],
    [5, 640000, 15000],
  ])('%i distinct, subtotal %i => discount %i', (count, subtotal, discount) => {
    const prices = Array.from({ length: count }, (_, i) => ({
      activityId: String(i),
      eligible: true,
      subtotalSatang:
        i === 0
          ? subtotal - (count - 1) * Math.floor(subtotal / count)
          : Math.floor(subtotal / count),
    }));
    expect(calculateTotals(prices).discountSatang).toBe(discount);
  });
  it('does not count duplicated activities or charge duplicated lines', () => {
    const x = { activityId: 'a', eligible: true, subtotalSatang: 150000 };
    expect(calculateTotals([x, x])).toMatchObject({
      distinctCount: 1,
      discountSatang: 0,
      subtotalSatang: 150000,
    });
  });
  it('keeps ineligible items outside discount qualification', () => {
    expect(
      calculateTotals([
        { activityId: 'a', eligible: true, subtotalSatang: 100000 },
        { activityId: 'b', eligible: false, subtotalSatang: 100000 },
      ]).discountSatang,
    ).toBe(0);
  });
  it('preserves 88% host share and names platform contribution before costs', () => {
    expect(
      calculateTotals([
        { activityId: 'a', eligible: true, subtotalSatang: 75000 },
        { activityId: 'b', eligible: true, subtotalSatang: 75000 },
      ]),
    ).toMatchObject({
      totalSatang: 148500,
      commissionSatang: 18000,
      hostPayoutSatang: 132000,
      contributionSatang: 16500,
    });
  });
  it('disables promotions while preserving commission', () =>
    expect(
      calculateTotals(
        [
          { activityId: 'a', eligible: true, subtotalSatang: 75000 },
          { activityId: 'b', eligible: true, subtotalSatang: 75000 },
        ],
        { ...DEFAULT_DISCOUNTS, enabled: false },
      ),
    ).toMatchObject({ discountSatang: 0, commissionSatang: 18000 }));
  it('rejects negative or fractional monetary amounts', () => {
    for (const value of [-1, 1.5, Infinity])
      expect(() =>
        calculateTotals([{ activityId: 'a', eligible: true, subtotalSatang: value }]),
      ).toThrow();
  });
  it('allocates rounded satang so host shares reconcile exactly', () => {
    const lines = [
      { activityId: 'a', eligible: true, subtotalSatang: 10003 },
      { activityId: 'b', eligible: true, subtotalSatang: 10003 },
    ];
    const shares = Object.values(allocateFinancials(lines));
    expect(shares.reduce((n, l) => n + l.commissionSatang, 0)).toBe(
      calculateTotals(lines).commissionSatang,
    );
    expect(shares.reduce((n, l) => n + l.hostPayoutSatang, 0)).toBe(
      calculateTotals(lines).hostPayoutSatang,
    );
  });
  it('zero items never produces a negative payable amount', () =>
    expect(calculateTotals([]).totalSatang).toBe(0));
});
describe('Search and trip state', () => {
  const a = activity('a'),
    b = { ...activity('b', 120000), province: 'น่าน', category: 'nature' as const };
  it('combines province, budget, category, capacity and dates', () =>
    expect(
      filterActivities([a, b], {
        province: 'เชียงใหม่',
        budget: 800,
        category: 'craft',
        travelers: 2,
        date: '2030-01-10',
      }).map((a) => a.id),
    ).toEqual(['a']));
  it('searches Thai, English and host names', () => {
    expect(filterActivities([a], { q: 'Pottery' })).toHaveLength(1);
    expect(filterActivities([a], { q: 'Local' })).toHaveLength(1);
  });
  it('rejects full sessions, wrong dates and excessive group sizes', () => {
    expect(filterActivities([a], { date: '2030-01-12' })).toHaveLength(0);
    expect(filterActivities([a], { travelers: 11 })).toHaveLength(0);
    expect(
      filterActivities([{ ...a, sessions: a.sessions.map((s) => ({ ...s, reserved: 10 })) }], {}),
    ).toHaveLength(0);
  });
  it('reset returns available records and sorts by price', () =>
    expect(filterActivities([b, a], { sort: 'price-asc' }).map((a) => a.id)).toEqual(['a', 'b']));
  it('adds distinct items and reorders without changing quantities', () => {
    const t = trip([{ activityId: 'a', sessionId: 'a-am', participants: 2 }]);
    const unchanged = addTripItem(t, { activityId: 'a', sessionId: 'a-pm', participants: 4 });
    expect(unchanged).toEqual(t);
    const added = addTripItem(t, { activityId: 'b', sessionId: 'b-pm', participants: 3 });
    expect(reorderTrip(added, 1, -1).items).toEqual([added.items[1], added.items[0]]);
  });
  it('rejects duplicate persisted trip items and invalid dates', () => {
    expect(
      tripSchema.safeParse(
        trip([
          { activityId: 'a', sessionId: 'a-am', participants: 1 },
          { activityId: 'a', sessionId: 'a-am', participants: 1 },
        ]),
      ).success,
    ).toBe(false);
    expect(tripSchema.safeParse({ ...trip([]), startDate: '2030-02-31' }).success).toBe(false);
  });
  it('never accepts client-selected admin roles in registration', () => {
    const p = registerSchema.parse({
      name: 'Test User',
      email: 'test@example.invalid',
      password: 'long-password',
      consent: true,
      role: 'admin',
    });
    expect(p).not.toHaveProperty('role');
  });
});
describe('Constraint-aware planner', () => {
  const a = activity('a'),
    b = activity('b');
  it('detects overlapping sessions and leaves the second unscheduled', () => {
    const plan = createPlan(
      trip([
        { activityId: 'a', sessionId: 'a-am', participants: 1 },
        { activityId: 'b', sessionId: 'b-am', participants: 1 },
      ]),
      [a, b],
    );
    expect(plan.issues[0].code).toBe('overlap');
    expect(plan.rows.filter((r) => r.type === 'activity')).toHaveLength(1);
  });
  it('respects manual travel and rest buffers', () => {
    const t = trip([
      { activityId: 'a', sessionId: 'a-am', participants: 1 },
      { activityId: 'b', sessionId: 'b-pm', participants: 1 },
    ]);
    expect(createPlan(t, [a, b]).issues).toHaveLength(0);
    expect(createPlan({ ...t, bufferMinutes: 150 }, [a, b]).issues[0].code).toBe('travel_conflict');
  });
  it('does not invent same-day interprovincial travel', () =>
    expect(
      createPlan(
        trip([
          { activityId: 'a', sessionId: 'a-am', participants: 1 },
          { activityId: 'b', sessionId: 'b-pm', participants: 1 },
        ]),
        [a, { ...b, province: 'น่าน' }],
      ).issues[0].code,
    ).toBe('different_region'));
  it('handles missing sessions and dates outside the trip', () => {
    expect(
      createPlan(trip([{ activityId: 'a', sessionId: 'missing', participants: 1 }]), [a]).issues[0]
        .code,
    ).toBe('missing_session');
    expect(
      createPlan(
        {
          ...trip([{ activityId: 'a', sessionId: 'a-am', participants: 1 }]),
          startDate: '2030-01-11',
        },
        [a],
      ).issues[0].code,
    ).toBe('outside_dates');
  });
  it('auto-arranges only recorded, available sessions', async () => {
    const result = await basicPlanner.suggest(
      trip([
        { activityId: 'a', sessionId: '', participants: 1 },
        { activityId: 'b', sessionId: '', participants: 1 },
      ]),
      [a, b],
    );
    expect(result.items.map((i) => i.sessionId)).toEqual(['a-am', 'b-pm']);
    expect(createPlan(result, [a, b]).issues).toEqual([]);
  });
});
