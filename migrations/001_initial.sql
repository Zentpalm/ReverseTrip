CREATE TABLE IF NOT EXISTS app_environment (id TEXT PRIMARY KEY, mode TEXT NOT NULL CHECK(mode IN ('demo','production')));
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
 password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'traveler' CHECK(role IN ('traveler','host','admin')),
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_sessions_user ON auth_sessions(user_id);
CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, reset_at BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS communities (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL UNIQUE REFERENCES users(id), name TEXT NOT NULL, province TEXT NOT NULL,
 description TEXT NOT NULL, verification_info TEXT NOT NULL,
 verification TEXT NOT NULL DEFAULT 'pending' CHECK(verification IN ('pending','verified','rejected','suspended')),
 demo INTEGER NOT NULL DEFAULT 0 CHECK(demo IN (0,1)), image TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS activities (
 id TEXT PRIMARY KEY, community_id TEXT NOT NULL REFERENCES communities(id),
 title_th TEXT NOT NULL, title_en TEXT NOT NULL, description_th TEXT NOT NULL, description_en TEXT NOT NULL,
 category TEXT NOT NULL CHECK(category IN ('food','craft','culture','nature','community','workshop')), province TEXT NOT NULL,
 latitude REAL NOT NULL DEFAULT 0, longitude REAL NOT NULL DEFAULT 0,
 duration_minutes INTEGER NOT NULL CHECK(duration_minutes>0), price_satang INTEGER NOT NULL CHECK(price_satang>=0),
 min_participants INTEGER NOT NULL CHECK(min_participants>0), max_participants INTEGER NOT NULL CHECK(max_participants>=min_participants),
 min_age INTEGER NOT NULL DEFAULT 0, image TEXT NOT NULL,
 included_th TEXT NOT NULL, included_en TEXT NOT NULL, safety_th TEXT NOT NULL, safety_en TEXT NOT NULL,
 cancellation_th TEXT NOT NULL, cancellation_en TEXT NOT NULL,
 eligible INTEGER NOT NULL DEFAULT 1 CHECK(eligible IN (0,1)), demo INTEGER NOT NULL DEFAULT 0 CHECK(demo IN (0,1)),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','inactive')), created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS activities_community ON activities(community_id);
CREATE INDEX IF NOT EXISTS activities_search ON activities(status,province,category);
CREATE TABLE IF NOT EXISTS activity_images (id TEXT PRIMARY KEY, activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE, url TEXT NOT NULL, position INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS activity_sessions (
 id TEXT PRIMARY KEY, activity_id TEXT NOT NULL REFERENCES activities(id), starts_at TEXT NOT NULL, ends_at TEXT NOT NULL,
 capacity INTEGER NOT NULL CHECK(capacity>0), reserved INTEGER NOT NULL DEFAULT 0 CHECK(reserved>=0 AND reserved<=capacity),
 group_mode INTEGER NOT NULL DEFAULT 0 CHECK(group_mode IN (0,1)), status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
 UNIQUE(activity_id,starts_at), CHECK(ends_at>starts_at)
);
CREATE INDEX IF NOT EXISTS sessions_activity_date ON activity_sessions(activity_id,starts_at);
CREATE TABLE IF NOT EXISTS trips (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
 data_json TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS trip_items (
 id TEXT PRIMARY KEY, trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
 activity_id TEXT NOT NULL REFERENCES activities(id), session_id TEXT REFERENCES activity_sessions(id),
 participants INTEGER NOT NULL CHECK(participants>0), position INTEGER NOT NULL, UNIQUE(trip_id,activity_id)
);
CREATE TABLE IF NOT EXISTS itinerary_items (
 id TEXT PRIMARY KEY, trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
 activity_id TEXT REFERENCES activities(id), kind TEXT NOT NULL, starts_at TEXT NOT NULL, ends_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS discount_rules (id TEXT PRIMARY KEY, config_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS bookings (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), trip_name TEXT NOT NULL, trip_json TEXT NOT NULL,
 request_key TEXT NOT NULL, fingerprint TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('trip','group')),
 status TEXT NOT NULL CHECK(status IN ('pending','confirmed','rejected','cancelled','completed')),
 payment_status TEXT NOT NULL DEFAULT 'not_collected' CHECK(payment_status='not_collected'),
 contact_name TEXT NOT NULL, contact_phone TEXT NOT NULL, contact_email TEXT NOT NULL,
 config_json TEXT NOT NULL, totals_json TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(user_id,request_key)
);
CREATE INDEX IF NOT EXISTS bookings_user ON bookings(user_id,created_at);
CREATE INDEX IF NOT EXISTS bookings_fingerprint ON bookings(user_id,fingerprint);
CREATE TABLE IF NOT EXISTS booking_items (
 id TEXT PRIMARY KEY, booking_id TEXT NOT NULL REFERENCES bookings(id), activity_id TEXT NOT NULL REFERENCES activities(id),
 session_id TEXT NOT NULL REFERENCES activity_sessions(id), community_id TEXT NOT NULL REFERENCES communities(id),
 participants INTEGER NOT NULL CHECK(participants>0), price_satang INTEGER NOT NULL CHECK(price_satang>=0), eligible INTEGER NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('pending','confirmed','rejected','cancelled','completed')), UNIQUE(booking_id,activity_id)
);
CREATE INDEX IF NOT EXISTS booking_items_host ON booking_items(community_id,status);
CREATE TABLE IF NOT EXISTS group_participation_requests (
 id TEXT PRIMARY KEY, booking_item_id TEXT NOT NULL UNIQUE REFERENCES booking_items(id), user_id TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES users(id), action TEXT NOT NULL, target_id TEXT NOT NULL, created_at TEXT NOT NULL);
