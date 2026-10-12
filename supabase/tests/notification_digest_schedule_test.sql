-- v2 step A3: the digest schedule is server-only, logs every tick, and only staff read the run log.
-- Run with scripts/local-supabase/run-sql-tests.sh against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('test.member_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.founder_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'maturehumanity' AND deleted_at IS NULL LIMIT 1), true);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notification_digest_tick' AND schedule = '0 6 * * *') THEN
    RAISE EXCEPTION 'digest is not scheduled daily at 06:00';
  END IF;
  RAISE NOTICE 'ok: digest scheduled daily at 06:00 UTC';
END $$;

-- without configuration the tick logs not_configured and returns no request
DELETE FROM public.notification_digest_config;
DO $$
BEGIN
  IF public.notification_digest_tick() IS NOT NULL THEN RAISE EXCEPTION 'tick sent a request without configuration'; END IF;
  IF (SELECT status FROM public.notification_digest_runs ORDER BY id DESC LIMIT 1) <> 'not_configured' THEN
    RAISE EXCEPTION 'unconfigured tick was not logged';
  END IF;
  RAISE NOTICE 'ok: unconfigured tick logged';
END $$;

-- with configuration it hands a request to pg_net and logs it
INSERT INTO public.notification_digest_config (function_url, cron_secret) VALUES ('http://127.0.0.1:9/notification-digest', 'test-secret');
DO $$
BEGIN
  IF public.notification_digest_tick() IS NULL THEN RAISE EXCEPTION 'configured tick did not queue a request'; END IF;
  IF (SELECT status FROM public.notification_digest_runs ORDER BY id DESC LIMIT 1) <> 'requested' THEN
    RAISE EXCEPTION 'configured tick was not logged as requested';
  END IF;
  RAISE NOTICE 'ok: configured tick queued and logged';
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member_uid'))::text, true);
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.notification_digest_config;
    RAISE EXCEPTION 'member read the digest configuration';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.notification_digest_tick();
    RAISE EXCEPTION 'member ran the digest tick';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM * FROM public.notification_digest_recent_runs(5);
    RAISE EXCEPTION 'member read the digest run log';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'ok: members cannot read config, run the tick or read the log';
END $$;

SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.founder_uid'))::text, true);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.notification_digest_recent_runs(5)) < 2 THEN
    RAISE EXCEPTION 'staff cannot read the digest run log';
  END IF;
  RAISE NOTICE 'ok: staff read the run log';
END $$;
RESET ROLE;

ROLLBACK;
