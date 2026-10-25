import { z } from 'zod';
const text = z.string().trim();
const date = text
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v + 'T00:00:00Z')) &&
      new Date(v + 'T00:00:00Z').toISOString().startsWith(v),
    'invalid_date',
  );
export const registerSchema = z.object({
  name: text.min(2).max(100),
  email: z
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(10).max(128),
  consent: z.literal(true),
});
export const loginSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(128),
});
export const tripSchema = z
  .object({
    name: text.max(120),
    destination: text.max(80),
    startDate: date,
    endDate: date,
    travelers: z.number().int().min(1).max(50),
    bufferMinutes: z.number().int().min(0).max(480),
    restMinutes: z.number().int().min(0).max(240),
    items: z
      .array(
        z.object({
          activityId: text.min(1).max(100),
          sessionId: text.max(100),
          participants: z.number().int().min(1).max(50),
        }),
      )
      .max(20),
  })
  .refine(
    (t) =>
      t.endDate >= t.startDate && Date.parse(t.endDate) - Date.parse(t.startDate) <= 30 * 86400000,
    'invalid_dates',
  )
  .refine(
    (t) => new Set(t.items.map((i) => i.activityId)).size === t.items.length,
    'duplicate_activity',
  );
export const bookingSchema = z.object({
  trip: tripSchema,
  contactName: text.min(2).max(100),
  contactPhone: text.regex(/^[+\d ()-]{8,20}$/),
  contactEmail: z.email().max(254),
  consent: z.literal(true),
  requestKey: z.uuid(),
  kind: z.enum(['trip', 'group']).default('trip'),
});
export const communitySchema = z.object({
  name: text.min(3).max(150),
  province: text.min(2).max(80),
  description: text.min(20).max(2000),
  verificationInfo: text.min(10).max(2000),
  consent: z.literal(true),
});
export const activitySchema = z
  .object({
    id: text.max(100).optional(),
    title_th: text.min(5).max(150),
    title_en: text.min(5).max(150),
    description_th: text.min(20).max(5000),
    description_en: text.min(20).max(5000),
    province: text.min(2).max(80),
    category: z.enum(['food', 'craft', 'culture', 'nature', 'community', 'workshop']),
    price_satang: z.number().int().min(100).max(10000000),
    duration_minutes: z.number().int().min(30).max(720),
    min_participants: z.number().int().min(1).max(50),
    max_participants: z.number().int().min(1).max(50),
    min_age: z.number().int().min(0).max(21),
    image: z.enum([
      '/images/cooking.webp',
      '/images/pottery.webp',
      '/images/indigo.webp',
      '/images/cacao.webp',
      '/images/paddleboard.webp',
      '/images/amphawa.webp',
    ]),
    included_th: text.min(5).max(1000),
    included_en: text.min(5).max(1000),
    safety_th: text.min(10).max(2000),
    safety_en: text.min(10).max(2000),
    cancellation_th: text.min(10).max(1000),
    cancellation_en: text.min(10).max(1000),
    status: z.enum(['draft', 'published', 'inactive']),
  })
  .refine((a) => a.max_participants >= a.min_participants, 'invalid_participants');
export const sessionSchema = z
  .object({
    activityId: text.min(1).max(100),
    date,
    time: text.regex(/^\d{2}:\d{2}$/),
    capacity: z.number().int().min(1).max(50),
    group: z.boolean(),
  })
  .refine((s) => +s.time.slice(0, 2) < 24 && +s.time.slice(3) < 60, 'invalid_time');
