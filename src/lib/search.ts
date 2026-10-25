import type { Activity, Category } from './types';
export interface Filters {
  q?: string;
  province?: string;
  category?: Category | '';
  budget?: number;
  travelers?: number;
  date?: string;
  groupOnly?: boolean;
  sort?: string;
}
export function filterActivities(activities: Activity[], f: Filters) {
  const q = (f.q || '').trim().toLowerCase();
  const rows = activities.filter(
    (a) =>
      a.status === 'published' &&
      a.verification === 'verified' &&
      (!q ||
        [a.title_th, a.title_en, a.host_name, a.province].some((s) =>
          s.toLowerCase().includes(q),
        )) &&
      (!f.province || a.province === f.province) &&
      (!f.category || a.category === f.category) &&
      (!f.budget || a.price_satang <= f.budget * 100) &&
      (!f.travelers || (f.travelers >= a.min_participants && f.travelers <= a.max_participants)) &&
      a.sessions.some(
        (s) =>
          s.status === 'open' &&
          Date.parse(s.starts_at) > Date.now() &&
          s.capacity - s.reserved >= (f.travelers || 1) &&
          (!f.date || s.starts_at.slice(0, 10) === f.date) &&
          (!f.groupOnly || !!s.group_mode),
      ),
  );
  if (f.sort === 'price-asc') rows.sort((a, b) => a.price_satang - b.price_satang);
  if (f.sort === 'price-desc') rows.sort((a, b) => b.price_satang - a.price_satang);
  if (f.sort === 'duration') rows.sort((a, b) => a.duration_minutes - b.duration_minutes);
  return rows;
}
