-- Error reports from browsers: anyone may send one, reports are folded into daily counts without identifiers,
-- invalid ones are ignored, and only staff can read them. Runs against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('t.member_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.founder_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'maturehumanity' AND deleted_at IS NULL LIMIT 1), true);
DELETE FROM public.client_error_reports;

-- ---- a visitor (anon) sends reports -----------------------------------------------------------------------------
SET LOCAL ROLE anon;
SELECT public.record_client_error('{"kind":"render","message":"Boom","route":"/matters/0f8fad5b-d9cb-469f-a165-70867728950e?x=1","releaseId":"r1","appVersion":"0.1.243","stack":"Error: Boom\n at x"}');
SELECT public.record_client_error('{"kind":"render","message":"Boom","route":"/matters/7c9e6679-7425-40de-944b-e07fc1f90ae7","releaseId":"r1","appVersion":"0.1.243"}');
SELECT public.record_client_error('{"kind":"nonsense","message":"ignored","route":"/"}');
SELECT public.record_client_error('{"kind":"window","message":"   ","route":"/"}');
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.client_error_reports;
    RAISE EXCEPTION 'anon read client_error_reports';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

RESET ROLE;
DO $$
DECLARE r record;
BEGIN
  IF (SELECT count(*) FROM public.client_error_reports) <> 1 THEN
    RAISE EXCEPTION 'expected one folded row, got %', (SELECT count(*) FROM public.client_error_reports);
  END IF;
  SELECT * INTO r FROM public.client_error_reports;
  IF r.route <> '/matters/:id' THEN RAISE EXCEPTION 'route not folded: %', r.route; END IF;
  IF r.occurrences <> 2 THEN RAISE EXCEPTION 'occurrences %', r.occurrences; END IF;
END $$;

-- ---- a member may send but not read ----------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.member_uid'), 'role', 'authenticated')::text, true);
SELECT public.record_client_error('{"kind":"promise","message":"Network down","route":"/","releaseId":"r1","appVersion":"0.1.243"}');
DO $$
BEGIN
  BEGIN
    PERFORM * FROM public.client_error_summary(7);
    RAISE EXCEPTION 'member read the error summary';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

-- ---- staff read the summary --------------------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.founder_uid'), 'role', 'authenticated')::text, true);
DO $$
DECLARE top record;
BEGIN
  SELECT * INTO top FROM public.client_error_summary(7) LIMIT 1;
  IF top.message <> 'Boom' OR top.occurrences <> 2 THEN RAISE EXCEPTION 'unexpected top error: % x%', top.message, top.occurrences; END IF;
  IF (SELECT count(*) FROM public.client_error_summary(7)) <> 2 THEN RAISE EXCEPTION 'expected two errors in the summary'; END IF;
END $$;

-- ---- bounded: past 1000 distinct rows a day no new row is added, but known errors still count -----------------
RESET ROLE;
INSERT INTO public.client_error_reports (day, kind, message, route, release_id, app_version)
SELECT current_date, 'window', 'filler ' || g, '/', 'r1', 'v' FROM generate_series(1, 998) g;  -- with the two above: 1000
SET LOCAL ROLE anon;
SELECT public.record_client_error('{"kind":"window","message":"one too many","route":"/","releaseId":"r1","appVersion":"v"}');
SELECT public.record_client_error('{"kind":"render","message":"Boom","route":"/matters/9b2e1c3a-1111-4222-8333-444455556666","releaseId":"r1","appVersion":"0.1.243"}');
RESET ROLE;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.client_error_reports WHERE message = 'one too many') THEN
    RAISE EXCEPTION 'a distinct row was added past the daily bound';
  END IF;
  IF (SELECT occurrences FROM public.client_error_reports WHERE message = 'Boom') <> 3 THEN
    RAISE EXCEPTION 'a known error stopped counting at the bound';
  END IF;
  RAISE NOTICE 'ok: client error reports';
END $$;

ROLLBACK;
