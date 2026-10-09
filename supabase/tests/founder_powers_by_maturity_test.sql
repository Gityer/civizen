-- Phase 10 step 10.4: founder operational permissions are withdrawn per mature domain, the founder role can only be
-- given by a sitting founder, and emergency approvals need two reviewers once Security and Incident Response is mature.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('a2000000-0000-4000-8000-000000000001', 'maturity-founder@test.local'),
  ('a2000000-0000-4000-8000-000000000002', 'maturity-admin@test.local'),
  ('a2000000-0000-4000-8000-000000000003', 'maturity-admin2@test.local'),
  ('a2000000-0000-4000-8000-000000000004', 'maturity-member@test.local')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.profiles (user_id, username, full_name)
SELECT u.id, 'mat_' || split_part(u.email, '@', 1), 'Maturity ' || split_part(u.email, '@', 1)
  FROM auth.users u
 WHERE u.email LIKE 'maturity-%@test.local' AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id);

CREATE TEMP TABLE fx AS
SELECT (SELECT id FROM public.profiles WHERE user_id = 'a2000000-0000-4000-8000-000000000001') AS founder,
       (SELECT id FROM public.profiles WHERE user_id = 'a2000000-0000-4000-8000-000000000002') AS admin1,
       (SELECT id FROM public.profiles WHERE user_id = 'a2000000-0000-4000-8000-000000000003') AS admin2,
       (SELECT id FROM public.profiles WHERE user_id = 'a2000000-0000-4000-8000-000000000004') AS member;
GRANT SELECT ON fx TO authenticated;

UPDATE public.profiles SET role = 'founder', is_admin = true WHERE id = (SELECT founder FROM fx);
UPDATE public.profiles SET role = 'admin', is_admin = true WHERE id IN ((SELECT admin1 FROM fx), (SELECT admin2 FROM fx));
INSERT INTO public.constitutional_offices (profile_id, office_key, is_active)
VALUES ((SELECT founder FROM fx), 'founder', true)
ON CONFLICT DO NOTHING;

-- 1. While every domain is immature the founder keeps bootstrap access.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'a2000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
DO $$
BEGIN
  IF NOT public.has_permission('post.moderate') THEN RAISE EXCEPTION 'founder must keep post.moderate while moderation is immature'; END IF;
  IF NOT public.has_permission('settings.manage') THEN RAISE EXCEPTION 'founder must keep settings.manage while technical stewardship is immature'; END IF;
END $$;
RESET ROLE;

-- 2. Moderation and conduct becomes mature: the founder's moderation permissions are withdrawn, nothing else.
INSERT INTO public.governance_domain_maturity_snapshots (domain_key, is_mature, threshold_count, thresholds_met_count, threshold_results, measured_at, source)
VALUES ('moderation_conduct', true, 3, 3, '[]'::jsonb, now(), 'test');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'a2000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
DO $$
BEGIN
  IF public.has_permission('post.moderate') THEN RAISE EXCEPTION 'founder post.moderate must be withdrawn once moderation is mature'; END IF;
  IF public.has_permission('report.review') THEN RAISE EXCEPTION 'founder report.review must be withdrawn once moderation is mature'; END IF;
  IF NOT public.has_permission('settings.manage') THEN RAISE EXCEPTION 'an immature domain must not lose founder access'; END IF;
  IF NOT public.has_permission('profile.read') THEN RAISE EXCEPTION 'baseline permissions must stay'; END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(public.founder_domain_access_summary()) e WHERE e->>'domain_key' = 'moderation_conduct' AND e->>'founder_access' = 'withdrawn') <> 1 THEN
    RAISE EXCEPTION 'summary must report moderation as withdrawn';
  END IF;
END $$;
RESET ROLE;

-- 2b. An ordinary active assignment in that domain restores the founder as an ordinary domain member.
INSERT INTO public.profile_governance_roles (profile_id, domain_key, role_key, is_active, assignment_source)
VALUES ((SELECT founder FROM fx), 'moderation_conduct', 'steward', true, 'manual');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'a2000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
DO $$
BEGIN
  IF NOT public.has_permission('post.moderate') THEN RAISE EXCEPTION 'an ordinary assignment in the mature domain must restore the permission'; END IF;
