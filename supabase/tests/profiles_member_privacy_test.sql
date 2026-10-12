-- v2 step A2 (E3): members read only the public columns of other profiles; the owner reads the full own row
-- through my_profile(); staff read full rows through admin_list_profiles(); endorsements follow the endorsed
-- member's "show endorsements" switch. Runs against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('test.member_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.member_pid', (SELECT id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.citizen_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.citizen_pid', (SELECT id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.founder_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'maturehumanity' AND deleted_at IS NULL LIMIT 1), true);

UPDATE public.profiles SET date_of_birth = '1990-01-02', phone_e164 = '+15550000001', privacy_settings = '{"show_endorsements": false}'::jsonb
 WHERE id = current_setting('test.citizen_pid')::uuid;
INSERT INTO public.endorsements (endorser_id, endorsed_id, pillar, stars, comment, is_hidden)
VALUES (current_setting('test.member_pid')::uuid, current_setting('test.citizen_pid')::uuid, 'education_skills', 5, 'test', false);

SET LOCAL ROLE authenticated;

-- ---- another member ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member_uid'), 'role', 'authenticated')::text, true);
DO $$
DECLARE v_col text;
BEGIN
  IF (SELECT username FROM public.profiles WHERE id = current_setting('test.citizen_pid')::uuid) IS NULL THEN
    RAISE EXCEPTION 'member cannot read the public part of another profile';
  END IF;
  FOREACH v_col IN ARRAY ARRAY['date_of_birth', 'phone_e164', 'official_id', 'place_of_birth', 'city', 'privacy_settings', 'granted_permissions'] LOOP
    BEGIN
      EXECUTE format('SELECT %I FROM public.profiles WHERE id = %L', v_col, current_setting('test.citizen_pid'));
      RAISE EXCEPTION 'member read % of another profile', v_col;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
  END LOOP;
  BEGIN
    PERFORM * FROM public.profiles LIMIT 1;
    RAISE EXCEPTION 'member selected * from profiles';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM * FROM public.admin_list_profiles();
    RAISE EXCEPTION 'member listed full profiles';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'ok: members see only public profile columns';
END $$;

-- the endorser still sees their own endorsement; a third party does not when the endorsed member hides them
DO $$
BEGIN
  IF (SELECT count(*) FROM public.endorsements WHERE endorsed_id = current_setting('test.citizen_pid')::uuid) <> 1 THEN
    RAISE EXCEPTION 'endorser cannot see own endorsement';
  END IF;
  RAISE NOTICE 'ok: endorser sees own endorsement';
END $$;

SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.founder_uid'), 'role', 'authenticated')::text, true);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.admin_list_profiles()) = 0 THEN RAISE EXCEPTION 'staff cannot list full profiles'; END IF;
  IF (SELECT date_of_birth FROM public.admin_list_profiles() WHERE id = current_setting('test.citizen_pid')::uuid) IS NULL THEN
    RAISE EXCEPTION 'staff did not get private columns';
  END IF;
  RAISE NOTICE 'ok: staff read full rows through admin_list_profiles';
END $$;

-- ---- the owner -------------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.citizen_uid'), 'role', 'authenticated')::text, true);
DO $$
BEGIN
  IF (SELECT date_of_birth FROM public.my_profile()) <> '1990-01-02' THEN RAISE EXCEPTION 'owner cannot read own birth date'; END IF;
  IF (SELECT phone_e164 FROM public.my_profile()) <> '+15550000001' THEN RAISE EXCEPTION 'owner cannot read own phone'; END IF;
  IF (SELECT count(*) FROM public.endorsements WHERE endorsed_id = current_setting('test.citizen_pid')::uuid) <> 1 THEN
    RAISE EXCEPTION 'owner cannot see endorsements received';
  END IF;
  UPDATE public.profiles SET bio = 'privacy test' WHERE user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'owner cannot update own profile'; END IF;
  RAISE NOTICE 'ok: owner reads the full own row and updates it';
END $$;
RESET ROLE;

-- a third member (signed out of both sides) does not see hidden endorsements
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.endorsements WHERE endorsed_id = current_setting('test.citizen_pid')::uuid) <> 0 THEN
    RAISE EXCEPTION 'endorsements visible although the member hid them';
  END IF;
  RAISE NOTICE 'ok: hidden endorsements stay hidden from others';
END $$;
RESET ROLE;

ROLLBACK;
