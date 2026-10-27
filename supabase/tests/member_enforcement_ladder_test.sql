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
SELECT set_config('t.mod2_pid', (SELECT id::text FROM public.profiles WHERE username = 'moderator_two' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.founder_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'maturehumanity' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.cert_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'certified' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.cert_pid', (SELECT id::text FROM public.profiles WHERE username = 'certified' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.law_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'law' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.law_pid', (SELECT id::text FROM public.profiles WHERE username = 'law' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.guest_pid', (SELECT id::text FROM public.profiles WHERE username = 'guest' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.staff_pid', (SELECT id::text FROM public.profiles WHERE username = 'market_manager' AND deleted_at IS NULL LIMIT 1), true);
DELETE FROM public.member_enforcement_actions
 WHERE profile_id IN (current_setting('t.member_pid')::uuid, current_setting('t.citizen_pid')::uuid, current_setting('t.other_pid')::uuid,
                      current_setting('t.cert_pid')::uuid, current_setting('t.law_pid')::uuid, current_setting('t.guest_pid')::uuid);
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

-- ---- severe reasons may skip rungs; a suspended member can read and appeal, nothing else --------------------------
SELECT pg_temp.as_member(current_setting('t.mod_uid'));
SELECT set_config('t.suspension', public.moderation_enforce(current_setting('t.citizen_pid')::uuid, 'suspension', 'violence', 'Threats in comments')::text, true);
RESET ROLE;
DO $$
BEGIN
  IF (SELECT banned_until FROM auth.users WHERE id = current_setting('t.citizen_uid')::uuid) IS NOT NULL THEN
    RAISE EXCEPTION 'suspension banned sign-in; it should leave the member signed in to read and appeal';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.sessions WHERE user_id = current_setting('t.citizen_uid')::uuid) THEN
    RAISE EXCEPTION 'suspension ended the member''s session';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_notifications WHERE recipient_profile_id = current_setting('t.citizen_pid')::uuid
                  AND notification_type = 'moderation_enforcement') THEN
    RAISE EXCEPTION 'the suspended member was not notified';
  END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.as_member(current_setting('t.citizen_uid'));
SELECT pg_temp.expect_error(format('INSERT INTO public.posts (author_id, content) VALUES (%L, %L)', current_setting('t.citizen_pid'), 'x'),
  'PT403', 'suspension', 'post while suspended');
SELECT pg_temp.expect_error(format('INSERT INTO public.private_messages (conversation_id, sender_id, content) VALUES (%L, %L, %L)',
  current_setting('t.conv'), current_setting('t.citizen_pid'), 'x'), 'PT403', 'suspension', 'message while suspended');
SELECT pg_temp.expect_error(format('UPDATE public.profiles SET bio = %L WHERE id = %L', 'new bio', current_setting('t.citizen_pid')),
  'PT403', 'suspension', 'profile edit while suspended');
SELECT pg_temp.expect_error(format('SELECT public.report_content(%L, %L, %L, NULL)', 'user', current_setting('t.member_pid'), 'spam'),
  'PT403', 'suspension', 'report while suspended');
-- reading the app still works: sign-in bookkeeping, Terms, notification read marks
UPDATE public.profiles SET last_active_at = now() WHERE id = current_setting('t.citizen_pid')::uuid;
UPDATE public.user_notifications SET read_at = now() WHERE recipient_profile_id = current_setting('t.citizen_pid')::uuid;

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

-- ---- removal: proposed by one moderator, confirmed by another, read-only, closed when an appeal fails ---------------
SELECT pg_temp.as_member(current_setting('t.mod_uid'));
SELECT pg_temp.expect_error(format('SELECT public.moderation_enforce(%L, %L, %L, NULL)', current_setting('t.cert_pid'), 'removal', 'spam'),
  '22023', NULL, 'removal without the rungs before it');
SELECT pg_temp.expect_error(format('SELECT public.moderation_enforce(%L, %L, %L, NULL)', current_setting('t.staff_pid'), 'removal', 'violence'),
  '42501', NULL, 'removal of a staff account');
SELECT set_config('t.removal', public.moderation_enforce(current_setting('t.cert_pid')::uuid, 'removal', 'violence', 'Repeated threats')::text, true);
SELECT pg_temp.expect_error(format('SELECT public.moderation_enforce(%L, %L, %L, NULL)', current_setting('t.cert_pid'), 'removal', 'violence'),
  '22023', NULL, 'a second open removal');
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.moderation_enforcement_list('removals') WHERE id = current_setting('t.removal')::uuid) THEN
    RAISE EXCEPTION 'proposal missing from the removals list';
  END IF;
END $$;
SELECT pg_temp.expect_error(format('SELECT public.moderation_enforcement_confirm(%L)', current_setting('t.removal')),
  '42501', NULL, 'the proposing moderator confirmed their own removal');
-- a proposal alone changes nothing for the member, who does not see it yet
SELECT pg_temp.as_member(current_setting('t.cert_uid'));
INSERT INTO public.posts (author_id, content) VALUES (current_setting('t.cert_pid')::uuid, 'still posting while only proposed');
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.moderation_enforcement_list('mine')) THEN RAISE EXCEPTION 'member saw an unconfirmed removal'; END IF;
END $$;
-- a second moderator confirms: read and appeal only, closing in 30 days
SELECT pg_temp.as_member(current_setting('t.mod2_uid'));
SELECT public.moderation_enforcement_confirm(current_setting('t.removal')::uuid);
SELECT pg_temp.as_member(current_setting('t.cert_uid'));
SELECT pg_temp.expect_error(format('INSERT INTO public.posts (author_id, content) VALUES (%L, %L)', current_setting('t.cert_pid'), 'x'),
  'PT403', 'removal', 'post after a confirmed removal');
