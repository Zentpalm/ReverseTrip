import { tripSchema } from '../lib/validation';
import { createPlan } from '../lib/planner';
import { check } from './errors';
import type { Activity, Trip } from '../lib/types';
/** Any future AI response must pass these checks before becoming a user plan. */
export function validateSuggestedTrip(output: unknown, activities: Activity[]): Trip {
  const trip = tripSchema.parse(output);
  for (const item of trip.items) {
    const a = activities.find((a) => a.id === item.activityId);
    check(a, 'activity_unavailable');
    check(
      a.sessions.some((s) => s.id === item.sessionId),
      'invalid_session',
    );
    check(
      item.participants >= a.min_participants && item.participants <= a.max_participants,
      'invalid_participants',
    );
  }
  check(createPlan(trip, activities).issues.length === 0, 'plan_conflict');
  return trip;
}
/** Contract only. No payment gateway or payout implementation is enabled. */
export interface MarketplacePaymentGateway {
  createCheckout(input: {
    bookingId: string;
    amountSatang: number;
    currency: 'THB';
    idempotencyKey: string;
  }): Promise<{ checkoutId: string; checkoutUrl: string }>;
  verifyWebhook(
    rawBody: Uint8Array,
    signature: string,
  ): Promise<{
    eventId: string;
    bookingId: string;
    amountSatang: number;
    currency: 'THB';
    paid: boolean;
  }>;
  createHostTransfer(input: {
    paymentId: string;
    communityId: string;
    amountSatang: number;
    idempotencyKey: string;
  }): Promise<{ transferId: string }>;
}
/** A future implementation must verify MIME magic bytes, dimensions and ownership. */
export interface ActivityImageStorage {
  store(input: {
    ownerId: string;
    activityId: string;
    bytes: Uint8Array;
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  }): Promise<{ key: string; url: string }>;
  deleteOwned(input: { ownerId: string; key: string }): Promise<void>;
}
