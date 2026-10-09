-- Profiles are not readable without signing in; the login lookup is service-role only; the public
-- RPCs that guests rely on still answer. Runs against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('test.member_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);

-- ---- 1. anonymous visitor ---------------------------------------------------------------------
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);

DO $$
DECLARE n integer;
BEGIN
  BEGIN
    SELECT count(*) INTO n FROM public.profiles;
    IF n > 0 THEN RAISE EXCEPTION 'anon can read % profile rows', n; END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    n := 0;
  END;
  RAISE NOTICE 'ok: anon reads no profile rows';
END $$;

DO $$
BEGIN
  PERFORM public.resolve_login_email('member');
  RAISE EXCEPTION 'anon resolved a login e-mail';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'ok: anon cannot resolve login e-mails';
END $$;

-- public job board and directory search still answer for guests
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.list_public_market_job_listings('seeker');
  RAISE NOTICE 'ok: guest job board answers (% rows)', n;
END $$;

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.search_civizen_directory('mem');
  RAISE NOTICE 'ok: guest directory search answers (% rows)', n;
END $$;

-- ---- 2. signed-in member ----------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member_uid'), 'role', 'authenticated')::text, true);

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.profiles;
  IF n = 0 THEN RAISE EXCEPTION 'member cannot read profiles'; END IF;
  RAISE NOTICE 'ok: member reads profiles (% rows)', n;
END $$;

DO $$
BEGIN
  PERFORM public.resolve_login_email('member');
  RAISE EXCEPTION 'member resolved a login e-mail';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'ok: member cannot resolve login e-mails either';
END $$;

-- ---- 3. service role (edge function) ----------------------------------------------------------
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
DO $$
DECLARE e text;
BEGIN
  SELECT public.resolve_login_email('member') INTO e;
  IF e IS NULL OR e = '' THEN RAISE EXCEPTION 'service role got no e-mail'; END IF;
  RAISE NOTICE 'ok: service role resolves the login e-mail';
END $$;

RESET ROLE;
ROLLBACK;
