-- Phase 0 trust hardening: privileged profile columns (S1), verification-case owner lock (S2),
-- eligibility snapshots (S7) and development-story ingest (S6) are closed to ordinary members and
-- still work for staff and server paths.
-- Run with scripts/local-supabase/run-sql-tests.sh against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('test.member_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.member_pid', (SELECT id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.moderator_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'moderator' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.moderator_pid', (SELECT id::text FROM public.profiles WHERE username = 'moderator' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.staff_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'armen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.staff_pid', (SELECT id::text FROM public.profiles WHERE username = 'armen' AND deleted_at IS NULL LIMIT 1), true);

DO $$
BEGIN
  IF current_setting('test.member_uid', true) IS NULL OR current_setting('test.staff_uid', true) IS NULL THEN
    RAISE EXCEPTION 'fixtures member/armen missing in the local database';
  END IF;
END $$;

-- ---- 1. S1: a member cannot change privileged columns of their own profile ---------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member_uid'), 'role', 'authenticated')::text, true);

DO $$
BEGIN
  UPDATE public.profiles SET role = 'admin' WHERE id = current_setting('test.member_pid')::uuid;
  RAISE EXCEPTION 'self-promotion to admin accepted';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'ok: member cannot change own role';
END $$;

DO $$
BEGIN
  UPDATE public.profiles SET granted_permissions = ARRAY['role.assign'::public.app_permission] WHERE id = current_setting('test.member_pid')::uuid;
  RAISE EXCEPTION 'permission self-grant accepted';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'ok: member cannot grant own permissions';
END $$;

DO $$
BEGIN
  UPDATE public.profiles SET is_verified = true WHERE id = current_setting('test.member_pid')::uuid;
  RAISE EXCEPTION 'self-verification accepted';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'ok: member cannot mark themselves verified';
END $$;

DO $$
BEGIN
  UPDATE public.profiles SET is_governance_eligible = true, governance_eligible_at = now() WHERE id = current_setting('test.member_pid')::uuid;
  RAISE EXCEPTION 'eligibility self-grant accepted';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'ok: member cannot mark themselves governance-eligible';
END $$;

DO $$
BEGIN
  UPDATE public.profiles SET official_id = 'W-FORGED-0001' WHERE id = current_setting('test.member_pid')::uuid;
  RAISE EXCEPTION 'identity number change accepted';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'ok: member cannot change own official id';
END $$;

-- ordinary profile edits still work
UPDATE public.profiles SET bio = 'phase0 guard test bio' WHERE id = current_setting('test.member_pid')::uuid;
DO $$
BEGIN
  IF (SELECT bio FROM public.profiles WHERE id = current_setting('test.member_pid')::uuid) <> 'phase0 guard test bio' THEN
    RAISE EXCEPTION 'ordinary bio update did not apply';
  END IF;
  RAISE NOTICE 'ok: member can still edit ordinary fields';
END $$;

-- a moderator (no role.assign) is a member for this purpose
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.moderator_uid'), 'role', 'authenticated')::text, true);
DO $$
BEGIN
  UPDATE public.profiles SET role = 'admin' WHERE id = current_setting('test.moderator_pid')::uuid;
  RAISE EXCEPTION 'moderator self-promotion accepted';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'ok: moderator cannot change own role';
END $$;

-- staff with role.assign can change a member''s role
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.staff_uid'), 'role', 'authenticated')::text, true);
UPDATE public.profiles SET role = 'citizen' WHERE id = current_setting('test.member_pid')::uuid;
DO $$
BEGIN
  IF (SELECT role FROM public.profiles WHERE id = current_setting('test.member_pid')::uuid) <> 'citizen' THEN
    RAISE EXCEPTION 'staff role change did not apply';
  END IF;
  RAISE NOTICE 'ok: staff can change roles';
END $$;
UPDATE public.profiles SET role = 'member' WHERE id = current_setting('test.member_pid')::uuid;

-- ---- 2. S2: verification case owner lock ------------------------------------------------------
RESET ROLE;
DELETE FROM public.identity_verification_reviews WHERE case_id IN (SELECT id FROM public.identity_verification_cases WHERE profile_id = current_setting('test.member_pid')::uuid);
DELETE FROM public.identity_verification_cases WHERE profile_id = current_setting('test.member_pid')::uuid;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member_uid'), 'role', 'authenticated')::text, true);

DO $$
BEGIN
  INSERT INTO public.identity_verification_cases (profile_id, status, verification_method)
  VALUES (current_setting('test.member_pid')::uuid, 'approved', 'manual_id_selfie');
  RAISE EXCEPTION 'owner inserted an approved case';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'ok: owner cannot insert a non-draft case';
END $$;

INSERT INTO public.identity_verification_cases (profile_id, status, verification_method, notes)
VALUES (current_setting('test.member_pid')::uuid, 'draft', 'manual_id_selfie', 'member draft');
SELECT set_config('test.case_id', (SELECT id::text FROM public.identity_verification_cases WHERE profile_id = current_setting('test.member_pid')::uuid), true);

DO $$
BEGIN
  UPDATE public.identity_verification_cases SET status = 'approved' WHERE id = current_setting('test.case_id')::uuid;
  RAISE EXCEPTION 'owner self-approval accepted';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'ok: owner cannot approve own case';
END $$;

DO $$
BEGIN
  UPDATE public.identity_verification_cases SET last_reviewed_by = current_setting('test.member_pid')::uuid, reviewed_at = now() WHERE id = current_setting('test.case_id')::uuid;
  RAISE EXCEPTION 'owner set reviewer fields';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'ok: owner cannot set reviewer fields';
END $$;

UPDATE public.identity_verification_cases
SET status = 'submitted', submitted_at = now(), personal_info_completed = true, contact_info_completed = true, live_verification_completed = true
WHERE id = current_setting('test.case_id')::uuid;
DO $$
BEGIN
  IF (SELECT status FROM public.identity_verification_cases WHERE id = current_setting('test.case_id')::uuid) <> 'submitted' THEN
    RAISE EXCEPTION 'owner submit did not apply';
  END IF;
  RAISE NOTICE 'ok: owner can submit a draft';
END $$;

DO $$
BEGIN
  UPDATE public.identity_verification_cases SET status = 'draft' WHERE id = current_setting('test.case_id')::uuid;
  RAISE EXCEPTION 'owner moved submitted back to draft';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'ok: owner cannot reopen a submitted case';
END $$;

DO $$
BEGIN
  IF (SELECT is_verified FROM public.profiles WHERE id = current_setting('test.member_pid')::uuid) THEN
    RAISE EXCEPTION 'member became verified without review';
  END IF;
  RAISE NOTICE 'ok: no verification without a reviewer decision';
END $$;

-- reviewer path still works: staff moves to in_review and records an approval
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.staff_uid'), 'role', 'authenticated')::text, true);
UPDATE public.identity_verification_cases SET status = 'in_review' WHERE id = current_setting('test.case_id')::uuid;
INSERT INTO public.identity_verification_reviews (case_id, reviewer_id, decision, notes)
VALUES (current_setting('test.case_id')::uuid, current_setting('test.staff_pid')::uuid, 'approved', 'phase0 test approval');
DO $$
BEGIN
  IF (SELECT status FROM public.identity_verification_cases WHERE id = current_setting('test.case_id')::uuid) <> 'approved' THEN
    RAISE EXCEPTION 'reviewer approval did not apply';
  END IF;
  IF NOT (SELECT coalesce(is_verified, false) FROM public.profiles WHERE id = current_setting('test.member_pid')::uuid) THEN
    RAISE EXCEPTION 'approval did not project is_verified';
  END IF;
  RAISE NOTICE 'ok: reviewer approval still verifies the member';
END $$;

-- once decided, the owner cannot touch the case any more
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member_uid'), 'role', 'authenticated')::text, true);
DO $$
BEGIN
  UPDATE public.identity_verification_cases SET notes = 'tamper' WHERE id = current_setting('test.case_id')::uuid;
  RAISE EXCEPTION 'owner edited a decided case';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'ok: decided case is locked for the owner';
END $$;

-- ---- 3. S7: eligibility snapshots are not member-writable -------------------------------------
DO $$
BEGIN
  INSERT INTO public.governance_eligibility_snapshots (profile_id, citizenship_status, is_verified, is_active_citizen, civizen_score, governance_score, influence_weight, eligible, reason_codes, calculated_at, calculation_version, source)
  VALUES (current_setting('test.member_pid')::uuid, 'registered_member', true, true, 100, 100, 1, true, '{}', now(), 'forged', 'client_projection');
  RAISE EXCEPTION 'member wrote an eligibility snapshot';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'ok: member cannot write eligibility snapshots';
END $$;

SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.staff_uid'), 'role', 'authenticated')::text, true);
INSERT INTO public.governance_eligibility_snapshots (profile_id, citizenship_status, is_verified, is_active_citizen, civizen_score, governance_score, influence_weight, eligible, reason_codes, calculated_at, calculation_version, source)
VALUES (current_setting('test.member_pid')::uuid, 'registered_member', false, false, 0, 0, 1, false, ARRAY['phase0_test'], now(), 'phase0-test', 'staff')
ON CONFLICT (profile_id) DO UPDATE SET source = 'staff';
DO $$
BEGIN
  RAISE NOTICE 'ok: staff can write eligibility snapshots';
END $$;

-- ---- 4. S6: development stories are written by scripts and staff only ---------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member_uid'), 'role', 'authenticated')::text, true);
DO $$
BEGIN
  PERFORM public.ingest_development_story('phase0-forged', 'Forged', 'forged instruction', 'forged', 'Platform', 'General', '{}'::text[], 'x', 'cursor-seed', now(), 'development', 'published', 'public', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}'::jsonb);
  RAISE EXCEPTION 'member ingested a public story';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'ok: member cannot call ingest_development_story';
END $$;

DO $$
BEGIN
  INSERT INTO public.development_stories (author_id, title, original_instruction, rephrased_description, section, area, expected_behavior, status, visibility)
  VALUES (current_setting('test.member_uid')::uuid, 'Forged', 'x', 'x', 'Platform', 'General', 'x', 'published', 'public');
  RAISE EXCEPTION 'member inserted a story directly';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'ok: member cannot insert development stories directly';
END $$;

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.staff_uid'), 'role', 'service_role')::text, true);
SELECT public.ingest_development_story('phase0-service-role', 'Service role story', 'service instruction', 'service', 'Platform', 'General', '{}'::text[], 'x', 'script', now(), 'development', 'published', 'public', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}'::jsonb);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.development_stories WHERE source_story_key = 'phase0-service-role') THEN
    RAISE EXCEPTION 'service role ingest did not write';
  END IF;
  RAISE NOTICE 'ok: service role can still ingest stories';
END $$;

RESET ROLE;
ROLLBACK;
