-- Owner decision 2026-10-30 (replacing decision D2's advisory ballots): a consultation ballot needs a verified
-- identity. An unverified member is told so before voting and refused if they try; once verified, their ballot counts.
-- Drafting, supporting and publishing proposals need a verified identity too, and the author's support never counts.
-- Run with scripts/local-supabase/run-sql-tests.sh against the LOCAL database only. Rolls back.

BEGIN;

-- these cases test the requirement itself, which is off by default (20261101100000)
UPDATE public.platform_flags SET enabled = true WHERE key = 'identity_verification_required';

SELECT set_config('test.election_id', (
  SELECT id::text FROM public.civic_elections WHERE metadata->>'consultation_key' = 'single-world-citizenship' LIMIT 1), true);
SELECT set_config('test.member_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.member_pid', (SELECT id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.citizen_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.citizen_pid', (SELECT id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
-- the fixture member is verified for the e2e suite; this test needs an unverified member (rolled back)
UPDATE public.profiles SET is_verified = false WHERE id = current_setting('test.member_pid')::uuid;

DO $$
BEGIN
  IF coalesce(current_setting('test.election_id', true), '') = '' THEN RAISE EXCEPTION 'single-world-citizenship election missing'; END IF;
  IF coalesce(current_setting('test.member_uid', true), '') = '' OR coalesce(current_setting('test.citizen_uid', true), '') = '' THEN
    RAISE EXCEPTION 'fixtures member/citizen missing in the local database';
  END IF;
  IF (SELECT is_verified FROM public.profiles WHERE id = current_setting('test.member_pid')::uuid) THEN
    RAISE EXCEPTION 'fixture member must be unverified for this test';
  END IF;
  IF NOT (SELECT is_verified FROM public.profiles WHERE id = current_setting('test.citizen_pid')::uuid) THEN
    RAISE EXCEPTION 'fixture citizen must be verified for this test';
  END IF;
END $$;

-- Clean slate for the member and a known-open window.
DELETE FROM public.civic_ballots WHERE election_id = current_setting('test.election_id')::uuid AND profile_id = current_setting('test.member_pid')::uuid;
DELETE FROM public.civic_vote_sessions WHERE election_id = current_setting('test.election_id')::uuid AND profile_id = current_setting('test.member_pid')::uuid;
DELETE FROM public.identity_verification_cases WHERE profile_id = current_setting('test.member_pid')::uuid;
UPDATE public.civic_elections
  SET status = 'open', voting_opens_at = now() - interval '1 day', voting_closes_at = now() + interval '30 days',
      metadata = metadata - 'min_age' - 'requires_verified' - 'final_tally' - 'closed_at'
  WHERE id = current_setting('test.election_id')::uuid;

SELECT set_config('test.oppose_before', (
  SELECT coalesce(sum(vote_count), 0)::text FROM public.civic_election_public_tallies(current_setting('test.election_id')::uuid) WHERE option_key = 'oppose'), true);
SELECT set_config('test.verified_before', (SELECT verified_count::text FROM public.civic_election_verification_split(current_setting('test.election_id')::uuid)), true);
SELECT set_config('test.advisory_before', (SELECT unverified_count::text FROM public.civic_election_verification_split(current_setting('test.election_id')::uuid)), true);

-- ---- 1. unverified member: told before voting, refused when trying -------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member_uid'))::text, true);

DO $$
DECLARE e jsonb := public.my_consultation_eligibility(current_setting('test.election_id')::uuid);
BEGIN
  IF (e->>'eligible')::boolean OR e->>'reason' <> 'verification_required' THEN
    RAISE EXCEPTION 'eligibility should ask for verification, got %', e;
  END IF;
  BEGIN
    PERFORM public.cast_consultation_ballot(current_setting('test.election_id')::uuid, 'oppose');
    RAISE EXCEPTION 'an unverified member cast a ballot';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'verification_required' THEN RAISE; END IF;
  END;
  IF public.my_consultation_ballot(current_setting('test.election_id')::uuid) IS NOT NULL THEN RAISE EXCEPTION 'a refused ballot was stored'; END IF;
  RAISE NOTICE 'ok: an unverified member is asked to verify and cannot vote';
END $$;

-- ---- 2. once verified, the ballot counts ------------------------------------------------------
RESET ROLE;
INSERT INTO public.identity_verification_cases (profile_id, status, submitted_at, reviewed_at, resolved_at)
VALUES (current_setting('test.member_pid')::uuid, 'approved', now(), now(), now());
SELECT public.project_profile_verification_state(current_setting('test.member_pid')::uuid);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member_uid'))::text, true);
SELECT set_config('test.cast2', public.cast_consultation_ballot(current_setting('test.election_id')::uuid, 'oppose')::text, true);
RESET ROLE;
DO $$
DECLARE r jsonb := current_setting('test.cast2')::jsonb; b record; oppose bigint; split record;
BEGIN
  SELECT * INTO b FROM public.civic_ballots WHERE id = (r->>'ballot_id')::uuid;
  IF NOT b.is_countable THEN RAISE EXCEPTION 'a verified ballot was not countable'; END IF;
  SELECT vote_count INTO oppose FROM public.civic_election_public_tallies(current_setting('test.election_id')::uuid) WHERE option_key = 'oppose';
  IF oppose <> current_setting('test.oppose_before')::bigint + 1 THEN RAISE EXCEPTION 'the ballot is not in the tally, got %', oppose; END IF;
  IF NOT public.civic_election_receipt_included(current_setting('test.election_id')::uuid, r->>'receipt') THEN RAISE EXCEPTION 'receipt not listed'; END IF;
  SELECT * INTO split FROM public.civic_election_verification_split(current_setting('test.election_id')::uuid);
  IF split.verified_count <> current_setting('test.verified_before')::bigint + 1 THEN RAISE EXCEPTION 'countable count expected +1'; END IF;
  RAISE NOTICE 'ok: a verified member''s ballot counts';
END $$;
-- back to unverified for the proposal checks below
DELETE FROM public.identity_verification_cases WHERE profile_id = current_setting('test.member_pid')::uuid;
SELECT public.project_profile_verification_state(current_setting('test.member_pid')::uuid);

-- ---- 4. proposals: author support excluded, verified author required to publish ---------------
SELECT set_config('request.jwt.claims', '', true);
INSERT INTO public.matters (
  id, title, description, matter_type, initiator_kind, initiator_profile_id,
  addressee_kind, addressee_profile_id, responsible_kind, responsible_profile_id, created_by_profile_id
) VALUES
  ('22222222-2222-4222-8222-222222222221', 'D2 verified author matter', 'Verified author proposal.', 'suggestion',
   'person', current_setting('test.citizen_pid')::uuid, 'person', current_setting('test.member_pid')::uuid,
   'person', current_setting('test.member_pid')::uuid, current_setting('test.citizen_pid')::uuid),
  ('22222222-2222-4222-8222-222222222222', 'D2 unverified author matter', 'Unverified author proposal.', 'suggestion',
   'person', current_setting('test.member_pid')::uuid, 'person', current_setting('test.citizen_pid')::uuid,
   'person', current_setting('test.citizen_pid')::uuid, current_setting('test.member_pid')::uuid);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.citizen_uid'))::text, true);
SELECT set_config('test.prop_verified', public.create_voting_proposal_from_matter(
  '22222222-2222-4222-8222-222222222221', 'D2 verified author proposal', 'Summary', 'Body', NULL)::text, true);
SELECT public.open_voting_proposal_for_support(current_setting('test.prop_verified')::uuid, 1);
DO $$
DECLARE s jsonb;
BEGIN
  BEGIN
    PERFORM public.toggle_voting_proposal_support(current_setting('test.prop_verified')::uuid);
    RAISE EXCEPTION 'author supported their own proposal';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'author_cannot_support' THEN RAISE EXCEPTION 'expected author_cannot_support, got %', SQLERRM; END IF;
  END;
  s := public.voting_proposal_support_summary(current_setting('test.prop_verified')::uuid);
  IF (s->>'count')::int <> 0 OR (s->>'ready')::boolean OR NOT (s->>'is_author')::boolean THEN RAISE EXCEPTION 'summary wrong for author: %', s; END IF;
  BEGIN
    PERFORM public.publish_voting_proposal(current_setting('test.prop_verified')::uuid);
    RAISE EXCEPTION 'published without any supporter';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'not_authorized_to_publish' THEN RAISE EXCEPTION 'expected not_authorized_to_publish, got %', SQLERRM; END IF;
  END;
  RAISE NOTICE 'ok: author support excluded';
END $$;

-- an unverified member can neither draft a proposal nor support one
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member_uid'))::text, true);
DO $$
BEGIN
  BEGIN
    PERFORM public.create_voting_proposal_from_matter('22222222-2222-4222-8222-222222222222', 'D2 unverified author proposal', 'Summary', 'Body', NULL);
    RAISE EXCEPTION 'an unverified member drafted a proposal';
  EXCEPTION WHEN SQLSTATE 'PT403' THEN NULL;
  END;
  BEGIN
    PERFORM public.toggle_voting_proposal_support(current_setting('test.prop_verified')::uuid);
    RAISE EXCEPTION 'an unverified member supported a proposal';
  EXCEPTION WHEN SQLSTATE 'PT403' THEN NULL;
  END;
  RAISE NOTICE 'ok: drafting and supporting need a verified identity';
END $$;

-- once verified, the member's support reaches the threshold
RESET ROLE;
INSERT INTO public.identity_verification_cases (profile_id, status, submitted_at, reviewed_at, resolved_at)
VALUES (current_setting('test.member_pid')::uuid, 'approved', now(), now(), now());
SELECT public.project_profile_verification_state(current_setting('test.member_pid')::uuid);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member_uid'))::text, true);
DO $$
DECLARE s jsonb := public.toggle_voting_proposal_support(current_setting('test.prop_verified')::uuid);
BEGIN
  IF (s->>'count')::int <> 1 OR NOT (s->>'ready')::boolean OR (s->>'is_author')::boolean THEN RAISE EXCEPTION 'supporter summary wrong: %', s; END IF;
  RAISE NOTICE 'ok: another member reaches the threshold';
END $$;

-- core publish is not callable directly by members
DO $$
BEGIN
  PERFORM public.publish_voting_proposal_core(current_setting('test.prop_verified')::uuid);
  RAISE EXCEPTION 'member could call publish_voting_proposal_core directly';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'ok: core publish is server-only';
END $$;

-- verified author publishes once the threshold is met by others
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.citizen_uid'))::text, true);
DO $$
DECLARE e uuid := public.publish_voting_proposal(current_setting('test.prop_verified')::uuid);
BEGIN
  IF e IS NULL THEN RAISE EXCEPTION 'publish returned no election'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.civic_elections WHERE id = e) THEN RAISE EXCEPTION 'election not created'; END IF;
  RAISE NOTICE 'ok: verified author publishes';
END $$;

ROLLBACK;