SELECT public.moderation_enforcement_appeal(current_setting('t.removal')::uuid, 'Those were quotes.');
-- neither the proposer nor the confirmer decides the appeal; the founder (or a third moderator) does
SELECT pg_temp.as_member(current_setting('t.mod_uid'));
SELECT pg_temp.expect_error(format('SELECT public.moderation_enforcement_decide_appeal(%L, false, NULL)', current_setting('t.removal')),
  '42501', NULL, 'the proposer decided the removal appeal');
SELECT pg_temp.as_member(current_setting('t.mod2_uid'));
SELECT pg_temp.expect_error(format('SELECT public.moderation_enforcement_decide_appeal(%L, false, NULL)', current_setting('t.removal')),
  '42501', NULL, 'the confirmer decided the removal appeal');
SELECT pg_temp.as_member(current_setting('t.founder_uid'));
SELECT public.moderation_enforcement_decide_appeal(current_setting('t.removal')::uuid, false, 'Upheld');
RESET ROLE;
DO $$
BEGIN
  IF (SELECT deleted_at FROM public.profiles WHERE id = current_setting('t.cert_pid')::uuid) IS NULL
     OR (SELECT deletion_reason FROM public.profiles WHERE id = current_setting('t.cert_pid')::uuid) <> 'moderation_removal' THEN
    RAISE EXCEPTION 'upheld removal did not close the account';
  END IF;
  IF (SELECT banned_until FROM auth.users WHERE id = current_setting('t.cert_uid')::uuid) IS DISTINCT FROM 'infinity'::timestamptz THEN
    RAISE EXCEPTION 'closed account can still sign in';
  END IF;
  IF (SELECT closed_at FROM public.member_enforcement_actions WHERE id = current_setting('t.removal')::uuid) IS NULL THEN
    RAISE EXCEPTION 'removal not marked closed';
  END IF;
END $$;
SET LOCAL ROLE authenticated;

-- an overturned removal lifts it and the member can write again
SELECT pg_temp.as_member(current_setting('t.mod_uid'));
SELECT set_config('t.removal2', public.moderation_enforce(current_setting('t.law_pid')::uuid, 'removal', 'privacy', 'Posted an address')::text, true);
SELECT pg_temp.as_member(current_setting('t.mod2_uid'));
SELECT public.moderation_enforcement_confirm(current_setting('t.removal2')::uuid);
SELECT pg_temp.as_member(current_setting('t.law_uid'));
SELECT public.moderation_enforcement_appeal(current_setting('t.removal2')::uuid, 'It was my own office address.');
SELECT pg_temp.as_member(current_setting('t.founder_uid'));
SELECT public.moderation_enforcement_decide_appeal(current_setting('t.removal2')::uuid, true, 'Own public address');
SELECT pg_temp.as_member(current_setting('t.law_uid'));
INSERT INTO public.posts (author_id, content) VALUES (current_setting('t.law_pid')::uuid, 'back after the removal appeal');

-- the founder alone may propose and confirm while there are fewer than two moderators; the daily job closes it
RESET ROLE;
UPDATE public.profiles SET role = 'member' WHERE id = current_setting('t.mod2_pid')::uuid;
SET LOCAL ROLE authenticated;
SELECT pg_temp.as_member(current_setting('t.founder_uid'));
SELECT set_config('t.removal3', public.moderation_enforce(current_setting('t.guest_pid')::uuid, 'removal', 'child_safety', NULL)::text, true);
SELECT public.moderation_enforcement_confirm(current_setting('t.removal3')::uuid);
RESET ROLE;
UPDATE public.member_enforcement_actions SET ends_at = now() - interval '1 minute' WHERE id = current_setting('t.removal3')::uuid;
DO $$
BEGIN
  IF public.enforcement_close_due_removals() <> 1 THEN RAISE EXCEPTION 'the daily job did not close exactly the due removal'; END IF;
  IF (SELECT deleted_at FROM public.profiles WHERE id = current_setting('t.guest_pid')::uuid) IS NULL THEN
    RAISE EXCEPTION 'due removal left the account open';
  END IF;
END $$;

RESET ROLE;
-- every public table except the exempt ones carries the suspension guard (a new table must get it too)
DO $$
DECLARE v_missing text;
BEGIN
  SELECT string_agg(c.relname, ', ' ORDER BY c.relname) INTO v_missing
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relispartition
     AND NOT (c.relname = ANY (public.enforcement_guard_exempt_tables()))
     AND NOT EXISTS (SELECT 1 FROM pg_trigger t WHERE t.tgrelid = c.oid AND t.tgname = 'enforcement_suspension_guard');
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'tables without the suspension guard (add the trigger in their migration): %', v_missing;
  END IF;
END $$;
DO $$ BEGIN RAISE NOTICE 'ok: member enforcement ladder'; END $$;

ROLLBACK;
