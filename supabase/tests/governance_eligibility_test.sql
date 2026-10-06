-- Regression checks for 20261006160000_server_governance_eligibility.sql. Runs in one transaction and rolls back.
BEGIN;

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
VALUES
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gov-a@example.test', '', now(), '{"full_name":"Gov A","username":"gov_test_a"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gov-b@example.test', '', now(), '{"full_name":"Gov B","username":"gov_test_b"}', now(), now());

CREATE TEMP TABLE gov_ids AS
SELECT
  (SELECT id FROM public.profiles WHERE user_id = '00000000-0000-4000-8000-0000000000f1') AS a,
  (SELECT id FROM public.profiles WHERE user_id = '00000000-0000-4000-8000-0000000000f2') AS b;
GRANT SELECT ON gov_ids TO authenticated;

INSERT INTO public.governance_proposals (id, title, summary, proposer_id, opens_at, closes_at)
SELECT '00000000-0000-4000-8000-0000000000f3', 'Eligibility test proposal', 'Test', b, now() - interval '1 hour', now() + interval '1 day'
FROM gov_ids;

-- A is verified, with two pillars: 5 stars (100) and 2 stars (40), so the score is 70.
UPDATE public.profiles SET is_verified = true WHERE id = (SELECT a FROM gov_ids);
INSERT INTO public.endorsements (endorser_id, endorsed_id, pillar, stars)
SELECT b, a, 'culture_ethics'::public.pillar_type, 5 FROM gov_ids
UNION ALL SELECT b, a, 'education_skills'::public.pillar_type, 2 FROM gov_ids;

DO $$
BEGIN
  IF public.governance_score_for((SELECT a FROM gov_ids)) <> 70 THEN
    RAISE EXCEPTION 'FAIL: score is %, expected 70', public.governance_score_for((SELECT a FROM gov_ids));
  END IF;
  IF public.governance_score_for((SELECT b FROM gov_ids)) <> 0 THEN
    RAISE EXCEPTION 'FAIL: member with no endorsements should score 0';
  END IF;
END $$;

SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000f2","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

-- B (unverified, score 0) cannot mark themselves eligible or write a snapshot.
DO $$
BEGIN
  BEGIN
    UPDATE public.profiles SET is_governance_eligible = true WHERE id = (SELECT b FROM gov_ids);
    RAISE EXCEPTION 'FAIL: member set own eligibility';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.governance_eligibility_snapshots (profile_id, citizenship_status, eligible)
    SELECT b, 'registered_member', true FROM gov_ids;
    RAISE EXCEPTION 'FAIL: member wrote own snapshot';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.refresh_governance_eligibility((SELECT a FROM gov_ids));
    RAISE EXCEPTION 'FAIL: member refreshed someone else';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF (public.refresh_governance_eligibility()->>'eligible')::boolean THEN
    RAISE EXCEPTION 'FAIL: unverified member came out eligible';
  END IF;
END $$;

-- A refreshes and becomes eligible, then votes.
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000f1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  v jsonb := public.refresh_governance_eligibility();
BEGIN
  IF NOT (v->>'eligible')::boolean THEN
    RAISE EXCEPTION 'FAIL: eligible member came out ineligible: %', v;
  END IF;
  IF NOT (SELECT is_governance_eligible FROM public.profiles WHERE id = (SELECT a FROM gov_ids)) THEN
    RAISE EXCEPTION 'FAIL: profile flag not updated';
  END IF;
  IF (SELECT source FROM public.governance_eligibility_snapshots WHERE profile_id = (SELECT a FROM gov_ids)) <> 'server' THEN
    RAISE EXCEPTION 'FAIL: snapshot not written by the server';
  END IF;
END $$;
INSERT INTO public.governance_proposal_votes (proposal_id, voter_id, choice)
SELECT '00000000-0000-4000-8000-0000000000f3', a, 'approve' FROM gov_ids;
DELETE FROM public.governance_proposal_votes
WHERE proposal_id = '00000000-0000-4000-8000-0000000000f3' AND voter_id = (SELECT a FROM gov_ids);
RESET ROLE;

-- A low endorsement drops the score below 70: the stored flag no longer lets A vote.
INSERT INTO public.endorsements (endorser_id, endorsed_id, pillar, stars)
SELECT b, a, 'economy_contribution', 1 FROM gov_ids;
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  BEGIN
    INSERT INTO public.governance_proposal_votes (proposal_id, voter_id, choice)
    SELECT '00000000-0000-4000-8000-0000000000f3', a, 'approve' FROM gov_ids;
    RAISE EXCEPTION 'FAIL: member below the minimum score voted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

-- An active voting sanction blocks an otherwise eligible voter.
DELETE FROM public.endorsements WHERE endorsed_id = (SELECT a FROM gov_ids) AND pillar = 'economy_contribution';
INSERT INTO public.governance_sanctions (profile_id, reason, blocks_governance_all, blocks_voting)
SELECT a, 'test', false, true FROM gov_ids;
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  BEGIN
    INSERT INTO public.governance_proposal_votes (proposal_id, voter_id, choice)
    SELECT '00000000-0000-4000-8000-0000000000f3', a, 'approve' FROM gov_ids;
    RAISE EXCEPTION 'FAIL: sanctioned member voted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

ROLLBACK;
