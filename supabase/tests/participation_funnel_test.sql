-- v2 step B5 (E4): page views are anonymous daily counters per page pattern; only staff read the funnel.
-- Run with scripts/local-supabase/run-sql-tests.sh against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('t.member_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.founder_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'maturehumanity' AND deleted_at IS NULL LIMIT 1), true);

DO $$
BEGIN
  IF public.participation_path_bucket('/governance/voting/daa8fc40-fa89-4409-82b0-64e250674b6f?ref=x') <> '/governance/voting/:id' THEN
    RAISE EXCEPTION 'uuid not folded: %', public.participation_path_bucket('/governance/voting/daa8fc40-fa89-4409-82b0-64e250674b6f?ref=x');
  END IF;
  IF public.participation_path_bucket('https://evil.example/x') IS NOT NULL THEN RAISE EXCEPTION 'external url accepted'; END IF;
  RAISE NOTICE 'ok: paths fold to patterns';
END $$;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
DO $$
BEGIN
  PERFORM public.record_page_view('/matters');
  PERFORM public.record_page_view('/matters');
  BEGIN
    PERFORM 1 FROM public.participation_page_views;
    RAISE EXCEPTION 'anon read page views';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.participation_funnel(30);
    RAISE EXCEPTION 'anon read the funnel';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'ok: visitors count but cannot read';
END $$;
RESET ROLE;

DO $$
BEGIN
  IF (SELECT views FROM public.participation_page_views WHERE day = current_date AND path_bucket = '/matters') < 2 THEN
    RAISE EXCEPTION 'page views not counted';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'participation_page_views'
              AND column_name NOT IN ('day', 'path_bucket', 'views')) THEN
    RAISE EXCEPTION 'page view table stores more than day, pattern and count';
  END IF;
  RAISE NOTICE 'ok: only day, pattern and count are stored';
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.member_uid'), 'role', 'authenticated')::text, true);
DO $$
BEGIN
  BEGIN
    PERFORM public.participation_funnel(30);
    RAISE EXCEPTION 'member read the funnel';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'ok: members cannot read the funnel';
END $$;

SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.founder_uid'), 'role', 'authenticated')::text, true);
DO $$
DECLARE v jsonb := public.participation_funnel(30);
BEGIN
  IF jsonb_array_length(v->'daily') <> 30 THEN RAISE EXCEPTION 'daily series has % days', jsonb_array_length(v->'daily'); END IF;
  IF NOT (v->'totals' ? 'members' AND v->'totals' ? 'ballots_countable') THEN RAISE EXCEPTION 'totals missing'; END IF;
  RAISE NOTICE 'ok: staff read the funnel';
END $$;
RESET ROLE;

ROLLBACK;
