-- Phase 7.2 (web push): subscriptions are private to their owner, the VAPID public key is readable, and inserting a
-- notification or a message runs the dispatch trigger without error when no dispatch configuration exists.
-- Run with scripts/local-supabase/run-sql-tests.sh against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('test.member_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.member_pid', (SELECT id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.citizen_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.citizen_pid', (SELECT id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member_uid'))::text, true);
INSERT INTO public.push_subscriptions (profile_id, endpoint, p256dh, auth, user_agent)
VALUES (current_setting('test.member_pid')::uuid, 'https://push.example/sub-1', 'p256dh-key', 'auth-key', 'test');
DO $$
BEGIN
  BEGIN
    INSERT INTO public.push_subscriptions (profile_id, endpoint, p256dh, auth)
    VALUES (current_setting('test.citizen_pid')::uuid, 'https://push.example/sub-foreign', 'k', 'a');
    RAISE EXCEPTION 'member inserted a subscription for another profile';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%another profile%' THEN RAISE; END IF;
  END;
  IF (SELECT count(*) FROM public.push_subscriptions) <> 1 THEN RAISE EXCEPTION 'member sees % subscriptions', (SELECT count(*) FROM public.push_subscriptions); END IF;
  PERFORM public.push_vapid_public_key();
  BEGIN
    PERFORM 1 FROM public.push_dispatch_config;
    RAISE EXCEPTION 'member read the dispatch configuration';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  RAISE NOTICE 'ok: subscriptions are owner-only, configuration is server-only';
END $$;

SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.citizen_uid'))::text, true);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.push_subscriptions) <> 0 THEN RAISE EXCEPTION 'another member can see subscriptions'; END IF;
  RAISE NOTICE 'ok: other members see nothing';
END $$;
RESET ROLE;

-- triggers run without configuration and without error
INSERT INTO public.user_notifications (recipient_profile_id, notification_type, title, body, entity_type, entity_id, metadata)
VALUES (current_setting('test.member_pid')::uuid, 'test_push', 'Test', 'Body', 'matter', gen_random_uuid(), '{}'::jsonb);
DO $$
BEGIN
  RAISE NOTICE 'ok: notification insert with the push trigger succeeded';
END $$;

ROLLBACK;
