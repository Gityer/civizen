-- Phase 3 batch A: citizenship automation (30 days / 14 days with acceptance), the eligibility service,
-- verification-queue decisions with the duplicate-identity check, revoke and the logged admin override,
-- and the business-account vote block.
-- Run with scripts/local-supabase/run-sql-tests.sh against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('test.member_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.member_pid', (SELECT id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.citizen_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.citizen_pid', (SELECT id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.vm_pid', (SELECT id::text FROM public.profiles WHERE username = 'verified_member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.staff_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'armen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.staff_pid', (SELECT id::text FROM public.profiles WHERE username = 'armen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.biz_pid', (SELECT la.linked_profile_id::text FROM public.linked_accounts la WHERE la.relationship_type = 'business' LIMIT 1), true);

DO $$
BEGIN
  IF coalesce(current_setting('test.member_uid', true), '') = '' OR coalesce(current_setting('test.staff_uid', true), '') = '' THEN
    RAISE EXCEPTION 'fixtures member/armen missing in the local database';
  END IF;
END $$;

-- ---- 3.2 eligibility service ---------------------------------------------------------------------
DO $$
DECLARE e jsonb;
BEGIN
  e := public.is_eligible(current_setting('test.member_pid')::uuid, 'participate');
  IF NOT (e->>'eligible')::boolean THEN RAISE EXCEPTION 'unverified member should be able to participate: %', e; END IF;
  e := public.is_eligible(current_setting('test.member_pid')::uuid, 'vote_countable');
  IF (e->>'eligible')::boolean OR NOT (e->'reasons' ? 'verification_required') THEN RAISE EXCEPTION 'unverified member countable? %', e; END IF;
  e := public.is_eligible(current_setting('test.citizen_pid')::uuid, 'vote_countable');
  IF NOT (e->>'eligible')::boolean THEN RAISE EXCEPTION 'verified citizen not countable: %', e; END IF;
  e := public.is_eligible(current_setting('test.member_pid')::uuid, 'governance');
  IF (e->>'eligible')::boolean OR NOT (e->'reasons' ? 'citizenship_required') THEN RAISE EXCEPTION 'member governance-eligible? %', e; END IF;
  e := public.is_eligible(NULL, 'propose');
  IF (e->>'eligible')::boolean OR NOT (e->'reasons' ? 'not_authenticated') THEN RAISE EXCEPTION 'guest propose? %', e; END IF;
  IF coalesce(current_setting('test.biz_pid', true), '') <> '' THEN
    e := public.is_eligible(current_setting('test.biz_pid')::uuid, 'participate');
    IF (e->>'eligible')::boolean OR NOT (e->'reasons' ? 'business_account') THEN RAISE EXCEPTION 'business account may participate? %', e; END IF;
    IF public.consultation_eligibility_reason(
         (SELECT id FROM public.civic_elections WHERE metadata->>'consultation_key' = 'single-world-citizenship' LIMIT 1),
         current_setting('test.biz_pid')::uuid) IS DISTINCT FROM 'business_account'
       AND (SELECT status FROM public.civic_elections WHERE metadata->>'consultation_key' = 'single-world-citizenship' LIMIT 1) = 'open' THEN
      RAISE EXCEPTION 'consultation eligibility does not block the business account';
    END IF;
  END IF;
  BEGIN
    PERFORM public.is_eligible(current_setting('test.member_pid')::uuid, 'teleport');
    RAISE EXCEPTION 'unknown scope accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'unknown_scope' THEN RAISE EXCEPTION 'expected unknown_scope, got %', SQLERRM; END IF;
  END;
  RAISE NOTICE 'ok: eligibility service';
END $$;

-- ---- 3.3 queue: staff decides, duplicate check, revoke, override --------------------------------------
DELETE FROM public.identity_verification_cases WHERE profile_id = current_setting('test.member_pid')::uuid;
INSERT INTO public.identity_verification_cases (profile_id, status, submitted_at, personal_info_completed, contact_info_completed, live_verification_completed)
VALUES (current_setting('test.member_pid')::uuid, 'submitted', now(), true, true, true);
SELECT set_config('test.case_id', (SELECT id::text FROM public.identity_verification_cases WHERE profile_id = current_setting('test.member_pid')::uuid), true);
-- the member's ID document shares its hash with an already-approved document of another living profile
INSERT INTO public.identity_verification_cases (profile_id, status, submitted_at, reviewed_at, resolved_at)
VALUES (current_setting('test.vm_pid')::uuid, 'approved', now() - interval '40 days', now() - interval '39 days', now() - interval '39 days')
ON CONFLICT (profile_id) DO UPDATE SET status = 'approved';
INSERT INTO public.identity_verification_artifacts (case_id, artifact_kind, storage_path, artifact_hash, created_by)
VALUES ((SELECT id FROM public.identity_verification_cases WHERE profile_id = current_setting('test.vm_pid')::uuid), 'supporting_document', 'test/vm-id.jpg', 'hash-dup-001', current_setting('test.vm_pid')::uuid);
INSERT INTO public.identity_verification_artifacts (case_id, artifact_kind, storage_path, artifact_hash, created_by)
VALUES (current_setting('test.case_id')::uuid, 'supporting_document', 'test/member-id.jpg', 'hash-dup-001', current_setting('test.member_pid')::uuid);

-- a member cannot decide, cannot insert reviews directly
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member_uid'), 'role', 'authenticated')::text, true);
DO $$
BEGIN
  BEGIN
    PERFORM public.decide_identity_verification_case(current_setting('test.case_id')::uuid, 'approved', 'self-approve');
    RAISE EXCEPTION 'member decided a case';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'not_authorized' THEN RAISE EXCEPTION 'expected not_authorized, got %', SQLERRM; END IF;
  END;
  BEGIN
    INSERT INTO public.identity_verification_reviews (case_id, reviewer_id, decision, notes)
    VALUES (current_setting('test.case_id')::uuid, current_setting('test.member_pid')::uuid, 'approved', 'direct');
    RAISE EXCEPTION 'member inserted a review row directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'ok: members cannot decide or write reviews';
END $$;

-- staff: assignment, duplicate blocks approval, rejection works, then a clean approval after the duplicate is gone
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.staff_uid'), 'role', 'authenticated')::text, true);
DO $$
DECLARE r jsonb;
BEGIN
  r := public.assign_identity_verification_case(current_setting('test.case_id')::uuid);
  IF r->>'status' <> 'in_review' THEN RAISE EXCEPTION 'assign failed: %', r; END IF;
  r := public.decide_identity_verification_case(current_setting('test.case_id')::uuid, 'approved', 'looks fine');
  IF r->>'status' <> 'duplicate_identity' THEN RAISE EXCEPTION 'duplicate identity approved: %', r; END IF;
  RAISE NOTICE 'ok: assignment and duplicate check';
END $$;
RESET ROLE;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.identity_verification_cases WHERE id = current_setting('test.case_id')::uuid AND 'duplicate_identity' = ANY (discrepancy_flags)) THEN
    RAISE EXCEPTION 'duplicate flag not recorded on the case';
  END IF;
  IF (SELECT is_verified FROM public.profiles WHERE id = current_setting('test.member_pid')::uuid) THEN RAISE EXCEPTION 'member verified despite duplicate'; END IF;
END $$;
DELETE FROM public.identity_verification_artifacts WHERE artifact_hash = 'hash-dup-001' AND case_id <> current_setting('test.case_id')::uuid;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.staff_uid'), 'role', 'authenticated')::text, true);
SELECT public.decide_identity_verification_case(current_setting('test.case_id')::uuid, 'approved', 'documents match');
RESET ROLE;
DO $$
BEGIN
  IF (SELECT status FROM public.identity_verification_cases WHERE id = current_setting('test.case_id')::uuid) <> 'approved' THEN RAISE EXCEPTION 'case not approved'; END IF;
  IF NOT (SELECT is_verified FROM public.profiles WHERE id = current_setting('test.member_pid')::uuid) THEN RAISE EXCEPTION 'profile not verified after approval'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_notifications WHERE recipient_profile_id = current_setting('test.member_pid')::uuid AND notification_type = 'verification_approved') THEN
    RAISE EXCEPTION 'member not notified of approval';
  END IF;
  RAISE NOTICE 'ok: approval verifies the profile and notifies';
END $$;

-- ---- 3.1 citizenship automation on the freshly verified member ----------------------------------------
DO $$
DECLARE n integer; s jsonb;
BEGIN
  IF (SELECT citizenship_status FROM public.profiles WHERE id = current_setting('test.member_pid')::uuid) <> 'verified_member' THEN
    RAISE EXCEPTION 'freshly verified member should be verified_member';
  END IF;
  n := public.citizenship_promotion_tick();
  IF (SELECT citizenship_status FROM public.profiles WHERE id = current_setting('test.member_pid')::uuid) <> 'verified_member' THEN
    RAISE EXCEPTION 'promoted too early';
  END IF;
  -- 20 days in, no acceptance: still waiting
  UPDATE public.profiles SET citizenship_review_cleared_at = now() - interval '20 days' WHERE id = current_setting('test.member_pid')::uuid;
  PERFORM public.citizenship_promotion_tick();
  IF (SELECT citizenship_status FROM public.profiles WHERE id = current_setting('test.member_pid')::uuid) <> 'verified_member' THEN RAISE EXCEPTION 'promoted at 20 days without acceptance'; END IF;
  -- the member accepts the civic framework: 14 days after verification is enough
  PERFORM set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member_uid'))::text, true);
  SET LOCAL ROLE authenticated;
  PERFORM public.accept_civic_framework();
  s := public.my_civic_status();
  RESET ROLE;
  IF s->>'civic_framework_accepted_at' IS NULL OR s->>'citizenship_due_at' IS NULL THEN RAISE EXCEPTION 'civic status incomplete: %', s; END IF;
  IF (s->>'citizenship_due_at')::timestamptz > now() THEN RAISE EXCEPTION 'with acceptance at 20 days the member should be due now: %', s; END IF;
  n := public.citizenship_promotion_tick();
  IF n < 1 THEN RAISE EXCEPTION 'tick promoted nobody'; END IF;
  IF (SELECT citizenship_status FROM public.profiles WHERE id = current_setting('test.member_pid')::uuid) <> 'citizen' THEN RAISE EXCEPTION 'not promoted after acceptance'; END IF;
  IF (SELECT citizenship_acceptance_mode FROM public.profiles WHERE id = current_setting('test.member_pid')::uuid) <> 'manual' THEN RAISE EXCEPTION 'wrong acceptance mode'; END IF;
  IF (SELECT role FROM public.profiles WHERE id = current_setting('test.member_pid')::uuid) <> 'member' THEN RAISE EXCEPTION 'citizenship changed the role'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_notifications WHERE recipient_profile_id = current_setting('test.member_pid')::uuid AND notification_type = 'citizenship_granted') THEN
    RAISE EXCEPTION 'citizenship notification missing';
  END IF;
  RAISE NOTICE 'ok: 14-day citizenship with acceptance, status separate from role';
