-- Trust & Safety abuse cases T8, T9, T10 and the report flood (baseline 2026-10-13, Section 4). T1-T3 are in
-- insider_and_privacy_bypasses_test.sql. Each abuse must fail. Runs against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('t.member_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.member_pid', (SELECT id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.citizen_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.citizen_pid', (SELECT id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.mod_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'moderator' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.mod_pid', (SELECT id::text FROM public.profiles WHERE username = 'moderator' AND deleted_at IS NULL LIMIT 1), true);

DO $$
BEGIN
  IF current_setting('t.member_uid', true) IS NULL OR current_setting('t.mod_uid', true) IS NULL OR current_setting('t.citizen_uid', true) IS NULL THEN
    RAISE EXCEPTION 'fixtures member/citizen/moderator missing in the local database';
  END IF;
END $$;

-- fixtures: a post by the moderator reported by the member; a plaintext and an encrypted message from citizen to member
INSERT INTO public.posts (id, author_id, content) VALUES ('7d000000-0000-4000-8000-000000000001', current_setting('t.mod_pid')::uuid, 'Moderator own post');
INSERT INTO public.reports (id, reporter_id, reason, status, target_kind, target_id, reason_code, reported_user_id)
VALUES ('7d000000-0000-4000-8000-0000000000a1', current_setting('t.member_pid')::uuid, 'spam', 'pending', 'post',
        '7d000000-0000-4000-8000-000000000001', 'spam', current_setting('t.mod_pid')::uuid);
INSERT INTO public.private_conversations (id, kind) VALUES ('7d000000-0000-4000-8000-0000000000b1', 'direct');
INSERT INTO public.private_conversation_members (conversation_id, profile_id) VALUES
  ('7d000000-0000-4000-8000-0000000000b1', current_setting('t.member_pid')::uuid),
  ('7d000000-0000-4000-8000-0000000000b1', current_setting('t.citizen_pid')::uuid);
INSERT INTO public.private_messages (id, conversation_id, sender_id, content) VALUES
  ('7d000000-0000-4000-8000-0000000000b2', '7d000000-0000-4000-8000-0000000000b1', current_setting('t.citizen_pid')::uuid, 'What they really wrote');
INSERT INTO public.private_messages (id, conversation_id, sender_id, content, message_kind, cipher_nonce, cipher_text) VALUES
  ('7d000000-0000-4000-8000-0000000000b3', '7d000000-0000-4000-8000-0000000000b1', current_setting('t.citizen_pid')::uuid, NULL, 'e2ee_v1', 'nonce', 'ciphertext');
INSERT INTO public.private_messages (id, conversation_id, sender_id, content) VALUES
  ('7d000000-0000-4000-8000-0000000000b4', '7d000000-0000-4000-8000-0000000000b1', current_setting('t.member_pid')::uuid, 'My own message');

SET LOCAL ROLE authenticated;

-- ---- T8: a moderator cannot act on reports about their own content, and cannot write reports directly ----------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.mod_uid'), 'role', 'authenticated')::text, true);
DO $$
DECLARE n int;
BEGIN
  BEGIN
    PERFORM public.moderation_claim('post', '7d000000-0000-4000-8000-000000000001');
    RAISE EXCEPTION 'moderator claimed a report about their own post';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.moderation_dismiss('post', '7d000000-0000-4000-8000-000000000001', 'fine');
    RAISE EXCEPTION 'moderator dismissed a report about their own post';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF EXISTS (SELECT 1 FROM public.moderation_queue() WHERE target_id = '7d000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'moderator sees a report about their own post in the queue';
  END IF;
  BEGIN
    UPDATE public.reports SET status = 'dismissed' WHERE id = '7d000000-0000-4000-8000-0000000000a1';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN RAISE EXCEPTION 'moderator updated a report directly'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'ok: T8 conflicts of interest and direct report writes refused';
END $$;

-- ---- T9: chat reports go through the server, which reads the excerpt itself -------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.member_uid'), 'role', 'authenticated')::text, true);
DO $$
DECLARE a uuid; b uuid; c uuid; ctx jsonb;
BEGIN
  BEGIN
    INSERT INTO public.reports (reporter_id, reported_user_id, reason, status, report_context)
    VALUES (current_setting('t.member_pid')::uuid, current_setting('t.citizen_pid')::uuid, 'harassment', 'pending',
            jsonb_build_object('source', 'private_message', 'message_excerpt', 'words they never wrote'));
    RAISE EXCEPTION 'member inserted a chat report directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  a := public.report_private_conversation('7d000000-0000-4000-8000-0000000000b1', '7d000000-0000-4000-8000-0000000000b2',
                                          'Harassing me', 'words they never wrote');
  SELECT report_context INTO ctx FROM public.reports WHERE id = a;
  IF ctx->>'message_excerpt' <> 'What they really wrote' OR ctx->>'excerpt_source' <> 'server' THEN
    RAISE EXCEPTION 'plaintext excerpt not taken from the stored message: %', ctx;
  END IF;
  b := public.report_private_conversation('7d000000-0000-4000-8000-0000000000b1', '7d000000-0000-4000-8000-0000000000b2', 'Again please', NULL);
  IF a <> b THEN RAISE EXCEPTION 'a second open report of the same message was created'; END IF;

  c := public.report_private_conversation('7d000000-0000-4000-8000-0000000000b1', '7d000000-0000-4000-8000-0000000000b3', 'Threatening', 'decrypted text');
  SELECT report_context INTO ctx FROM public.reports WHERE id = c;
  IF ctx->>'excerpt_source' <> 'reporter' THEN RAISE EXCEPTION 'encrypted excerpt not marked as reporter-supplied: %', ctx; END IF;

  BEGIN
    PERFORM public.report_private_conversation('7d000000-0000-4000-8000-0000000000b1', '7d000000-0000-4000-8000-0000000000b4', 'My own message', NULL);
    RAISE EXCEPTION 'member reported their own message';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  RAISE NOTICE 'ok: T9 chat reports checked by the server';
END $$;

-- a contact report (no message) names the one other member, and a reviewer can see it
DO $$
DECLARE v uuid;
BEGIN
  v := public.report_private_conversation('7d000000-0000-4000-8000-0000000000b1', NULL, 'Keeps contacting me', NULL);
  IF (SELECT reported_user_id FROM public.reports WHERE id = v) <> current_setting('t.citizen_pid')::uuid THEN
    RAISE EXCEPTION 'contact report named the wrong person';
  END IF;
  PERFORM set_config('t.contact_report', v::text, true);
  RAISE NOTICE 'ok: T9 contact report in a direct conversation';
END $$;

-- in a conversation with more than one other member a contact report is refused (report a message instead)
RESET ROLE;
INSERT INTO public.private_conversation_members (conversation_id, profile_id)
VALUES ('7d000000-0000-4000-8000-0000000000b1', current_setting('t.mod_pid')::uuid);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM public.report_private_conversation('7d000000-0000-4000-8000-0000000000b1', NULL, 'Which one of them?', NULL);
  RAISE EXCEPTION 'contact report accepted in a group conversation';
EXCEPTION WHEN invalid_parameter_value THEN
  RAISE NOTICE 'ok: T9 group contact report refused';
END $$;
RESET ROLE;
DELETE FROM public.private_conversation_members
 WHERE conversation_id = '7d000000-0000-4000-8000-0000000000b1' AND profile_id = current_setting('t.mod_pid')::uuid;
SET LOCAL ROLE authenticated;

-- a non-member cannot report a conversation
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.mod_uid'), 'role', 'authenticated')::text, true);
DO $$
BEGIN
  PERFORM public.report_private_conversation('7d000000-0000-4000-8000-0000000000b1', NULL, 'Not my chat', NULL);
  RAISE EXCEPTION 'non-member reported a conversation';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'ok: T9 non-member refused';
END $$;

-- the reported member cannot review a report about themselves
RESET ROLE;
UPDATE public.profiles SET granted_permissions = array_append(coalesce(granted_permissions, '{}'), 'report.review'::public.app_permission)
 WHERE id IN (current_setting('t.citizen_pid')::uuid, current_setting('t.mod_pid')::uuid);
SET LOCAL ROLE authenticated;

-- a reviewer reads contact reports (Settings > Messaging lists private_message and private_contact)
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.mod_uid'), 'role', 'authenticated')::text, true);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.reports WHERE id = current_setting('t.contact_report')::uuid
                    AND report_context->>'source' = 'private_contact') THEN
    RAISE EXCEPTION 'reviewer cannot see a contact report';
  END IF;
  RAISE NOTICE 'ok: T9 contact report visible to a reviewer';
