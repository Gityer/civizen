-- PM decision TD2: enforcement steps for members (note → warning → content restriction → messaging restriction →
-- suspension), one rung at a time except for severe reasons, each appealable once to a different moderator.
-- Runs against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('t.member_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.member_pid', (SELECT id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.citizen_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.citizen_pid', (SELECT id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.other_pid', (SELECT id::text FROM public.profiles WHERE username = 'verified_member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.civizen_pid', (SELECT id::text FROM public.profiles WHERE username = 'civizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.mod_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'moderator' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.mod_pid', (SELECT id::text FROM public.profiles WHERE username = 'moderator' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.mod2_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'moderator_two' AND deleted_at IS NULL LIMIT 1), true);
DELETE FROM public.member_enforcement_actions
 WHERE profile_id IN (current_setting('t.member_pid')::uuid, current_setting('t.citizen_pid')::uuid, current_setting('t.other_pid')::uuid);
DELETE FROM public.rate_limit_events
 WHERE profile_id IN (current_setting('t.member_pid')::uuid, current_setting('t.citizen_pid')::uuid);
INSERT INTO auth.sessions (id, user_id, created_at, updated_at) VALUES (gen_random_uuid(), current_setting('t.citizen_uid')::uuid, now(), now());

-- Asserts that p_sql fails with the given SQLSTATE (and, for PT403, the given restriction in DETAIL).
CREATE FUNCTION pg_temp.expect_error(p_sql text, p_state text, p_detail text, p_label text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_state text; v_detail text;
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_detail = PG_EXCEPTION_DETAIL;
    IF v_state <> p_state THEN RAISE EXCEPTION '%: expected %, got % (%)', p_label, p_state, v_state, SQLERRM; END IF;
    IF p_detail IS NOT NULL AND v_detail IS DISTINCT FROM p_detail THEN RAISE EXCEPTION '%: detail %, expected %', p_label, v_detail, p_detail; END IF;
    RETURN;
  END;
  RAISE EXCEPTION '%: did not fail', p_label;
END $$;
CREATE FUNCTION pg_temp.as_member(p_uid text) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

SET LOCAL ROLE authenticated;

-- ---- an existing conversation, opened before any restriction ----------------------------------------------------
SELECT pg_temp.as_member(current_setting('t.member_uid'));
SELECT set_config('t.conv', public.private_get_or_create_direct_conversation(current_setting('t.citizen_pid')::uuid)::text, true);

-- ---- only moderators apply steps -----------------------------------------------------------------------------------
SELECT pg_temp.expect_error(format('SELECT public.moderation_enforce(%L, %L, %L, NULL)', current_setting('t.citizen_pid'), 'warning', 'spam'),
  '42501', NULL, 'member applied a step');

SELECT pg_temp.as_member(current_setting('t.mod_uid'));
SELECT pg_temp.expect_error(format('SELECT public.moderation_enforce(%L, %L, %L, NULL)', current_setting('t.mod_pid'), 'warning', 'spam'),
  '42501', NULL, 'moderator applied a step to themselves');
SELECT pg_temp.expect_error(format('SELECT public.moderation_enforce(%L, %L, %L, NULL)', current_setting('t.member_pid'), 'warning', 'other'),
  '22023', NULL, '"other" without a note');

-- ---- one rung at a time ----------------------------------------------------------------------------------------------
SELECT pg_temp.expect_error(format('SELECT public.moderation_enforce(%L, %L, %L, NULL)', current_setting('t.member_pid'), 'content_restriction', 'spam'),
  '22023', NULL, 'content restriction without a warning first');
SELECT public.moderation_enforce(current_setting('t.member_pid')::uuid, 'warning', 'spam', 'Repeated adverts');
SELECT public.moderation_enforce(current_setting('t.member_pid')::uuid, 'content_restriction', 'spam', NULL);

-- ---- a content restriction stops posts, comments and Matters, not conversations ----------------------------------
SELECT pg_temp.as_member(current_setting('t.member_uid'));
SELECT pg_temp.expect_error(format('INSERT INTO public.posts (author_id, content) VALUES (%L, %L)', current_setting('t.member_pid'), 'x'),
  'PT403', 'content_restriction', 'post under a content restriction');
SELECT pg_temp.expect_error(format('SELECT public.create_matter(%L::jsonb)', json_build_object('title', 'A Matter', 'description', 'Blocked Matter',
  'matter_type', 'question', 'addressee_kind', 'organization', 'addressee_profile_id', current_setting('t.civizen_pid'))),
  'PT403', 'content_restriction', 'Matter under a content restriction');
INSERT INTO public.private_messages (conversation_id, sender_id, content)
VALUES (current_setting('t.conv')::uuid, current_setting('t.member_pid')::uuid, 'messages still work');

-- ---- a messaging restriction stops new conversations, not existing ones ------------------------------------------
SELECT pg_temp.as_member(current_setting('t.mod_uid'));
SELECT public.moderation_enforce(current_setting('t.member_pid')::uuid, 'messaging_restriction', 'harassment', NULL);
SELECT pg_temp.as_member(current_setting('t.member_uid'));
SELECT pg_temp.expect_error(format('SELECT public.private_get_or_create_direct_conversation(%L)', current_setting('t.other_pid')),
  'PT403', 'messaging_restriction', 'new conversation under a messaging restriction');
SELECT public.private_get_or_create_direct_conversation(current_setting('t.citizen_pid')::uuid);
INSERT INTO public.private_messages (conversation_id, sender_id, content)
VALUES (current_setting('t.conv')::uuid, current_setting('t.member_pid')::uuid, 'existing conversation still open');

-- ---- only TD2's reasons skip rungs: threats of violence, sexualisation of minors, private information --------------
SELECT pg_temp.as_member(current_setting('t.mod_uid'));
SELECT pg_temp.expect_error(format('SELECT public.moderation_enforce(%L, %L, %L, NULL)', current_setting('t.other_pid'), 'suspension', 'illegal'),
  '22023', NULL, 'illegal content skipped rungs');
SELECT pg_temp.expect_error(format('SELECT public.moderation_enforce(%L, %L, %L, NULL)', current_setting('t.other_pid'), 'suspension', 'sexual'),
  '22023', NULL, 'adult sexual content skipped rungs');
SELECT public.moderation_enforce(current_setting('t.other_pid')::uuid, 'content_restriction', 'child_safety', NULL);
DO $$
BEGIN
  IF NOT ('child_safety' = ANY (public.moderation_reason_codes())) THEN RAISE EXCEPTION 'child_safety is not a reason code'; END IF;
END $$;

-- ---- severe reasons may skip rungs; suspension bans sign-in and ends sessions -------------------------------------
SELECT pg_temp.as_member(current_setting('t.mod_uid'));
SELECT set_config('t.suspension', public.moderation_enforce(current_setting('t.citizen_pid')::uuid, 'suspension', 'violence', 'Threats in comments')::text, true);
RESET ROLE;
DO $$
DECLARE v_ban timestamptz;
BEGIN
  SELECT banned_until INTO v_ban FROM auth.users WHERE id = current_setting('t.citizen_uid')::uuid;
  IF v_ban IS NULL OR v_ban < now() + interval '29 days' THEN RAISE EXCEPTION 'suspension did not ban sign-in for 30 days (%)', v_ban; END IF;
  IF EXISTS (SELECT 1 FROM auth.sessions WHERE user_id = current_setting('t.citizen_uid')::uuid) THEN
    RAISE EXCEPTION 'suspension left a session open';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_notifications WHERE recipient_profile_id = current_setting('t.citizen_pid')::uuid
                  AND notification_type = 'moderation_enforcement') THEN
    RAISE EXCEPTION 'the suspended member was not notified';
  END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.as_member(current_setting('t.citizen_uid'));
SELECT pg_temp.expect_error(format('INSERT INTO public.posts (author_id, content) VALUES (%L, %L)', current_setting('t.citizen_pid'), 'x'),
  'PT403', 'suspension', 'post while suspended (token issued before)');
SELECT pg_temp.expect_error(format('INSERT INTO public.private_messages (conversation_id, sender_id, content) VALUES (%L, %L, %L)',
  current_setting('t.conv'), current_setting('t.citizen_pid'), 'x'), 'PT403', 'suspension', 'message while suspended');

-- ---- appeal once; a different moderator decides; overturning lifts the ban ----------------------------------------
SELECT public.moderation_enforcement_appeal(current_setting('t.suspension')::uuid, 'I did not threaten anyone.');
SELECT pg_temp.expect_error(format('SELECT public.moderation_enforcement_appeal(%L, %L)', current_setting('t.suspension'), 'again'),
  '22023', NULL, 'second appeal');
SELECT pg_temp.expect_error(format('SELECT public.moderation_enforcement_list(%L)', 'appeals'), '42501', NULL, 'member opened the appeals list');
SELECT pg_temp.as_member(current_setting('t.mod_uid'));
SELECT pg_temp.expect_error(format('SELECT public.moderation_enforcement_decide_appeal(%L, true, NULL)', current_setting('t.suspension')),
  '42501', NULL, 'the deciding moderator reviewed their own decision');
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.moderation_enforcement_list('appeals') WHERE id = current_setting('t.suspension')::uuid) THEN
    RAISE EXCEPTION 'open appeal missing from the moderators'' list';
  END IF;
END $$;
SELECT pg_temp.as_member(current_setting('t.mod2_uid'));
SELECT public.moderation_enforcement_decide_appeal(current_setting('t.suspension')::uuid, true, 'Quote taken out of context');
RESET ROLE;
DO $$
BEGIN
  IF (SELECT banned_until FROM auth.users WHERE id = current_setting('t.citizen_uid')::uuid) IS NOT NULL THEN
    RAISE EXCEPTION 'overturned suspension kept the sign-in ban';
  END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.as_member(current_setting('t.citizen_uid'));
INSERT INTO public.posts (author_id, content) VALUES (current_setting('t.citizen_pid')::uuid, 'back after the appeal');

-- ---- restrictions end on their own -----------------------------------------------------------------------------------
RESET ROLE;
UPDATE public.member_enforcement_actions SET ends_at = now() - interval '1 minute'
 WHERE profile_id = current_setting('t.member_pid')::uuid AND step = 'content_restriction';
SET LOCAL ROLE authenticated;
SELECT pg_temp.as_member(current_setting('t.member_uid'));
INSERT INTO public.posts (author_id, content) VALUES (current_setting('t.member_pid')::uuid, 'after the restriction ended');
DO $$
BEGIN
  IF (SELECT count(*) FROM public.moderation_enforcement_list('mine')) <> 3 THEN
    RAISE EXCEPTION 'member should see their three steps, saw %', (SELECT count(*) FROM public.moderation_enforcement_list('mine'));
  END IF;
  IF EXISTS (SELECT 1 FROM public.moderation_enforcement_list('mine') WHERE moderator_profile_id IS NOT NULL) THEN
    RAISE EXCEPTION 'member saw which moderator decided';
  END IF;
  BEGIN
    INSERT INTO public.member_enforcement_actions (profile_id, step, reason_code) VALUES (current_setting('t.citizen_pid')::uuid, 'warning', 'spam');
    RAISE EXCEPTION 'member wrote an enforcement action directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

RESET ROLE;
DO $$ BEGIN RAISE NOTICE 'ok: member enforcement ladder'; END $$;

ROLLBACK;
