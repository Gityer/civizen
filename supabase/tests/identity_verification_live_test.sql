-- In-house live identity verification and the gate in front of member actions (owner decisions 2026-10-30).
-- Fictional people and documents. Runs against the LOCAL database only. Rolls back.

BEGIN;

-- these cases test the requirement itself, which is off by default (20261101100000)
UPDATE public.platform_flags SET enabled = true WHERE key = 'identity_verification_required';

SELECT set_config('t.guest_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'guest' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.guest_pid', (SELECT id::text FROM public.profiles WHERE username = 'guest' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.member_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.member_pid', (SELECT id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.founder_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'maturehumanity' AND deleted_at IS NULL LIMIT 1), true);
UPDATE public.profiles SET is_verified = false, date_of_birth = NULL, full_name = 'Testa Example' WHERE id IN (current_setting('t.guest_pid')::uuid, current_setting('t.member_pid')::uuid);
DELETE FROM public.identity_verification_cases WHERE profile_id IN (current_setting('t.guest_pid')::uuid, current_setting('t.member_pid')::uuid);

CREATE OR REPLACE FUNCTION pg_temp.act_as(p_uid text) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;
-- a fictional passport (TD3) with correct check digits, valid until 2034
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
CREATE OR REPLACE FUNCTION pg_temp.upload(p_pid text, p_case text, p_name text) RETURNS text LANGUAGE sql AS $$
  INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('identity-verification', p_pid || '/' || p_case || '/' || p_name, NULL) RETURNING name;
$$;
CREATE TEMP TABLE t_state (k text PRIMARY KEY, v jsonb) ON COMMIT DROP;
GRANT ALL ON t_state TO authenticated;

DO $$
DECLARE
  v_start jsonb;
  v_case text;
  v_video text;
  v_doc text;
  v_failed boolean;
  v_result jsonb;
  v_checks jsonb;
BEGIN
  -- 0. the MRZ checks: the ICAO specimen parses; a changed digit is caught
  IF NOT (public.parse_mrz(E'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10') ->> 'valid')::boolean THEN
    RAISE EXCEPTION 'the ICAO specimen should parse';
  END IF;
  IF (public.parse_mrz(E'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<11') ->> 'valid')::boolean THEN
    RAISE EXCEPTION 'a wrong composite digit should be caught';
  END IF;

  -- 1. the gate: an unverified member cannot post; a verified business account's owner stands behind it
  PERFORM pg_temp.act_as(current_setting('t.guest_uid'));
  SET LOCAL ROLE authenticated;
  v_failed := false;
  BEGIN
    INSERT INTO public.posts (author_id, content) VALUES (current_setting('t.guest_pid')::uuid, 'Unverified post');
  EXCEPTION WHEN SQLSTATE 'PT403' THEN
    v_failed := SQLERRM = 'verification_required';
  END;
  RESET ROLE;
  IF NOT v_failed THEN RAISE EXCEPTION 'an unverified member should not post'; END IF;
  IF NOT public.profile_identity_verified(public.resolve_civizen_org_profile()) THEN
    RAISE EXCEPTION 'the Civizen organisation account should count as verified through its verified owner';
  END IF;

  -- 2. start: a fresh challenge from the server (a code and two moves), valid 10 minutes
  PERFORM pg_temp.act_as(current_setting('t.guest_uid'));
  SET LOCAL ROLE authenticated;
  v_start := public.start_live_verification();
  RESET ROLE;
  IF v_start ->> 'status' <> 'draft' OR v_start -> 'challenge' ->> 'code' !~ '^[0-9]{3}-[0-9]{3}$'
     OR jsonb_array_length(v_start -> 'challenge' -> 'moves') <> 2 THEN
    RAISE EXCEPTION 'start should issue a challenge: %', v_start;
  END IF;
  v_case := v_start ->> 'case_id';
  v_video := pg_temp.upload(current_setting('t.guest_pid'), v_case, 'live.webm');
  v_doc := pg_temp.upload(current_setting('t.guest_pid'), v_case, 'document.jpg');
  v_checks := jsonb_build_object('liveness', jsonb_build_object('passed', true, 'moves_requested', v_start -> 'challenge' -> 'moves', 'blinks', 2),
                                 'face_match', jsonb_build_object('passed', true, 'distance', 0.38));
  INSERT INTO t_state VALUES ('guest_checks', v_checks), ('guest_start', v_start);

  -- 3. refusals: a broken MRZ, an expired document, someone else's files, no consent
  PERFORM pg_temp.act_as(current_setting('t.guest_uid'));
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.submit_live_verification(v_video, v_doc, 'P<TLDEXAMPLE', 'v1', v_checks);
    RAISE EXCEPTION 'a broken MRZ was accepted';
  EXCEPTION WHEN invalid_parameter_value THEN IF SQLERRM <> 'mrz_invalid' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.submit_live_verification(v_video, v_doc, E'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10', 'v1', v_checks);
    RAISE EXCEPTION 'an expired document was accepted';
  EXCEPTION WHEN invalid_parameter_value THEN IF SQLERRM <> 'document_expired' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.submit_live_verification('someone/else/live.webm', v_doc, pg_temp.mrz('TX1234567'), 'v1', v_checks);
    RAISE EXCEPTION 'files outside the member''s folder were accepted';
  EXCEPTION WHEN invalid_parameter_value THEN IF SQLERRM <> 'media_missing' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.submit_live_verification(v_video, v_doc, pg_temp.mrz('TX1234567'), '', v_checks);
    RAISE EXCEPTION 'submission without consent was accepted';
  EXCEPTION WHEN invalid_parameter_value THEN IF SQLERRM <> 'consent_required' THEN RAISE; END IF;
  END;

  -- 4. a complete submission: submitted, device checks kept, reviewers get an item at once
  v_result := public.submit_live_verification(v_video, v_doc, pg_temp.mrz('TX1234567'), 'v1', v_checks);
  RESET ROLE;
  IF v_result ->> 'status' <> 'submitted' THEN RAISE EXCEPTION 'expected submitted: %', v_result; END IF;
  IF (SELECT live_verification_completed FROM public.identity_verification_cases WHERE id = v_case::uuid) IS NOT TRUE THEN
    RAISE EXCEPTION 'the server should mark the live check completed';
  END IF;
  IF (SELECT metadata -> 'device_checks' -> 'face_match' ->> 'distance' FROM public.identity_verification_cases WHERE id = v_case::uuid) <> '0.38' THEN
    RAISE EXCEPTION 'the device checks should be kept for the reviewer';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.org_position_items WHERE position_key = 'verification_lead' AND source_type = 'identity_verification'
                   AND source_ref = v_case AND status = 'open') THEN
    RAISE EXCEPTION 'reviewers should get an item at once';
  END IF;
  IF EXISTS (SELECT 1 FROM public.identity_verification_artifacts WHERE case_id = v_case::uuid AND artifact_kind = 'duplicate_check' AND artifact_hash IS NULL) THEN
    RAISE EXCEPTION 'the document fingerprint should be stored';
  END IF;
  IF EXISTS (SELECT 1 FROM public.identity_verification_artifacts WHERE storage_path LIKE '%TX1234567%' OR metadata::text LIKE '%TX1234567%') THEN
    RAISE EXCEPTION 'the document number itself must not be stored';
  END IF;
  INSERT INTO t_state VALUES ('guest_case', to_jsonb(v_case));
END $$;

-- 5. the same document on another account is flagged; failed device checks and a different challenge are flagged
DO $$
DECLARE
  v_start jsonb;
  v_case text;
  v_result jsonb;
BEGIN
  PERFORM pg_temp.act_as(current_setting('t.member_uid'));
  SET LOCAL ROLE authenticated;
  v_start := public.start_live_verification();
  RESET ROLE;
  v_case := v_start ->> 'case_id';
  PERFORM pg_temp.upload(current_setting('t.member_pid'), v_case, 'live.webm');
  PERFORM pg_temp.upload(current_setting('t.member_pid'), v_case, 'document.jpg');
  PERFORM pg_temp.act_as(current_setting('t.member_uid'));
  SET LOCAL ROLE authenticated;
  v_result := public.submit_live_verification(current_setting('t.member_pid') || '/' || v_case || '/live.webm',
    current_setting('t.member_pid') || '/' || v_case || '/document.jpg', pg_temp.mrz('TX1234567'), 'v1',
    jsonb_build_object('liveness', jsonb_build_object('passed', false, 'moves_requested', '["left","left"]'::jsonb),
                       'face_match', jsonb_build_object('passed', false, 'distance', 0.81)));
  RESET ROLE;
  IF NOT (v_result -> 'flags') ?& ARRAY['document_used_by_another_account', 'liveness_not_passed', 'face_match_not_passed'] THEN
    RAISE EXCEPTION 'expected duplicate, liveness and face flags: %', v_result;
  END IF;
  IF (v_start -> 'challenge' -> 'moves') <> '["left","left"]'::jsonb AND NOT (v_result -> 'flags') ? 'challenge_mismatch' THEN
    RAISE EXCEPTION 'a different challenge should be flagged: %', v_result;
  END IF;
  IF (SELECT priority FROM public.org_position_items WHERE source_type = 'identity_verification' AND source_ref = v_case AND status = 'open') <> 'high' THEN
    RAISE EXCEPTION 'a flagged case should be high priority for reviewers';
  END IF;
END $$;

-- 6. a member cannot write evidence directly; a reviewer approves; the member can then post; the reviewers' item closes
DO $$
DECLARE
  v_case uuid := ((SELECT v FROM t_state WHERE k = 'guest_case') #>> '{}')::uuid;
  v_failed boolean := false;
BEGIN
  PERFORM pg_temp.act_as(current_setting('t.guest_uid'));
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO public.identity_verification_artifacts (case_id, artifact_kind, storage_path) VALUES (v_case, 'live_presence', 'x');
  EXCEPTION WHEN insufficient_privilege THEN v_failed := true;
  END;
  RESET ROLE;
  IF NOT v_failed THEN RAISE EXCEPTION 'members must not write evidence directly'; END IF;

  PERFORM pg_temp.act_as(current_setting('t.founder_uid'));
  SET LOCAL ROLE authenticated;
  PERFORM public.decide_identity_verification_case(v_case, 'approved', 'Watched the recording; face matches the document.', NULL);
  RESET ROLE;
  IF NOT (SELECT is_verified FROM public.profiles WHERE id = current_setting('t.guest_pid')::uuid) THEN
    RAISE EXCEPTION 'approval should verify the member';
  END IF;
  IF EXISTS (SELECT 1 FROM public.org_position_items WHERE source_type = 'identity_verification' AND source_ref = v_case::text AND status = 'open') THEN
    RAISE EXCEPTION 'the reviewers'' item should close with the decision';
  END IF;
  PERFORM pg_temp.act_as(current_setting('t.guest_uid'));
  SET LOCAL ROLE authenticated;
  IF NOT public.profile_identity_verified(current_setting('t.guest_pid')::uuid) THEN RAISE EXCEPTION 'the gate should now let the member through'; END IF;
  IF (public.start_live_verification() ->> 'status') <> 'verified' THEN RAISE EXCEPTION 'a verified member needs no new challenge'; END IF;
  RESET ROLE;
END $$;
DO $$ BEGIN RAISE NOTICE 'ok: identity verification live'; END $$;

ROLLBACK;