END $$;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.citizen_uid'), 'role', 'authenticated')::text, true);
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.citizen_uid'), 'role', 'authenticated')::text, true);
DO $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.reports WHERE report_context->>'message_id' = '7d000000-0000-4000-8000-0000000000b2';
  PERFORM public.moderation_review_message_report(v_id, 'dismissed', 'not me');
  RAISE EXCEPTION 'reported member dismissed a report about themselves';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'ok: T8 reviewer cannot decide a message report about themselves';
END $$;

-- ---- report flood: one account cannot file 100 reports ------------------------------------------------------------
RESET ROLE;
-- fixture rows only: skip the posting rate limit for the 100 target posts
SET LOCAL session_replication_role = replica;
INSERT INTO public.posts (id, author_id, content)
SELECT ('7e000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, current_setting('t.citizen_pid')::uuid, 'flood target ' || i
  FROM generate_series(1, 100) i;
SET LOCAL session_replication_role = origin;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.member_uid'), 'role', 'authenticated')::text, true);
DO $$
DECLARE i int; ok int := 0;
BEGIN
  FOR i IN 1..100 LOOP
    BEGIN
      PERFORM public.report_content('post', ('7e000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, 'spam', NULL);
      ok := ok + 1;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
  IF ok >= 100 THEN RAISE EXCEPTION 'all 100 reports from one account were accepted'; END IF;
  RAISE NOTICE 'ok: report flood stopped after % reports', ok;
END $$;

-- the same limit covers chat reports (it sits on the reports table, so every path counts)
RESET ROLE;
SET LOCAL session_replication_role = replica;
INSERT INTO public.private_messages (id, conversation_id, sender_id, content)
SELECT ('7f000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, '7d000000-0000-4000-8000-0000000000b1',
       current_setting('t.citizen_pid')::uuid, 'flood message ' || i
  FROM generate_series(1, 100) i;
SET LOCAL session_replication_role = origin;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.member_uid'), 'role', 'authenticated')::text, true);
DO $$
DECLARE i int; ok int := 0;
BEGIN
  FOR i IN 1..100 LOOP
    BEGIN
      PERFORM public.report_private_conversation('7d000000-0000-4000-8000-0000000000b1',
        ('7f000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, 'Flooding the queue', NULL);
      ok := ok + 1;
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM <> 'rate_limited' THEN RAISE; END IF;
    END;
  END LOOP;
  IF ok >= 100 THEN RAISE EXCEPTION 'all 100 chat reports from one account were accepted'; END IF;
  RAISE NOTICE 'ok: chat report flood stopped after % more reports', ok;
END $$;

-- ---- T10: submitted evidence cannot be overwritten ----------------------------------------------------------------
RESET ROLE;
INSERT INTO public.identity_verification_cases (id, profile_id, status, verification_method)
VALUES ('7d000000-0000-4000-8000-0000000000c1', current_setting('t.member_pid')::uuid, 'draft', 'manual_id_selfie');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.member_uid'), 'role', 'authenticated')::text, true);
DO $$
DECLARE v_path text := current_setting('t.member_pid') || '/7d000000-0000-4000-8000-0000000000c1/document.jpg';
BEGIN
  IF NOT public.identity_verification_folder_writable(v_path) THEN RAISE EXCEPTION 'draft case folder not writable'; END IF;
END $$;
RESET ROLE;
UPDATE public.identity_verification_cases SET status = 'submitted', submitted_at = now() WHERE id = '7d000000-0000-4000-8000-0000000000c1';
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_path text := current_setting('t.member_pid') || '/7d000000-0000-4000-8000-0000000000c1/document.jpg';
BEGIN
  IF public.identity_verification_folder_writable(v_path) THEN RAISE EXCEPTION 'submitted case folder still writable'; END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname IN ('Identity verification files insert own', 'Identity verification files update own')
              AND coalesce(with_check, '') NOT LIKE '%identity_verification_folder_writable%') THEN
    RAISE EXCEPTION 'storage write policies do not check the case status';
  END IF;
  RAISE NOTICE 'ok: T10 submitted evidence cannot be overwritten';
END $$;

ROLLBACK;
