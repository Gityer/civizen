-- v2 step A6 (E2): report → queue → hide with a reason → author sees it, others do not → one appeal → a different
-- moderator decides → overturn restores. Runs against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('t.member_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.member_pid', (SELECT id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.citizen_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.citizen_pid', (SELECT id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.mod_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'moderator' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.founder_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'maturehumanity' AND deleted_at IS NULL LIMIT 1), true);

INSERT INTO public.posts (id, author_id, content) VALUES ('7a000000-0000-4000-8000-000000000001', current_setting('t.citizen_pid')::uuid, 'Reported post');
INSERT INTO public.posts (id, author_id, content) VALUES ('7a000000-0000-4000-8000-000000000002', current_setting('t.member_pid')::uuid, 'Own post');

SET LOCAL ROLE authenticated;

-- ---- member reports ------------------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.member_uid'), 'role', 'authenticated')::text, true);
DO $$
DECLARE a uuid; b uuid;
BEGIN
  a := public.report_content('post', '7a000000-0000-4000-8000-000000000001', 'spam', 'Advertising');
  b := public.report_content('post', '7a000000-0000-4000-8000-000000000001', 'spam', 'again');
  IF a <> b THEN RAISE EXCEPTION 'a second open report from the same member was created'; END IF;
  BEGIN
    PERFORM public.report_content('post', '7a000000-0000-4000-8000-000000000002', 'spam', NULL);
    RAISE EXCEPTION 'member reported own post';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM public.report_content('post', '7a000000-0000-4000-8000-000000000001', 'not-a-reason', NULL);
    RAISE EXCEPTION 'unknown reason accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM * FROM public.moderation_queue();
    RAISE EXCEPTION 'member opened the moderation queue';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.moderation_hide('post', '7a000000-0000-4000-8000-000000000001', 'spam', NULL);
    RAISE EXCEPTION 'member hid content';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'ok: member reports once, cannot report own content or moderate';
END $$;

-- ---- moderator hides -----------------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.mod_uid'), 'role', 'authenticated')::text, true);
DO $$
DECLARE v_action uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.moderation_queue() WHERE target_kind = 'post' AND target_id = '7a000000-0000-4000-8000-000000000001' AND report_count = 1) THEN
    RAISE EXCEPTION 'reported post missing from the queue';
  END IF;
  PERFORM public.moderation_claim('post', '7a000000-0000-4000-8000-000000000001');
  v_action := public.moderation_hide('post', '7a000000-0000-4000-8000-000000000001', 'spam', 'Commercial spam');
  PERFORM set_config('t.action', v_action::text, true);
  IF EXISTS (SELECT 1 FROM public.moderation_queue() WHERE target_id = '7a000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'resolved target still in the queue';
  END IF;
  RAISE NOTICE 'ok: moderator claims and hides';
END $$;

SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.member_uid'), 'role', 'authenticated')::text, true);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.posts WHERE id = '7a000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'hidden post visible to another member'; END IF;
  RAISE NOTICE 'ok: hidden post invisible to others';
END $$;

-- ---- author sees it, appeals once ----------------------------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.citizen_uid'), 'role', 'authenticated')::text, true);
DO $$
BEGIN
  IF (SELECT moderation_reason FROM public.posts WHERE id = '7a000000-0000-4000-8000-000000000001') <> 'spam' THEN RAISE EXCEPTION 'author does not see the reason'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_notifications WHERE notification_type = 'moderation_hidden' AND entity_id = current_setting('t.action')::uuid) THEN
    RAISE EXCEPTION 'author not notified';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.moderation_actions_list('mine') WHERE id = current_setting('t.action')::uuid) THEN
    RAISE EXCEPTION 'author does not see the action';
  END IF;
  PERFORM public.moderation_appeal(current_setting('t.action')::uuid, 'This is my own event announcement, not an advert.');
  BEGIN
    PERFORM public.moderation_appeal(current_setting('t.action')::uuid, 'again');
    RAISE EXCEPTION 'second appeal accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  RAISE NOTICE 'ok: author sees the reason and appeals once';
END $$;

-- ---- the deciding moderator cannot decide the appeal; another one can ----------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.mod_uid'), 'role', 'authenticated')::text, true);
DO $$
BEGIN
  BEGIN
    PERFORM public.moderation_decide_appeal(current_setting('t.action')::uuid, true, NULL);
    RAISE EXCEPTION 'the original moderator decided the appeal';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'ok: original moderator cannot decide the appeal';
END $$;

SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.founder_uid'), 'role', 'authenticated')::text, true);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.moderation_actions_list('appeals') WHERE id = current_setting('t.action')::uuid) THEN
    RAISE EXCEPTION 'open appeal missing from the appeals list';
  END IF;
  PERFORM public.moderation_decide_appeal(current_setting('t.action')::uuid, true, 'Event announcement, allowed.');
  RAISE NOTICE 'ok: second moderator overturns';
END $$;

SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.member_uid'), 'role', 'authenticated')::text, true);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.posts WHERE id = '7a000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'overturned post still hidden'; END IF;
  BEGIN
    INSERT INTO public.moderation_actions (target_kind, target_id, reason_code) VALUES ('post', gen_random_uuid(), 'spam');
    RAISE EXCEPTION 'member wrote a moderation action directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'ok: overturned post visible again; actions are not writable directly';
END $$;
RESET ROLE;

ROLLBACK;