END $$;
RESET ROLE;

-- 3. An admin who is not a sitting founder cannot hand out the founder role; the founder can.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'a2000000-0000-4000-8000-000000000002', 'role', 'authenticated')::text, true);
DO $$
BEGIN
  UPDATE public.profiles SET role = 'founder' WHERE id = (SELECT member FROM fx);
  RAISE EXCEPTION 'an admin must not be able to assign the founder role';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'a2000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
UPDATE public.profiles SET role = 'founder' WHERE id = (SELECT member FROM fx);
RESET ROLE;
DO $$
BEGIN
  IF (SELECT role FROM public.profiles WHERE id = (SELECT member FROM fx)) <> 'founder' THEN RAISE EXCEPTION 'a sitting founder must be able to assign the founder role'; END IF;
END $$;
UPDATE public.profiles SET role = 'member' WHERE id = (SELECT member FROM fx);

-- 4. Emergency approvals: one reviewer suffices while security is immature; two once it is mature; never your own request.
INSERT INTO public.governance_emergency_access_requests (target_profile_id, requested_by, request_reason)
VALUES ((SELECT member FROM fx), (SELECT admin1 FROM fx), 'test request one');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'a2000000-0000-4000-8000-000000000002', 'role', 'authenticated')::text, true);
DO $$
BEGIN
  PERFORM public.review_governance_emergency_access_request((SELECT id FROM public.governance_emergency_access_requests WHERE request_reason = 'test request one'), 'approved', NULL, 30);
  RAISE EXCEPTION 'a reviewer must not approve their own request';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM NOT LIKE '%own emergency access request%' THEN RAISE; END IF;
END $$;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'a2000000-0000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
SELECT public.review_governance_emergency_access_request((SELECT id FROM public.governance_emergency_access_requests WHERE request_reason = 'test request one'), 'approved', NULL, 30);
RESET ROLE;
DO $$
BEGIN
  IF (SELECT request_status FROM public.governance_emergency_access_requests WHERE request_reason = 'test request one') <> 'approved' THEN
    RAISE EXCEPTION 'one reviewer must suffice while the security domain is immature';
  END IF;
END $$;

INSERT INTO public.governance_domain_maturity_snapshots (domain_key, is_mature, threshold_count, thresholds_met_count, threshold_results, measured_at, source)
VALUES ('security_incident_response', true, 1, 1, '[]'::jsonb, now(), 'test');
INSERT INTO public.governance_emergency_access_requests (target_profile_id, requested_by, request_reason)
VALUES ((SELECT member FROM fx), (SELECT admin1 FROM fx), 'test request two');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'a2000000-0000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
SELECT public.review_governance_emergency_access_request((SELECT id FROM public.governance_emergency_access_requests WHERE request_reason = 'test request two'), 'approved', 'first approval', 30);
RESET ROLE;
DO $$
BEGIN
  IF (SELECT request_status FROM public.governance_emergency_access_requests WHERE request_reason = 'test request two') <> 'pending' THEN
    RAISE EXCEPTION 'with security mature, one approval must leave the request pending';
  END IF;
  IF public.emergency_access_request_approval_count((SELECT id FROM public.governance_emergency_access_requests WHERE request_reason = 'test request two')) <> 1 THEN
    RAISE EXCEPTION 'the first approval must be recorded';
  END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'a2000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
SELECT public.review_governance_emergency_access_request((SELECT id FROM public.governance_emergency_access_requests WHERE request_reason = 'test request two'), 'approved', 'second approval', 30);
RESET ROLE;
DO $$
BEGIN
  IF (SELECT request_status FROM public.governance_emergency_access_requests WHERE request_reason = 'test request two') <> 'approved' THEN
    RAISE EXCEPTION 'the second distinct approval must approve the request';
  END IF;
END $$;

SELECT 'founder_powers_by_maturity_test passed' AS result;
ROLLBACK;
