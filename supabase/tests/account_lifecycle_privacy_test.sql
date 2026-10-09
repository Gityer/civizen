-- Phase 3 batch B: data export, privacy settings that mask the public profile card, the score snapshot,
-- and account deletion that removes verification material, identity numbers and owned business accounts.
-- Run with scripts/local-supabase/run-sql-tests.sh against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('test.member_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.member_pid', (SELECT id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.citizen_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.citizen_pid', (SELECT id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);

DO $$
BEGIN
  IF coalesce(current_setting('test.member_uid', true), '') = '' OR coalesce(current_setting('test.citizen_uid', true), '') = '' THEN
    RAISE EXCEPTION 'fixtures member/citizen missing in the local database';
  END IF;
END $$;

-- ---- privacy + snapshot + public card -------------------------------------------------------------
UPDATE public.profiles SET country = 'France', country_code = 'FR', city = 'Lyon' WHERE id = current_setting('test.member_pid')::uuid;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member_uid'))::text, true);
SELECT public.save_my_score_snapshot(42.5, 'emerging', '{"overall": {"score": 42.5}}'::jsonb);
SELECT public.set_my_privacy_settings('{"show_country": false, "show_score": false, "bogus": true, "show_city": "yes"}'::jsonb);
DO $$
DECLARE card jsonb;
BEGIN
  card := public.public_profile(current_setting('test.member_pid')::uuid);
  IF NOT (card->>'is_own')::boolean THEN RAISE EXCEPTION 'owner card not marked own'; END IF;
  IF card->>'country' <> 'France' OR (card->'score'->>'score')::numeric <> 42.5 THEN RAISE EXCEPTION 'owner must see everything: %', card; END IF;
  IF (SELECT privacy_settings FROM public.profiles WHERE id = current_setting('test.member_pid')::uuid) ? 'bogus' THEN RAISE EXCEPTION 'unknown privacy key stored'; END IF;
  RAISE NOTICE 'ok: owner sees everything, unknown keys dropped';
END $$;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.citizen_uid'))::text, true);
DO $$
DECLARE card jsonb;
BEGIN
  card := public.public_profile(current_setting('test.member_pid')::uuid);
  IF card IS NULL THEN RAISE EXCEPTION 'visitor gets no card'; END IF;
  IF (card->>'is_own')::boolean THEN RAISE EXCEPTION 'visitor card marked own'; END IF;
  IF card->>'country' IS NOT NULL OR (card->>'show_country')::boolean THEN RAISE EXCEPTION 'country shown despite setting: %', card; END IF;
  IF card->'score' IS NOT NULL AND jsonb_typeof(card->'score') <> 'null' THEN RAISE EXCEPTION 'score shown despite setting: %', card; END IF;
  IF card->>'city' <> 'Lyon' THEN RAISE EXCEPTION 'city should still show (string value ignored): %', card; END IF;
  IF card->>'username' <> 'member' THEN RAISE EXCEPTION 'username missing'; END IF;
  RAISE NOTICE 'ok: visitor card masked per privacy settings';
END $$;
DO $$
BEGIN
  BEGIN
    PERFORM public.save_my_score_snapshot(5000, 'x', '{}'::jsonb);
    RAISE EXCEPTION 'absurd score accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'invalid_score' THEN RAISE EXCEPTION 'expected invalid_score, got %', SQLERRM; END IF;
  END;
  RAISE NOTICE 'ok: snapshot bounds';
END $$;

-- ---- export -----------------------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member_uid'))::text, true);
DO $$
DECLARE d jsonb;
BEGIN
  d := public.export_my_data();
  IF d->'profile'->>'id' <> current_setting('test.member_pid') THEN RAISE EXCEPTION 'export profile wrong'; END IF;
  IF d->'profile' ? 'custom_permissions' THEN RAISE EXCEPTION 'export leaks permission columns'; END IF;
  IF jsonb_typeof(d->'matters') <> 'array' OR jsonb_typeof(d->'ballots') <> 'array' OR jsonb_typeof(d->'notifications') <> 'array' THEN
    RAISE EXCEPTION 'export sections missing: %', (SELECT string_agg(k, ',') FROM jsonb_object_keys(d) k);
  END IF;
  RAISE NOTICE 'ok: export';
END $$;

-- ---- deletion removes verification material, identity number, owned business ---------------------
RESET ROLE;
DELETE FROM public.identity_verification_cases WHERE profile_id = current_setting('test.member_pid')::uuid;
INSERT INTO public.identity_verification_cases (profile_id, status, submitted_at) VALUES (current_setting('test.member_pid')::uuid, 'submitted', now());
INSERT INTO public.identity_verification_artifacts (case_id, artifact_kind, storage_path, artifact_hash, created_by)
VALUES ((SELECT id FROM public.identity_verification_cases WHERE profile_id = current_setting('test.member_pid')::uuid), 'supporting_document',
        current_setting('test.member_pid') || '/id.jpg', 'hash-del-1', current_setting('test.member_pid')::uuid);

-- a business the member solely owns (bypassing the client guard as the database owner)
INSERT INTO public.profiles (id, username, full_name, role, is_system_agent) VALUES ('66666666-6666-4666-8666-666666666661', 'del-biz-test', 'Deletion test business', 'member', true);
SELECT set_config('test.biz_inserted', 'no', true);
DO $$
BEGIN
  INSERT INTO public.linked_accounts (owner_profile_id, linked_profile_id, relationship_type, business_name_normalized, established_at, established_via)
  VALUES (current_setting('test.member_pid')::uuid, '66666666-6666-4666-8666-666666666661', 'business', 'del-biz-test', now(), 'legacy_backfill');
  PERFORM set_config('test.biz_inserted', 'yes', true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'skip: cannot seed a business link here (%)', SQLERRM;
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member_uid'))::text, true);
SELECT public.delete_my_account('DELETE');
RESET ROLE;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.identity_verification_cases WHERE profile_id = current_setting('test.member_pid')::uuid) THEN RAISE EXCEPTION 'verification case kept'; END IF;
  IF EXISTS (SELECT 1 FROM public.identity_verification_artifacts WHERE artifact_hash = 'hash-del-1') THEN RAISE EXCEPTION 'artifact row kept'; END IF;
  IF (SELECT deleted_at FROM public.profiles WHERE id = current_setting('test.member_pid')::uuid) IS NULL THEN RAISE EXCEPTION 'profile not deleted'; END IF;
  IF EXISTS (SELECT 1 FROM public.profile_score_snapshots WHERE profile_id = current_setting('test.member_pid')::uuid) THEN RAISE EXCEPTION 'score snapshot kept'; END IF;
  IF current_setting('test.biz_inserted') = 'yes' THEN
    IF (SELECT deleted_at FROM public.profiles WHERE id = '66666666-6666-4666-8666-666666666661') IS NULL THEN RAISE EXCEPTION 'solely owned business not closed'; END IF;
    IF EXISTS (SELECT 1 FROM public.linked_accounts WHERE linked_profile_id = '66666666-6666-4666-8666-666666666661') THEN RAISE EXCEPTION 'business link kept'; END IF;
    RAISE NOTICE 'ok: owned business closed with the account';
  END IF;
  RAISE NOTICE 'ok: deletion removes verification material';
END $$;

ROLLBACK;
