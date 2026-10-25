export type Locale = 'th' | 'en';
export type Role = 'traveler' | 'host' | 'admin';
export type Status = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';
export type Verification = 'pending' | 'verified' | 'rejected' | 'suspended';
export type Category = 'food' | 'craft' | 'culture' | 'nature' | 'community' | 'workshop';
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}
export interface Community {
  id: string;
  owner_id: string;
  name: string;
  province: string;
  description: string;
  verification: Verification;
  demo: number;
  image: string;
}
export interface Session {
  id: string;
  activity_id: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  reserved: number;
  group_mode: number;
  status: 'open' | 'closed';
}
export interface Activity {
  id: string;
  community_id: string;
  title_th: string;
  title_en: string;
  description_th: string;
  description_en: string;
  category: Category;
  province: string;
  latitude: number;
  longitude: number;
  duration_minutes: number;
  price_satang: number;
  min_participants: number;
  max_participants: number;
  min_age: number;
  image: string;
  included_th: string;
  included_en: string;
  safety_th: string;
  safety_en: string;
  cancellation_th: string;
  cancellation_en: string;
  eligible: number;
  demo: number;
  status: 'draft' | 'published' | 'inactive';
  host_name: string;
  verification: Verification;
  sessions: Session[];
  images: string[];
}
export interface TripItem {
  activityId: string;
  sessionId: string;
  participants: number;
}
export interface Trip {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  bufferMinutes: number;
  restMinutes: number;
  items: TripItem[];
}
export interface Catalog {
  activities: Activity[];
  communities: Community[];
  demo: boolean;
  discounts: DiscountConfig;
}
export interface DiscountConfig {
  commissionBps: number;
  capSatang: number;
  enabled: boolean;
  tiers: { count: number; minimumSatang: number; rateBps: number }[];
}
export interface PriceLine {
  activityId: string;
  subtotalSatang: number;
  eligible: boolean;
}
export interface Totals {
  subtotalSatang: number;
  eligibleSubtotalSatang: number;
  distinctCount: number;
  rateBps: number;
  discountSatang: number;
  totalSatang: number;
  commissionSatang: number;
  hostPayoutSatang: number;
  contributionSatang: number;
}
export interface BookingItem {
  id: string;
  booking_id: string;
  activity_id: string;
  session_id: string;
  community_id: string;
  participants: number;
  price_satang: number;
  eligible: number;
  status: Status;
  title_th: string;
  title_en: string;
  starts_at: string;
  ends_at: string;
  image: string;
  host_name: string;
}
export interface Booking {
  id: string;
  user_id: string;
  trip_name: string;
  status: Status;
  payment_status: 'not_collected';
  created_at: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  items: BookingItem[];
  totals: Totals;
  kind: 'trip' | 'group';
}
export interface PlanRow {
  type: 'activity' | 'travel' | 'rest';
  start: string;
  end: string;
  activityId?: string;
  estimated?: boolean;
}
export interface PlanIssue {
  code:
    | 'missing_session'
    | 'outside_dates'
    | 'capacity'
    | 'overlap'
    | 'travel_conflict'
    | 'different_region';
  activityId: string;
}
export interface Plan {
  rows: PlanRow[];
  issues: PlanIssue[];
  unscheduled: string[];
}
