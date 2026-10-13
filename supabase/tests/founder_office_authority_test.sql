-- v2 step C6 (decision E5), part 1: founder authority comes from the founder office as well as the role.
-- Run with scripts/local-supabase/run-sql-tests.sh against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('t.member_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.member_pid', (SELECT id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.armen_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'armen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.founder_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'maturehumanity' AND deleted_at IS NULL LIMIT 1), true);

-- the founder role and the current office holder keep every permission they had
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.armen_uid'), 'role', 'authenticated')::text, true);
DO $$
BEGIN
  IF NOT public.has_permission('role.assign') THEN RAISE EXCEPTION 'founder role lost role.assign'; END IF;
  IF NOT public.my_founder_authority() THEN RAISE EXCEPTION 'founder role lost founder authority while the switch is on'; END IF;
  RAISE NOTICE 'ok: founder role unchanged while the switch is on';
END $$;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.founder_uid'), 'role', 'authenticated')::text, true);
DO $$
BEGIN
  IF NOT public.has_permission('role.assign') OR NOT public.my_founder_authority() THEN RAISE EXCEPTION 'office holder lost founder powers'; END IF;
  RAISE NOTICE 'ok: founder office holder unchanged';
END $$;

-- a member is not a founder
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.member_uid'), 'role', 'authenticated')::text, true);
DO $$
BEGIN
  IF public.has_permission('role.assign') OR public.my_founder_authority() THEN RAISE EXCEPTION 'member has founder powers'; END IF;
  IF public.civic_can_manage_voting_proposals(public.current_profile_id()) THEN RAISE EXCEPTION 'member manages proposals'; END IF;
END $$;

-- the founder office moves to the member: powers follow the office, not the role
RESET ROLE;
UPDATE public.constitutional_offices SET is_active = false, ended_at = now()
WHERE office_key = 'founder' AND is_active;
INSERT INTO public.constitutional_offices (office_key, profile_id, is_active)
VALUES ('founder', current_setting('t.member_pid')::uuid, true);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.member_uid'), 'role', 'authenticated')::text, true);
DO $$
BEGIN
  IF NOT public.my_founder_authority() THEN RAISE EXCEPTION 'office holder without founder role has no authority'; END IF;
  IF NOT public.has_permission('role.assign') THEN RAISE EXCEPTION 'founder office did not grant the founder permission set'; END IF;
  IF NOT public.civic_can_manage_voting_proposals(public.current_profile_id()) THEN RAISE EXCEPTION 'office holder cannot manage proposals'; END IF;
  RAISE NOTICE 'ok: the founder office grants founder powers to a member';
END $$;

ROLLBACK;
