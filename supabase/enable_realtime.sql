-- Run once in the Supabase SQL Editor. This enables the tables used by the
-- website and admin dashboard to publish changes to Supabase Realtime.
DO $$
DECLARE
  table_name TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE EXCEPTION 'Supabase publication supabase_realtime does not exist';
  END IF;

  FOREACH table_name IN ARRAY ARRAY[
    'profiles',
    'brands',
    'models',
    'repair_requests',
    'repair_status_history',
    'drivers',
    'shop_categories',
    'shop_products',
    'shop_orders',
    'occasion_products',
    'site_visits'
  ] LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = table_name
      ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
    END IF;
  END LOOP;
END $$;
