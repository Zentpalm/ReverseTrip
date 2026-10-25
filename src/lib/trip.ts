import type { Trip, TripItem } from './types';
export function bangkokDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
export function addDays(date: string, days: number) {
  return new Date(Date.parse(date + 'T12:00:00+07:00') + days * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function emptyTrip(): Trip {
  const start = addDays(bangkokDate(), 7);
  return {
    name: '',
    destination: '',
    startDate: start,
    endDate: addDays(start, 2),
    travelers: 1,
    bufferMinutes: 30,
    restMinutes: 30,
    items: [],
  };
}
export function addTripItem(trip: Trip, item: TripItem): Trip {
  return trip.items.some((i) => i.activityId === item.activityId)
    ? trip
    : { ...trip, items: [...trip.items, item] };
}
export function reorderTrip(trip: Trip, index: number, direction: number): Trip {
  const next = index + direction;
  if (next < 0 || next >= trip.items.length) return trip;
  const items = [...trip.items];
  [items[index], items[next]] = [items[next], items[index]];
  return { ...trip, items };
}
