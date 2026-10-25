ALTER TABLE bookings ADD COLUMN trip_id TEXT REFERENCES trips(id);
CREATE INDEX IF NOT EXISTS bookings_trip ON bookings(trip_id);
ALTER TABLE booking_items ADD COLUMN title_th_snapshot TEXT NOT NULL DEFAULT '';
ALTER TABLE booking_items ADD COLUMN title_en_snapshot TEXT NOT NULL DEFAULT '';
UPDATE booking_items SET title_th_snapshot=(SELECT title_th FROM activities WHERE activities.id=booking_items.activity_id),title_en_snapshot=(SELECT title_en FROM activities WHERE activities.id=booking_items.activity_id);
