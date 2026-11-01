-- The "verified before acting" switch and re-verification of already verified members (20261101100000).
-- A re-verification that is pending or not passed never changes the member's current status.
-- Fictional people and documents. Runs against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('t.guest_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'guest' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.guest_pid', (SELECT id::text FROM public.profiles WHERE username = 'guest' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.member_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.member_pid', (SELECT id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.founder_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'maturehumanity' AND deleted_at IS NULL LIMIT 1), true);
UPDATE public.profiles SET is_verified = false, date_of_birth = NULL, full_name = 'Testa Example'
 WHERE id IN (current_setting('t.guest_pid')::uuid, current_setting('t.member_pid')::uuid);
DELETE FROM public.identity_verification_cases WHERE profile_id IN (current_setting('t.guest_pid')::uuid, current_setting('t.member_pid')::uuid);

CREATE OR REPLACE FUNCTION pg_temp.act_as(p_uid text) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;
CREATE OR REPLACE FUNCTION pg_temp.mrz(p_number text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  l1 text := rpad('P<TLDEXAMPLE<<TESTA', 44, '<');
  num text := rpad(p_number, 9, '<');
  birth text := '900101'; expiry text := '341231'; opt text := rpad('', 14, '<');
  l2 text;
BEGIN
  l2 := num || public.mrz_check_digit(num) || 'TLD' || birth || public.mrz_check_digit(birth) || 'F' || expiry || public.mrz_check_digit(expiry) || opt || '<';
  l2 := l2 || public.mrz_check_digit(substr(l2, 1, 10) || substr(l2, 14, 7) || substr(l2, 22, 22));
  RETURN l1 || E'\n' || l2;
END $$;
-- starts (as the member), uploads the clip and photo, and submits; returns the case id
CREATE OR REPLACE FUNCTION pg_temp.check_in(p_uid text, p_pid text, p_reverify boolean, p_number text) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  v_start jsonb;
  v_case text;
  v_tag text := substr(md5(random()::text), 1, 8);  -- a re-verification reuses the case, so each attempt gets its own files
BEGIN
  PERFORM pg_temp.act_as(p_uid);
  SET LOCAL ROLE authenticated;
  v_start := public.start_live_verification(p_reverify);
  RESET ROLE;
  v_case := v_start ->> 'case_id';
  INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('identity-verification', p_pid || '/' || v_case || '/live-' || v_tag || '.webm', NULL);
  INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('identity-verification', p_pid || '/' || v_case || '/document-' || v_tag || '.jpg', NULL);
  PERFORM pg_temp.act_as(p_uid);
  SET LOCAL ROLE authenticated;
  PERFORM public.submit_live_verification(p_pid || '/' || v_case || '/live-' || v_tag || '.webm', p_pid || '/' || v_case || '/document-' || v_tag || '.jpg',
    pg_temp.mrz(p_number), 'v1', jsonb_build_object('liveness', jsonb_build_object('passed', true), 'face_match', jsonb_build_object('passed', true, 'distance', 0.4)));
  RESET ROLE;
  RETURN v_start;
END $$;
CREATE OR REPLACE FUNCTION pg_temp.decide(p_case uuid, p_decision text, p_reason text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_temp.act_as(current_setting('t.founder_uid'));
  SET LOCAL ROLE authenticated;
  PERFORM public.decide_identity_verification_case(p_case, p_decision, 'Test decision.', p_reason);
  RESET ROLE;
END $$;
CREATE OR REPLACE FUNCTION pg_temp.verified(p_pid text) RETURNS boolean LANGUAGE sql AS $$
  SELECT is_verified FROM public.profiles WHERE id = p_pid::uuid;
$$;

-- 1. the requirement is off by default: an unverified member can post; switched on, the same post is refused
DO $$
DECLARE
  v_failed boolean := false;
BEGIN
  IF public.identity_verification_required() THEN RAISE EXCEPTION 'the requirement should start off'; END IF;
  PERFORM pg_temp.act_as(current_setting('t.member_uid'));
  SET LOCAL ROLE authenticated;
  INSERT INTO public.posts (author_id, content) VALUES (current_setting('t.member_pid')::uuid, 'Unverified post while the switch is off');
  RESET ROLE;
  UPDATE public.platform_flags SET enabled = true WHERE key = 'identity_verification_required';
  PERFORM pg_temp.act_as(current_setting('t.member_uid'));
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO public.posts (author_id, content) VALUES (current_setting('t.member_pid')::uuid, 'Unverified post while the switch is on');
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'verification_required' THEN RAISE; END IF;
    v_failed := true;
  END;
  RESET ROLE;
  IF NOT v_failed THEN RAISE EXCEPTION 'with the switch on, an unverified member must be refused'; END IF;
  UPDATE public.platform_flags SET enabled = false WHERE key = 'identity_verification_required';
  RAISE NOTICE 'ok: the requirement follows the switch, off by default';
END $$;

-- 2. clients can read the switch but not change it
DO $$
DECLARE
  v_changed integer;
BEGIN
  PERFORM pg_temp.act_as(current_setting('t.member_uid'));
  SET LOCAL ROLE authenticated;
  BEGIN
    UPDATE public.platform_flags SET enabled = true WHERE key = 'identity_verification_required';
    GET DIAGNOSTICS v_changed = ROW_COUNT;
    IF v_changed > 0 THEN RAISE EXCEPTION 'a member changed the switch'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
  RAISE NOTICE 'ok: members cannot change the switch';
END $$;

-- 3. a first verification: approval verifies; a verified member is not re-challenged unless they ask
DO $$
DECLARE
  v_start jsonb := pg_temp.check_in(current_setting('t.guest_uid'), current_setting('t.guest_pid'), false, 'TR1111111');
BEGIN
  IF (v_start ->> 'reverification')::boolean THEN RAISE EXCEPTION 'a first verification is not a re-verification'; END IF;
  PERFORM pg_temp.decide((v_start ->> 'case_id')::uuid, 'approved', NULL);
  IF NOT pg_temp.verified(current_setting('t.guest_pid')) THEN RAISE EXCEPTION 'approval should verify'; END IF;
  PERFORM pg_temp.act_as(current_setting('t.guest_uid'));
  SET LOCAL ROLE authenticated;
  IF public.start_live_verification() ->> 'status' <> 'verified' THEN RAISE EXCEPTION 'no new challenge without asking'; END IF;
  RESET ROLE;
  RAISE NOTICE 'ok: first verification';
END $$;

-- 4. re-verification: the member stays verified when starting, while it is reviewed, and when it is rejected
DO $$
DECLARE
  v_start jsonb;
  v_state jsonb;
BEGIN
  v_start := pg_temp.check_in(current_setting('t.guest_uid'), current_setting('t.guest_pid'), true, 'TR1111111');
  IF v_start ->> 'status' <> 'draft' OR NOT (v_start ->> 'reverification')::boolean THEN
    RAISE EXCEPTION 'asking again should start a re-verification: %', v_start;
  END IF;
  IF NOT pg_temp.verified(current_setting('t.guest_pid')) THEN RAISE EXCEPTION 'a pending re-verification must not un-verify'; END IF;
  PERFORM pg_temp.decide((v_start ->> 'case_id')::uuid, 'rejected', 'selfie_unclear');
  IF NOT pg_temp.verified(current_setting('t.guest_pid')) THEN RAISE EXCEPTION 'a rejected re-verification must not un-verify'; END IF;
  PERFORM pg_temp.act_as(current_setting('t.guest_uid'));
  SET LOCAL ROLE authenticated;
  v_state := public.my_verification_state();
  RESET ROLE;
  IF NOT (v_state ->> 'verified')::boolean OR NOT (v_state ->> 'reverification')::boolean OR v_state ->> 'status' <> 'rejected' THEN
    RAISE EXCEPTION 'the member should see: verified, last re-verification not passed: %', v_state;
  END IF;
  RAISE NOTICE 'ok: a re-verification that is not passed keeps the status';
END $$;

-- 5. a passed re-verification renews the verification
DO $$
DECLARE
  v_start jsonb := pg_temp.check_in(current_setting('t.guest_uid'), current_setting('t.guest_pid'), true, 'TR1111111');
BEGIN
  PERFORM pg_temp.decide((v_start ->> 'case_id')::uuid, 'approved', NULL);
  IF NOT pg_temp.verified(current_setting('t.guest_pid')) THEN RAISE EXCEPTION 'an approved re-verification keeps the member verified'; END IF;
  IF (SELECT status FROM public.identity_verification_cases WHERE profile_id = current_setting('t.guest_pid')::uuid) <> 'approved' THEN
    RAISE EXCEPTION 'the case should be approved again';
  END IF;
  RAISE NOTICE 'ok: a passed re-verification renews the verification';
END $$;

-- 6. asking to "re-verify" while not verified is an ordinary verification: a rejection leaves the member unverified
DO $$
DECLARE
  v_start jsonb := pg_temp.check_in(current_setting('t.member_uid'), current_setting('t.member_pid'), true, 'TR2222222');
BEGIN
  IF (v_start ->> 'reverification')::boolean THEN RAISE EXCEPTION 'an unverified member cannot start a re-verification'; END IF;
  PERFORM pg_temp.decide((v_start ->> 'case_id')::uuid, 'rejected', 'selfie_unclear');
  IF pg_temp.verified(current_setting('t.member_pid')) THEN RAISE EXCEPTION 'a rejected first verification must not verify'; END IF;
  RAISE NOTICE 'ok: re-verify needs an existing verification';
END $$;

ROLLBACK;
