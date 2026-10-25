# PostgreSQL / Supabase database access

The numbered migrations in the parent directory use SQL supported by both PostgreSQL and SQLite. `DATABASE_URL` selects the PostgreSQL `pg` adapter. This adapter was implemented but no PostgreSQL service was available for integration testing.

Use a **dedicated private database** and keep its connection string on the server. The browser never connects to PostgreSQL or Supabase Data API. User/host ownership checks occur in the server service layer on every operation. PostgreSQL booking transactions additionally lock the user and booking records and reserve capacity with conditional updates.

If choosing a Supabase-managed PostgreSQL database, do not expose these tables through its public Data API. `lock-down-supabase.sql` enables RLS and removes direct access from the `anon` and `authenticated` roles for only ReverseTrip tables. It is optional, provider-specific, and has not been run here. Run it as the database owner after migrations. The server connection must be an authorized owner role or a backend role with explicitly reviewed policies; do not put this connection in any `NEXT_PUBLIC_*` variable.

Supabase Auth and Storage are **not connected**. Authentication currently uses ReverseTrip's own server sessions. Migrating to a hosted auth provider requires a separate implementation and migration plan; changing the database URL does not change the authentication provider.
