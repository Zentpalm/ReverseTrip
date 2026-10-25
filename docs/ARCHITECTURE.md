# Architecture and business decisions

## Request boundaries

The Next App Router serves real routes. `src/app/api/[...path]/route.ts` is the HTTP boundary: JSON size/type validation, same-origin checks, cookie extraction, session validation and service dispatch. Private pages also check sessions on the server before rendering. Client-side guards are only presentation helpers.

The browser never receives database credentials, password hashes, private session tokens in JSON, other travelers' records or community verification submissions. The session token is random, stored as a SHA-256 hash in `auth_sessions`, expires in seven days and is revoked on logout. Passwords are salted scrypt hashes. An administrator role is assigned only through the local privileged CLI. This custom auth implementation is a documented departure from the suggested Supabase Auth stack and needs an independent security review before public use.

## Data ownership

Travelers own their saved trip and bookings. Each host owns one community and can edit only its activities/sessions and see only its booking items. Administrators review community submissions. Suspending a community hides its activities from the public catalog and prevents new publication. Existing bookings retain their lifecycle and contact information so the organizer can handle them.

The database schema uses foreign keys, constraints, indexes and numbered migration history. SQLite is the tested local backend. Both standalone statements and transactions share a per-process queue so unrelated reads/writes cannot join another request's open transaction or rollback. Transaction callbacks use their supplied database handle. The PostgreSQL adapter uses the same SQL schema, separate transaction connections, row locks and parameterized SQL. PostgreSQL/Supabase deployment remains unverified without a configured service. Optional Supabase Data API lockdown guidance is in `migrations/postgres`.

## Trip and booking persistence

Guest drafts are stored in localStorage; auth credentials are not. Signed-in users explicitly save a trip to the database. Revision checks prevent overwriting a newer saved version. When both a device draft and saved account trip exist, the device draft is retained and the user is told that Save replaces the account version. Logout clears the device draft.

Bookings contain an immutable trip JSON snapshot, optional saved-trip foreign key, listed prices and title snapshots, selected sessions, participant counts, a financial configuration snapshot, request key and fingerprint. The user's future trip edits do not alter previous bookings.

A booking transaction verifies published/approved activities, valid future sessions, participant bounds, itinerary constraints and capacity. It reserves seats with a conditional update. Identical requests are idempotent; altered quantities cannot create a second active request for the same activity/session. PostgreSQL reserves session rows in stable order. Rejections/cancellations release seats and recalculate remaining booking amounts. Pending and confirmed requests reserve capacity; automatic expiration is not implemented.

## Financial rules

All persisted amounts are integer satang. Distinct eligible activity IDs determine discount eligibility. Tiers are 2 activities/฿1,500/1%, 3/฿2,500/2%, and 4+/฿4,000/3%. The highest qualifying tier wins; the discount is capped at ฿150. Four activities at ฿3,000 therefore qualify for 2%. Duplicate activity rows are rejected by trip validation and not counted again by the calculation engine.

The proposed commission is 12% of listed booked activity value before discount; expected host share is 88%, before host costs. Eligibility flags control bundle participation. The platform funds the discount from commission. Largest-remainder allocation makes line-level commission and host amounts reconcile exactly to the rounded trip totals. The remaining platform amount is contribution before payment fees and other expenses, not profit.

Rules are stored in `discount_rules` and snapshotted per booking. Public promotions remain disabled in production mode while no real payment workflow is implemented. Production cannot be activated by reusing a database marked as demo.

## Planning

The deterministic planner chooses recorded future sessions in the user's preferred order, checks capacity, date windows, overlap and configurable rest/travel intervals. The display timeline is chronological. Different provinces are not scheduled on the same day. Coordinates are retained in the schema for a future mapping provider but no driving distance or real-time traffic is invented.

An unschedulable activity remains explicit in the issues list rather than receiving an invented time. Manual session selection and preferred reordering are available in My Trip. `PlanningProvider` and `validateSuggestedTrip` are extension points for future AI. AI output would still have to pass catalog, availability and server pricing checks.

## External integrations

`src/server/integrations.ts` defines payment, payout, image-storage and AI-validation contracts. These are interfaces, not live integrations. Marketplace payments will require verified webhook signatures, amount/currency checks, idempotent event handling, provider-connected host accounts and approved payout/refund policies. No browser action can mark a booking paid in this version.
