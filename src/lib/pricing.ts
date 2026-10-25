import type { DiscountConfig, PriceLine, Totals, Activity, Trip } from './types';
export const DEFAULT_DISCOUNTS: DiscountConfig = {
  commissionBps: 1200,
  capSatang: 15000,
  enabled: true,
  tiers: [
    { count: 2, minimumSatang: 150000, rateBps: 100 },
    { count: 3, minimumSatang: 250000, rateBps: 200 },
    { count: 4, minimumSatang: 400000, rateBps: 300 },
  ],
};
export function calculateTotals(
  lines: PriceLine[],
  config: DiscountConfig = DEFAULT_DISCOUNTS,
): Totals {
  const unique = new Map<string, PriceLine>();
  for (const line of lines) {
    if (!Number.isSafeInteger(line.subtotalSatang) || line.subtotalSatang < 0)
      throw new Error('invalid_money');
    if (unique.has(line.activityId)) continue;
    unique.set(line.activityId, line);
  }
  const valid = [...unique.values()];
  const subtotalSatang = valid.reduce((n, l) => n + l.subtotalSatang, 0);
  if (!Number.isSafeInteger(subtotalSatang)) throw new Error('invalid_money');
  const eligible = valid.filter((l) => l.eligible);
  const eligibleSubtotalSatang = eligible.reduce((n, l) => n + l.subtotalSatang, 0);
  const distinctCount = eligible.length;
  const rateBps = config.enabled
    ? Math.max(
        0,
        ...config.tiers
          .filter((t) => distinctCount >= t.count && eligibleSubtotalSatang >= t.minimumSatang)
          .map((t) => t.rateBps),
      )
    : 0;
  const discountSatang = Math.min(
    subtotalSatang,
    config.capSatang,
    Math.round((eligibleSubtotalSatang * rateBps) / 10000),
  );
  const commissionSatang = Math.round((subtotalSatang * config.commissionBps) / 10000);
  return {
    subtotalSatang,
    eligibleSubtotalSatang,
    distinctCount,
    rateBps,
    discountSatang,
    totalSatang: Math.max(0, subtotalSatang - discountSatang),
    commissionSatang,
    hostPayoutSatang: subtotalSatang - commissionSatang,
    contributionSatang: commissionSatang - discountSatang,
  };
}
export function tripTotals(
  trip: Trip,
  activities: Activity[],
  config: DiscountConfig = DEFAULT_DISCOUNTS,
) {
  return calculateTotals(
    trip.items.flatMap((i) => {
      const a = activities.find((a) => a.id === i.activityId);
      return a
        ? [
            {
              activityId: a.id,
              subtotalSatang: a.price_satang * i.participants,
              eligible: !!a.eligible,
            },
          ]
        : [];
    }),
    config,
  );
}
export function money(satang: number, locale = 'th') {
  return new Intl.NumberFormat(locale === 'th' ? 'th-TH' : 'en-US', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: satang % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(satang / 100);
}
/** Largest-remainder allocation makes all line-level shares add up to the trip total. */
export function allocateFinancials(lines: PriceLine[], config: DiscountConfig = DEFAULT_DISCOUNTS) {
  const unique = [...new Map(lines.map((l) => [l.activityId, l])).values()],
    totals = calculateTotals(unique, config);
  function allocate(amount: number, eligible: PriceLine[]) {
    const result: Record<string, number> = {};
    const sum = eligible.reduce((n, l) => n + l.subtotalSatang, 0);
    if (!sum) return result;
    const ordered = eligible
      .map((l) => {
        const numerator = BigInt(amount) * BigInt(l.subtotalSatang);
        const floor = Number(numerator / BigInt(sum));
        result[l.activityId] = floor;
        return { id: l.activityId, remainder: numerator % BigInt(sum) };
      })
      .sort((a, b) =>
        a.remainder === b.remainder ? a.id.localeCompare(b.id) : a.remainder > b.remainder ? -1 : 1,
      );
    let remainder = amount - Object.values(result).reduce((n, v) => n + v, 0);
    for (const row of ordered) {
      if (remainder-- <= 0) break;
      result[row.id]++;
    }
    return result;
  }
  const commissions = allocate(totals.commissionSatang, unique),
    discounts = allocate(
      totals.discountSatang,
      unique.filter((l) => l.eligible),
    );
  return Object.fromEntries(
    unique.map((l) => [
      l.activityId,
      {
        commissionSatang: commissions[l.activityId] || 0,
        discountSatang: discounts[l.activityId] || 0,
        hostPayoutSatang: l.subtotalSatang - (commissions[l.activityId] || 0),
      },
    ]),
  );
}
