-- Regression checks for 20261006120000_security_hardening_phase0.sql.
-- Runs inside one transaction and rolls back. Usage (local Supabase from scripts/local-supabase):
--   psql postgresql://postgres:postgres@127.0.0.1:56322/postgres -v ON_ERROR_STOP=1 -f supabase/tests/security_hardening_test.sql
BEGIN;

-- Two members and one proposal, created as the database owner.
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
VALUES
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sec-test-a@example.test', '', now(), '{"full_name":"Sec A","username":"sec_test_a"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sec-test-b@example.test', '', now(), '{"full_name":"Sec B","username":"sec_test_b"}', now(), now());

DO $$
BEGIN
  IF (SELECT count(*) FROM public.profiles WHERE user_id IN ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000b2')) <> 2 THEN
    RAISE EXCEPTION 'setup: profiles were not created for the test users';
  END IF;
END $$;

CREATE TEMP TABLE sec_ids AS
SELECT
  (SELECT id FROM public.profiles WHERE user_id = '00000000-0000-4000-8000-0000000000a1') AS a,
  (SELECT id FROM public.profiles WHERE user_id = '00000000-0000-4000-8000-0000000000b2') AS b;
GRANT SELECT ON sec_ids TO authenticated;

INSERT INTO public.governance_proposals (id, title, summary, proposer_id, opens_at, closes_at)
SELECT '00000000-0000-4000-8000-0000000000c3', 'Security test proposal', 'Test', a, now() - interval '1 hour', now() + interval '1 day'
FROM sec_ids;

-- Act as member A through the API.
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

-- 1. A member can edit their own bio but not their role, permissions or verification.
UPDATE public.profiles SET bio = 'hello' WHERE id = (SELECT a FROM sec_ids);

DO $$
BEGIN
  BEGIN
    UPDATE public.profiles SET role = 'admin' WHERE id = (SELECT a FROM sec_ids);
    RAISE EXCEPTION 'FAIL: member changed own role';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.profiles SET granted_permissions = '{settings.manage}' WHERE id = (SELECT a FROM sec_ids);
    RAISE EXCEPTION 'FAIL: member granted self permissions';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.profiles SET is_verified = true WHERE id = (SELECT a FROM sec_ids);
    RAISE EXCEPTION 'FAIL: member verified self';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.profiles SET is_governance_eligible = true WHERE id = (SELECT a FROM sec_ids);
    RAISE EXCEPTION 'FAIL: member set own governance eligibility';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

-- 2. A member cannot link someone else's profile directly.
DO $$
BEGIN
  BEGIN
    INSERT INTO public.linked_accounts (owner_profile_id, linked_profile_id, relationship_type, business_name_normalized)
    SELECT a, b, 'business', 'victim co' FROM sec_ids;
    RAISE EXCEPTION 'FAIL: member linked another profile';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

-- ...but can create an invite that the other account accepts from its own session.
CREATE TEMP TABLE sec_token AS SELECT public.create_linked_account_invite('acme test co') AS token;

-- 3. Votes: an unverified member cannot vote, whatever weight is sent.
DO $$
BEGIN
  BEGIN
    INSERT INTO public.governance_proposal_votes (proposal_id, voter_id, choice, weight)
    SELECT '00000000-0000-4000-8000-0000000000c3', a, 'approve', 1000000 FROM sec_ids;
    RAISE EXCEPTION 'FAIL: ineligible member voted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

RESET ROLE;

-- Member B accepts A's invite.
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
SELECT public.accept_linked_account_invite((SELECT token FROM sec_token));
DO $$
BEGIN
  BEGIN
    PERFORM public.accept_linked_account_invite((SELECT token FROM sec_token));
    RAISE EXCEPTION 'FAIL: invite accepted twice';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
END $$;
RESET ROLE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.linked_accounts la, sec_ids s
    WHERE la.owner_profile_id = s.a AND la.linked_profile_id = s.b
  ) THEN
    RAISE EXCEPTION 'FAIL: accepted invite did not create the link';
  END IF;
END $$;

-- An eligible, verified member's vote is stored with weight 1 even when the client sends more.
UPDATE public.profiles SET is_verified = true, is_governance_eligible = true WHERE id = (SELECT a FROM sec_ids);
INSERT INTO public.endorsements (endorser_id, endorsed_id, pillar, stars)
SELECT b, a, 'culture_ethics', 5 FROM sec_ids;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
INSERT INTO public.governance_proposal_votes (proposal_id, voter_id, choice, weight)
SELECT '00000000-0000-4000-8000-0000000000c3', a, 'approve', 1000000 FROM sec_ids;
RESET ROLE;

DO $$
BEGIN
  IF (SELECT weight FROM public.governance_proposal_votes v, sec_ids s
      WHERE v.proposal_id = '00000000-0000-4000-8000-0000000000c3' AND v.voter_id = s.a) <> 1 THEN
    RAISE EXCEPTION 'FAIL: client-chosen vote weight was stored';
  END IF;
END $$;

-- A decided proposal rejects vote changes.
UPDATE public.governance_proposals SET status = 'rejected'
WHERE id = '00000000-0000-4000-8000-0000000000c3';
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  BEGIN
    UPDATE public.governance_proposal_votes SET choice = 'reject'
    WHERE proposal_id = '00000000-0000-4000-8000-0000000000c3' AND voter_id = (SELECT a FROM sec_ids);
    IF NOT FOUND THEN RAISE EXCEPTION 'FAIL: test vote not visible to its voter'; END IF;
    RAISE EXCEPTION 'FAIL: vote changed after close';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

-- 4/5. Logged-out visitors cannot read unprotected tables or run internal functions.
SET LOCAL ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.governance_emergency_access_request_events LIMIT 1;
    RAISE EXCEPTION 'FAIL: anon read emergency access events';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.matter_complete_agent_run_service('{}'::jsonb);
    RAISE EXCEPTION 'FAIL: anon ran a service callback';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

SELECT 'security hardening checks passed' AS result;
ROLLBACK;
