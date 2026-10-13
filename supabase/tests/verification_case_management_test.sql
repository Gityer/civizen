-- v2 step C1: identity verification case management by Identity Verification domain reviewers.
-- Run with scripts/local-supabase/run-sql-tests.sh against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('t.member_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.member_pid', (SELECT id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.reviewer_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.reviewer_pid', (SELECT id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);

-- fixtures written as the database owner: 'citizen' becomes an Identity Verification reviewer (no staff permissions)
INSERT INTO public.profile_governance_roles (profile_id, domain_key, role_key)
VALUES (current_setting('t.reviewer_pid')::uuid, 'identity_verification', 'reviewer');
DELETE FROM public.identity_verification_cases WHERE profile_id = current_setting('t.member_pid')::uuid;
INSERT INTO public.identity_verification_cases (id, profile_id, status, submitted_at)
VALUES ('7c100000-0000-4000-8000-000000000001', current_setting('t.member_pid')::uuid, 'submitted', now() - interval '50 hours');

SET LOCAL ROLE authenticated;

-- ---- a member who is not a reviewer cannot open the queue ---------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.member_uid'), 'role', 'authenticated')::text, true);
DO $$
BEGIN
  BEGIN
    PERFORM * FROM public.identity_verification_queue();
    RAISE EXCEPTION 'non-reviewer opened the queue';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'ok: queue closed to non-reviewers';
END $$;

-- ---- a domain reviewer sees the case with its age, claims it, notes it and asks for more information ----
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.reviewer_uid'), 'role', 'authenticated')::text, true);
DO $$
DECLARE r record;
BEGIN
  IF NOT public.can_review_identity_verification_storage() THEN RAISE EXCEPTION 'domain reviewer not recognised'; END IF;
  SELECT * INTO r FROM public.identity_verification_queue() q WHERE q.case_id = '7c100000-0000-4000-8000-000000000001';
  IF NOT FOUND THEN RAISE EXCEPTION 'case missing from queue'; END IF;
  IF r.age_hours < 49 THEN RAISE EXCEPTION 'age not reported: %', r.age_hours; END IF;
  IF r.assigned_to IS NOT NULL THEN RAISE EXCEPTION 'case already assigned'; END IF;

  PERFORM public.assign_identity_verification_case('7c100000-0000-4000-8000-000000000001');
  SELECT * INTO r FROM public.identity_verification_queue() q WHERE q.case_id = '7c100000-0000-4000-8000-000000000001';
  IF r.assigned_to <> current_setting('t.reviewer_pid')::uuid OR r.status <> 'in_review' THEN RAISE EXCEPTION 'claim not recorded'; END IF;

  PERFORM public.add_identity_verification_case_note('7c100000-0000-4000-8000-000000000001', 'Photo is blurry at the bottom.');
  BEGIN
    PERFORM public.request_identity_verification_info('7c100000-0000-4000-8000-000000000001', 'not_a_code', 'Please retake the photo.');
    RAISE EXCEPTION 'invalid reason code accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE '%reason_code_required%' THEN RAISE; END IF;
  END;
  PERFORM public.request_identity_verification_info('7c100000-0000-4000-8000-000000000001', 'document_unreadable', 'Please retake the photo of your ID in daylight.');
  RAISE NOTICE 'ok: domain reviewer claims, notes and requests information';
END $$;

-- ---- the member sees the request (not the internal note), and submits again ---------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.member_uid'), 'role', 'authenticated')::text, true);
DO $$
DECLARE v_status text; v_meta jsonb; v_events integer;
BEGIN
  SELECT status::text, metadata INTO v_status, v_meta FROM public.identity_verification_cases WHERE id = '7c100000-0000-4000-8000-000000000001';
  IF v_status <> 'draft' THEN RAISE EXCEPTION 'case not back to draft: %', v_status; END IF;
  IF v_meta -> 'last_decision' ->> 'reason_code' <> 'document_unreadable' THEN RAISE EXCEPTION 'member cannot see the request'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_notifications WHERE recipient_profile_id = current_setting('t.member_pid')::uuid
                 AND notification_type = 'verification_info_requested') THEN
    RAISE EXCEPTION 'member not notified';
  END IF;
  SELECT count(*) INTO v_events FROM public.identity_verification_case_events;
  IF v_events <> 0 THEN RAISE EXCEPTION 'member can read internal case history'; END IF;
  BEGIN
    UPDATE public.identity_verification_cases
    SET metadata = metadata || '{"last_decision": {"kind": "approved"}}'::jsonb
    WHERE id = '7c100000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'member forged the decision';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  UPDATE public.identity_verification_cases SET status = 'submitted', submitted_at = now() WHERE id = '7c100000-0000-4000-8000-000000000001';
  RAISE NOTICE 'ok: member sees the request and resubmits';
END $$;

-- ---- the reviewer must give a reason code to reject; the history shows every step -----------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.reviewer_uid'), 'role', 'authenticated')::text, true);
DO $$
DECLARE r record; v_kinds text;
BEGIN
  SELECT * INTO r FROM public.identity_verification_queue() q WHERE q.case_id = '7c100000-0000-4000-8000-000000000001';
  IF NOT r.resubmission OR r.info_request_count <> 1 OR r.note_count <> 1 THEN
    RAISE EXCEPTION 'queue flags wrong: resubmission %, requests %, notes %', r.resubmission, r.info_request_count, r.note_count;
  END IF;
  BEGIN
    PERFORM public.decide_identity_verification_case('7c100000-0000-4000-8000-000000000001', 'rejected', 'No reason given');
    RAISE EXCEPTION 'rejection without a reason code accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE '%reason_code_required%' THEN RAISE; END IF;
  END;
  PERFORM public.decide_identity_verification_case('7c100000-0000-4000-8000-000000000001', 'rejected', 'The name does not match your profile.', 'details_mismatch');
  SELECT string_agg(h.kind, ',' ORDER BY h.created_at, h.kind) INTO v_kinds FROM public.identity_verification_case_history('7c100000-0000-4000-8000-000000000001') h;
  IF v_kinds NOT LIKE '%assigned%' OR v_kinds NOT LIKE '%note%' OR v_kinds NOT LIKE '%info_requested%'
     OR v_kinds NOT LIKE '%resubmitted%' OR v_kinds NOT LIKE '%rejected%' THEN
    RAISE EXCEPTION 'history incomplete: %', v_kinds;
  END IF;
  RAISE NOTICE 'ok: rejection needs a reason code; history complete';
END $$;

-- ---- after a rejection the member can submit again (was blocked by the A7 guard) -----------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.member_uid'), 'role', 'authenticated')::text, true);
DO $$
DECLARE v_status text;
BEGIN
  SELECT status::text INTO v_status FROM public.identity_verification_cases WHERE id = '7c100000-0000-4000-8000-000000000001';
  IF v_status <> 'rejected' THEN RAISE EXCEPTION 'case not rejected: %', v_status; END IF;
  UPDATE public.identity_verification_cases SET status = 'submitted', submitted_at = now() WHERE id = '7c100000-0000-4000-8000-000000000001';
  BEGIN
    UPDATE public.identity_verification_cases SET status = 'approved' WHERE id = '7c100000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'member approved own case';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'ok: resubmission after rejection works; self-approval still refused';
END $$;

-- ---- a blocked reviewer loses access --------------------------------------------------------------------
RESET ROLE;
INSERT INTO public.governance_sanctions (profile_id, reason, blocks_verification_review, is_active, starts_at)
VALUES (current_setting('t.reviewer_pid')::uuid, 'test block', true, true, now() - interval '1 minute');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.reviewer_uid'), 'role', 'authenticated')::text, true);
DO $$
BEGIN
  IF public.can_review_identity_verification_storage() THEN RAISE EXCEPTION 'blocked reviewer kept access'; END IF;
  RAISE NOTICE 'ok: blocked reviewer loses access';
END $$;

ROLLBACK;
