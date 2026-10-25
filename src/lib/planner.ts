import type { Activity, Plan, Trip } from './types';
function iso(t: number) {
  return new Date(t).toISOString();
}
export function createPlan(trip: Trip, activities: Activity[]): Plan {
  const rows: Plan['rows'] = [],
    issues: Plan['issues'] = [],
    unscheduled: string[] = [];
  const selected = trip.items
    .flatMap((item) => {
      const a = activities.find((a) => a.id === item.activityId),
        s = a?.sessions.find((s) => s.id === item.sessionId);
      if (!a || !s) {
        issues.push({ code: 'missing_session', activityId: item.activityId });
        unscheduled.push(item.activityId);
        return [];
      }
      if (s.starts_at.slice(0, 10) < trip.startDate || s.starts_at.slice(0, 10) > trip.endDate) {
        issues.push({ code: 'outside_dates', activityId: a.id });
        unscheduled.push(a.id);
        return [];
      }
      if (
        s.status !== 'open' ||
        Date.parse(s.starts_at) <= Date.now() ||
        s.capacity - s.reserved < item.participants
      ) {
        issues.push({ code: 'capacity', activityId: a.id });
        unscheduled.push(a.id);
        return [];
      }
      return [{ a, s, item }];
    })
    .sort((a, b) => Date.parse(a.s.starts_at) - Date.parse(b.s.starts_at));
  let previous: (typeof selected)[number] | undefined;
  for (const current of selected) {
    const start = Date.parse(current.s.starts_at);
    if (previous) {
      const lastEnd = Date.parse(previous.s.ends_at),
        sameDay = previous.s.starts_at.slice(0, 10) === current.s.starts_at.slice(0, 10);
      if (previous.a.province !== current.a.province && sameDay) {
        issues.push({ code: 'different_region', activityId: current.a.id });
        unscheduled.push(current.a.id);
        continue;
      }
      const gap = (trip.bufferMinutes + trip.restMinutes) * 60000;
      if (start < lastEnd) {
        issues.push({ code: 'overlap', activityId: current.a.id });
        unscheduled.push(current.a.id);
        continue;
      }
      if (sameDay && start < lastEnd + gap) {
        issues.push({ code: 'travel_conflict', activityId: current.a.id });
        unscheduled.push(current.a.id);
        continue;
      }
      if (sameDay) {
        if (trip.restMinutes)
          rows.push({
            type: 'rest',
            start: iso(lastEnd),
            end: iso(lastEnd + trip.restMinutes * 60000),
          });
        if (trip.bufferMinutes)
          rows.push({
            type: 'travel',
            start: iso(lastEnd + trip.restMinutes * 60000),
            end: iso(lastEnd + gap),
            estimated: true,
          });
      }
    }
    rows.push({
      type: 'activity',
      start: current.s.starts_at,
      end: current.s.ends_at,
      activityId: current.a.id,
    });
    previous = current;
  }
  return { rows, issues, unscheduled };
}
/** Optional AI provider MUST return these existing activity/session IDs; validated by the same planner. */
export interface PlanningProvider {
  suggest(trip: Trip, activities: Activity[]): Promise<Trip>;
}
export const basicPlanner: PlanningProvider = {
  async suggest(trip, activities) {
    const next = { ...trip, items: trip.items.map((i) => ({ ...i })) };
    let end = Date.parse(trip.startDate + 'T00:00:00+07:00');
    let province = '';
    let lastDay = '';
    for (const item of next.items) {
      const a = activities.find((a) => a.id === item.activityId);
      if (!a) continue;
      const s = [...a.sessions]
        .sort((x, y) => x.starts_at.localeCompare(y.starts_at))
        .find(
          (s) =>
            s.status === 'open' &&
            Date.parse(s.starts_at) > Date.now() &&
            s.starts_at.slice(0, 10) >= trip.startDate &&
            s.starts_at.slice(0, 10) <= trip.endDate &&
            s.capacity - s.reserved >= item.participants &&
            Date.parse(s.starts_at) >= end &&
            (!province || province === a.province || s.starts_at.slice(0, 10) !== lastDay),
        );
      item.sessionId = s?.id || '';
      if (s) {
        end = Date.parse(s.ends_at) + (trip.bufferMinutes + trip.restMinutes) * 60000;
        province = a.province;
        lastDay = s.starts_at.slice(0, 10);
      }
    }
    return next;
  },
};
