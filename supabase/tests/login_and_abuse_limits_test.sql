-- Regression checks for 20261006170000_login_and_abuse_limits.sql. Runs in one transaction and rolls back.
BEGIN;

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
VALUES
  ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'login-a@example.test', extensions.crypt('correct horse', extensions.gen_salt('bf')), now(), '{"full_name":"Login A","username":"login_test_a"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000d2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'login-b@example.test', '', now(), '{"full_name":"Login B","username":"civizen_support"}', now(), now());

SET LOCAL ROLE anon;
DO $$
DECLARE
  i integer;
BEGIN
  IF public.resolve_login_email('login_test_a', 'correct horse') IS DISTINCT FROM 'login-a@example.test' THEN
    RAISE EXCEPTION 'FAIL: right password did not resolve';
  END IF;
  IF public.resolve_login_email('login_test_a', 'wrong') IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL: wrong password revealed the email';
  END IF;
  IF public.resolve_login_email('nobody_here', 'x') IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL: unknown user resolved';
  END IF;
  BEGIN
    PERFORM public.resolve_login_email('login_test_a');
    RAISE EXCEPTION 'FAIL: anon can still call the one-argument lookup';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  FOR i IN 1..9 LOOP
    PERFORM public.resolve_login_email('login_test_a', 'wrong');
  END LOOP;
  BEGIN
    PERFORM public.resolve_login_email('login_test_a', 'correct horse');
    RAISE EXCEPTION 'FAIL: failures were not limited';
  EXCEPTION WHEN program_limit_exceeded THEN NULL;
  END;
END $$;
RESET ROLE;

-- Sign-up with a reserved username gets a neutral one instead.
DO $$
BEGIN
  IF (SELECT username FROM public.profiles WHERE user_id = '00000000-0000-4000-8000-0000000000d2') LIKE '%civizen%' THEN
    RAISE EXCEPTION 'FAIL: reserved username kept at sign-up';
  END IF;
END $$;

-- A member cannot rename themselves to a reserved name.
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000d1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  BEGIN
    UPDATE public.profiles SET username = 'c1vizen_official' WHERE user_id = '00000000-0000-4000-8000-0000000000d1';
    RAISE EXCEPTION 'FAIL: member took a reserved username';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.consume_ai_quota((SELECT id FROM public.profiles WHERE user_id = '00000000-0000-4000-8000-0000000000d1'), 'x', 1, interval '1 hour');
    RAISE EXCEPTION 'FAIL: member can call consume_ai_quota';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

-- AI quota.
SET LOCAL ROLE service_role;
DO $$
DECLARE
  v_profile uuid := (SELECT id FROM public.profiles WHERE user_id = '00000000-0000-4000-8000-0000000000d1');
BEGIN
  IF NOT public.consume_ai_quota(v_profile, 'test', 2, interval '1 hour') THEN RAISE EXCEPTION 'FAIL: first use refused'; END IF;
  IF NOT public.consume_ai_quota(v_profile, 'test', 2, interval '1 hour') THEN RAISE EXCEPTION 'FAIL: second use refused'; END IF;
  IF public.consume_ai_quota(v_profile, 'test', 2, interval '1 hour') THEN RAISE EXCEPTION 'FAIL: quota not enforced'; END IF;
  IF NOT public.consume_ai_quota(v_profile, 'other', 2, interval '1 hour') THEN RAISE EXCEPTION 'FAIL: buckets are not separate'; END IF;
END $$;

-- Emergency access: no self-approval, and only the requester can use it.
RESET ROLE;
CREATE TEMP TABLE ea_ids AS
SELECT
  (SELECT id FROM public.profiles WHERE user_id = '00000000-0000-4000-8000-0000000000d1') AS a,
  (SELECT id FROM public.profiles WHERE user_id = '00000000-0000-4000-8000-0000000000d2') AS b;
INSERT INTO public.governance_emergency_access_requests (id, target_profile_id, requested_by, request_reason)
SELECT '00000000-0000-4000-8000-0000000000d9', b, a, 'test emergency' FROM ea_ids;
DO $$
BEGIN
  BEGIN
    UPDATE public.governance_emergency_access_requests
    SET request_status = 'approved', reviewed_by = (SELECT a FROM ea_ids), reviewed_at = now(), approved_expires_at = now() + interval '30 minutes'
    WHERE id = '00000000-0000-4000-8000-0000000000d9';
    RAISE EXCEPTION 'FAIL: requester approved own emergency access';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  UPDATE public.governance_emergency_access_requests
  SET request_status = 'approved', reviewed_by = (SELECT b FROM ea_ids), reviewed_at = now(), approved_expires_at = now() + interval '30 minutes'
  WHERE id = '00000000-0000-4000-8000-0000000000d9';
  BEGIN
    UPDATE public.governance_emergency_access_requests
    SET consumed_at = now(), consumed_by = (SELECT b FROM ea_ids)
    WHERE id = '00000000-0000-4000-8000-0000000000d9';
    RAISE EXCEPTION 'FAIL: someone other than the requester used emergency access';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

ROLLBACK;
