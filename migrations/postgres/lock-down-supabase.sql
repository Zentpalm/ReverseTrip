-- Optional and untested provider-specific hardening for a dedicated Supabase DB.
-- Run manually as the owner only after reviewing server-role permissions.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['schema_migrations','app_environment','users','auth_sessions','rate_limits','communities','activities','activity_images','activity_sessions','trips','trip_items','itinerary_items','discount_rules','bookings','booking_items','group_participation_requests','audit_log']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC',table_name);
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon',table_name);
    END IF;
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated',table_name);
    END IF;
  END LOOP;
END $$;