END $$;

-- 30 days without acceptance
UPDATE public.profiles SET citizenship_status = 'verified_member', civic_framework_accepted_at = NULL, citizenship_accepted_at = NULL, citizenship_acceptance_mode = NULL,
  citizenship_review_cleared_at = now() - interval '31 days' WHERE id = current_setting('test.member_pid')::uuid;
DO $$
BEGIN
  PERFORM public.citizenship_promotion_tick();
  IF (SELECT citizenship_status FROM public.profiles WHERE id = current_setting('test.member_pid')::uuid) <> 'citizen' THEN RAISE EXCEPTION 'not promoted at 31 days'; END IF;
  IF (SELECT citizenship_acceptance_mode FROM public.profiles WHERE id = current_setting('test.member_pid')::uuid) <> 'auto' THEN RAISE EXCEPTION 'wrong mode for automatic promotion'; END IF;
  RAISE NOTICE 'ok: 30-day automatic citizenship';
END $$;

-- ---- 3.3 revoke and admin override ------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.staff_uid'), 'role', 'authenticated')::text, true);
DO $$
BEGIN
  BEGIN
    PERFORM public.revoke_identity_verification(current_setting('test.member_pid')::uuid, 'x');
    RAISE EXCEPTION 'revoke without a reason accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'reason_required' THEN RAISE EXCEPTION 'expected reason_required, got %', SQLERRM; END IF;
  END;
  PERFORM public.revoke_identity_verification(current_setting('test.member_pid')::uuid, 'Document found to be expired');
  BEGIN
    PERFORM public.set_profile_verified_override(current_setting('test.member_pid')::uuid, true, 'no');
    RAISE EXCEPTION 'override without a reason accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'reason_required' THEN RAISE EXCEPTION 'expected reason_required, got %', SQLERRM; END IF;
  END;
  PERFORM public.set_profile_verified_override(current_setting('test.member_pid')::uuid, true, 'Verified in person at the office');
END $$;
RESET ROLE;
DO $$
BEGIN
  IF NOT (SELECT is_verified FROM public.profiles WHERE id = current_setting('test.member_pid')::uuid) THEN RAISE EXCEPTION 'override did not verify'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.identity_verification_overrides WHERE profile_id = current_setting('test.member_pid')::uuid AND verified AND actor_profile_id = current_setting('test.staff_pid')::uuid) THEN
    RAISE EXCEPTION 'override not logged';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.identity_verification_reviews r JOIN public.identity_verification_cases c ON c.id = r.case_id
                 WHERE c.profile_id = current_setting('test.member_pid')::uuid AND r.decision = 'revoked') THEN
    RAISE EXCEPTION 'revocation review missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_notifications WHERE recipient_profile_id = current_setting('test.member_pid')::uuid AND notification_type = 'verification_revoked') THEN
    RAISE EXCEPTION 'revocation notification missing';
  END IF;
  RAISE NOTICE 'ok: revoke with reason, logged override';
END $$;

ROLLBACK;
