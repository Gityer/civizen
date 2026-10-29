-- PM decision TD4: per-account limits on posts, comments, new conversations, messages and reports. Limits are lowered
-- to 2 inside this transaction so the test stays small. Runs against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('t.member_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.member_pid', (SELECT id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.citizen_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.citizen_pid', (SELECT id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.other1_pid', (SELECT id::text FROM public.profiles WHERE username = 'verified_member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.other2_pid', (SELECT id::text FROM public.profiles WHERE username = 'moderator' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.matter_id', (SELECT id::text FROM public.matters WHERE visibility = 'public' ORDER BY created_at LIMIT 1), true);

UPDATE public.rate_limits SET max_count = 2;
DELETE FROM public.rate_limit_events
 WHERE profile_id IN (current_setting('t.member_pid')::uuid, current_setting('t.citizen_pid')::uuid);

INSERT INTO public.posts (id, author_id, content) VALUES
  ('7b000000-0000-4000-8000-000000000001', current_setting('t.citizen_pid')::uuid, 'Rate limit target 1'),
  ('7b000000-0000-4000-8000-000000000002', current_setting('t.citizen_pid')::uuid, 'Rate limit target 2'),
  ('7b000000-0000-4000-8000-000000000003', current_setting('t.citizen_pid')::uuid, 'Rate limit target 3');

-- Asserts that the statement is refused with PT429 for the given action.
CREATE FUNCTION pg_temp.expect_limited(p_sql text, p_action text, p_label text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_detail text; v_hint text;
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN SQLSTATE 'PT429' THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL, v_hint = PG_EXCEPTION_HINT;
    IF v_detail IS DISTINCT FROM p_action THEN RAISE EXCEPTION '%: limited as %, expected %', p_label, v_detail, p_action; END IF;
    IF v_hint IS NULL OR v_hint::timestamptz <= now() THEN RAISE EXCEPTION '%: no future retry time (%)', p_label, v_hint; END IF;
    RETURN;
  END;
  RAISE EXCEPTION '%: was not limited', p_label;
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.member_uid'), 'role', 'authenticated')::text, true);

-- ---- posts ---------------------------------------------------------------------------------------------------------
INSERT INTO public.posts (author_id, content) VALUES (current_setting('t.member_pid')::uuid, 'one'), (current_setting('t.member_pid')::uuid, 'two');
SELECT pg_temp.expect_limited(format('INSERT INTO public.posts (author_id, content) VALUES (%L, %L)', current_setting('t.member_pid'), 'three'), 'post', 'third post');

-- ---- comments: one bucket across posts, Matters and Solutions -------------------------------------------------------
INSERT INTO public.post_comments (post_id, author_id, content) VALUES
  ('7b000000-0000-4000-8000-000000000001', current_setting('t.member_pid')::uuid, 'c1'),
  ('7b000000-0000-4000-8000-000000000001', current_setting('t.member_pid')::uuid, 'c2');
SELECT pg_temp.expect_limited(format('INSERT INTO public.post_comments (post_id, author_id, content) VALUES (%L, %L, %L)',
  '7b000000-0000-4000-8000-000000000001', current_setting('t.member_pid'), 'c3'), 'comment', 'third post comment');

-- ---- new conversations: reopening an existing one is not counted ---------------------------------------------------
SELECT public.private_get_or_create_direct_conversation(current_setting('t.citizen_pid')::uuid);
SELECT public.private_get_or_create_direct_conversation(current_setting('t.citizen_pid')::uuid);
SELECT public.private_get_or_create_direct_conversation(current_setting('t.other1_pid')::uuid);
SELECT pg_temp.expect_limited(format('SELECT public.private_get_or_create_direct_conversation(%L)', current_setting('t.other2_pid')),
  'conversation', 'third new conversation');

-- ---- messages ------------------------------------------------------------------------------------------------------
SELECT set_config('t.conversation_id', public.private_get_or_create_direct_conversation(current_setting('t.citizen_pid')::uuid)::text, true);
INSERT INTO public.private_messages (conversation_id, sender_id, content) VALUES
  (current_setting('t.conversation_id')::uuid, current_setting('t.member_pid')::uuid, 'm1'),
  (current_setting('t.conversation_id')::uuid, current_setting('t.member_pid')::uuid, 'm2');
SELECT pg_temp.expect_limited(format('INSERT INTO public.private_messages (conversation_id, sender_id, content) VALUES (%L, %L, %L)',
  current_setting('t.conversation_id'), current_setting('t.member_pid'), 'm3'), 'message', 'third message');

-- ---- reports: a repeated report of the same item is not counted -----------------------------------------------------
SELECT public.report_content('post', '7b000000-0000-4000-8000-000000000001', 'spam', NULL);
SELECT public.report_content('post', '7b000000-0000-4000-8000-000000000001', 'spam', 'again');
SELECT public.report_content('post', '7b000000-0000-4000-8000-000000000002', 'spam', NULL);
SELECT pg_temp.expect_limited(format('SELECT public.report_content(%L, %L, %L, NULL)', 'post', '7b000000-0000-4000-8000-000000000003', 'spam'),
  'report', 'third report');

-- ---- another member has their own quota ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.citizen_uid'), 'role', 'authenticated')::text, true);
INSERT INTO public.posts (author_id, content) VALUES (current_setting('t.citizen_pid')::uuid, 'citizen is not limited by member');

-- ---- as the member again, outside RLS: deleting posts does not give the quota back; Matter comments share the bucket -
RESET ROLE;
DELETE FROM public.posts WHERE author_id = current_setting('t.member_pid')::uuid;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.member_uid'), 'role', 'authenticated')::text, true);
SELECT pg_temp.expect_limited(format('INSERT INTO public.posts (author_id, content) VALUES (%L, %L)', current_setting('t.member_pid'), 'after delete'),
  'post', 'post after deleting the earlier ones');
DO $$
BEGIN
  IF current_setting('t.matter_id', true) IS NULL OR current_setting('t.matter_id') = '' THEN
    RAISE EXCEPTION 'fixture public Matter missing';
  END IF;
END $$;
SELECT pg_temp.expect_limited(format('INSERT INTO public.matter_comments (matter_id, author_kind, author_profile_id, body) VALUES (%L, %L, %L, %L)',
  current_setting('t.matter_id'), 'person', current_setting('t.member_pid'), 'matter comment'), 'comment', 'Matter comment in a full bucket');

-- ---- server work (no member in the request) is never limited ------------------------------------------------------
SELECT set_config('request.jwt.claims', '', true);
INSERT INTO public.posts (author_id, content)
SELECT current_setting('t.member_pid')::uuid, 'server ' || g FROM generate_series(1, 5) g;

-- ---- members cannot read or change the limits or the counters ------------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.member_uid'), 'role', 'authenticated')::text, true);
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.rate_limit_events LIMIT 1;
    RAISE EXCEPTION 'member read rate_limit_events';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.rate_limits SET max_count = 1000;
    RAISE EXCEPTION 'member changed rate_limits';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.enforce_rate_limit('post');
    RAISE EXCEPTION 'member called enforce_rate_limit directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

RESET ROLE;
DO $$ BEGIN RAISE NOTICE 'ok: account action rate limits'; END $$;

ROLLBACK;
