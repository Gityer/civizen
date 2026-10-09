-- Decision D2: an unverified member's consultation ballot is advisory (own view + receipt, public
-- split, not in the count); it becomes countable when identity verification is approved while the
-- consultation is open. The author's support never counts toward a proposal threshold and a member
-- publishes only with a verified identity.
-- Run with scripts/local-supabase/run-sql-tests.sh against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('test.election_id', (
  SELECT id::text FROM public.civic_elections WHERE metadata->>'consultation_key' = 'single-world-citizenship' LIMIT 1), true);
SELECT set_config('test.member_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.member_pid', (SELECT id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.citizen_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.citizen_pid', (SELECT id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);

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

-- ---- 1. unverified member: ballot is advisory --------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member_uid'))::text, true);

DO $$
DECLARE e jsonb := public.my_consultation_eligibility(current_setting('test.election_id')::uuid);
BEGIN
  IF NOT (e->>'eligible')::boolean THEN RAISE EXCEPTION 'member should be eligible, got %', e; END IF;
  IF NOT (e->>'advisory')::boolean THEN RAISE EXCEPTION 'eligibility should flag the ballot as advisory, got %', e; END IF;
  RAISE NOTICE 'ok: eligibility announces an advisory ballot';
END $$;

SELECT set_config('test.cast1', public.cast_consultation_ballot(current_setting('test.election_id')::uuid, 'oppose')::text, true);
DO $$
DECLARE
  r jsonb := current_setting('test.cast1')::jsonb;
  b record; mine jsonb; oppose bigint; split record;
BEGIN
  IF length(r->>'receipt') < 16 THEN RAISE EXCEPTION 'no receipt returned: %', r; END IF;
  SELECT * INTO b FROM public.civic_ballots WHERE id = (r->>'ballot_id')::uuid;
  IF b.is_countable THEN RAISE EXCEPTION 'unverified ballot stored as countable'; END IF;
  IF NOT coalesce((b.metadata->>'advisory')::boolean, false) THEN RAISE EXCEPTION 'advisory marker missing: %', b.metadata; END IF;
  IF b.encrypted_payload IS NULL THEN RAISE EXCEPTION 'advisory choice not sealed'; END IF;
  SELECT vote_count INTO oppose FROM public.civic_election_public_tallies(current_setting('test.election_id')::uuid) WHERE option_key = 'oppose';
  IF oppose <> current_setting('test.oppose_before')::bigint THEN RAISE EXCEPTION 'advisory ballot moved the public tally'; END IF;
  IF public.civic_election_receipt_included(current_setting('test.election_id')::uuid, r->>'receipt') THEN
    RAISE EXCEPTION 'advisory receipt listed as counted';
  END IF;
  mine := public.my_consultation_ballot(current_setting('test.election_id')::uuid);
  IF mine IS NULL OR mine->>'option_key' <> 'oppose' THEN RAISE EXCEPTION 'voter cannot see own advisory ballot: %', mine; END IF;
  IF NOT (mine->>'advisory')::boolean THEN RAISE EXCEPTION 'own ballot not marked advisory: %', mine; END IF;
  IF mine->>'receipt' <> r->>'receipt' THEN RAISE EXCEPTION 'receipt mismatch'; END IF;
  SELECT * INTO split FROM public.civic_election_verification_split(current_setting('test.election_id')::uuid);
  IF split.unverified_count <> current_setting('test.advisory_before')::bigint + 1 THEN RAISE EXCEPTION 'advisory count expected +1, got %', split.unverified_count; END IF;
  IF split.verified_count <> current_setting('test.verified_before')::bigint THEN RAISE EXCEPTION 'countable count changed by an advisory ballot'; END IF;
  RAISE NOTICE 'ok: advisory ballot recorded, visible to the voter, outside the count';
END $$;

-- ---- 2. advisory ballot can be withdrawn and re-cast -------------------------------------------
DO $$
DECLARE withdrawn boolean; split record;
BEGIN
  withdrawn := public.withdraw_consultation_ballot(current_setting('test.election_id')::uuid);
  IF NOT withdrawn THEN RAISE EXCEPTION 'advisory ballot could not be withdrawn'; END IF;
  IF public.my_consultation_ballot(current_setting('test.election_id')::uuid) IS NOT NULL THEN RAISE EXCEPTION 'withdrawn advisory ballot still readable'; END IF;
  SELECT * INTO split FROM public.civic_election_verification_split(current_setting('test.election_id')::uuid);
  IF split.unverified_count <> current_setting('test.advisory_before')::bigint THEN RAISE EXCEPTION 'withdrawn advisory ballot still in the split'; END IF;
  RAISE NOTICE 'ok: advisory withdraw';
END $$;
SELECT set_config('test.cast2', public.cast_consultation_ballot(current_setting('test.election_id')::uuid, 'oppose')::text, true);

-- ---- 3. verification approval promotes the advisory ballot -------------------------------------
RESET ROLE;
INSERT INTO public.identity_verification_cases (profile_id, status, submitted_at, reviewed_at, resolved_at)
VALUES (current_setting('test.member_pid')::uuid, 'approved', now(), now(), now());
SELECT public.project_profile_verification_state(current_setting('test.member_pid')::uuid);
DO $$
DECLARE r jsonb := current_setting('test.cast2')::jsonb; b record; oppose bigint; split record;
BEGIN
  IF NOT (SELECT is_verified FROM public.profiles WHERE id = current_setting('test.member_pid')::uuid) THEN
    RAISE EXCEPTION 'approval did not verify the profile';
  END IF;
  SELECT * INTO b FROM public.civic_ballots WHERE id = (r->>'ballot_id')::uuid;
  IF NOT b.is_countable THEN RAISE EXCEPTION 'advisory ballot not promoted after verification'; END IF;
  IF coalesce((b.metadata->>'advisory')::boolean, false) THEN RAISE EXCEPTION 'advisory marker left after promotion'; END IF;
  SELECT vote_count INTO oppose FROM public.civic_election_public_tallies(current_setting('test.election_id')::uuid) WHERE option_key = 'oppose';
  IF oppose <> current_setting('test.oppose_before')::bigint + 1 THEN RAISE EXCEPTION 'promoted ballot not in the tally, got %', oppose; END IF;
  IF NOT public.civic_election_receipt_included(current_setting('test.election_id')::uuid, r->>'receipt') THEN RAISE EXCEPTION 'promoted receipt not listed'; END IF;
  SELECT * INTO split FROM public.civic_election_verification_split(current_setting('test.election_id')::uuid);
  IF split.verified_count <> current_setting('test.verified_before')::bigint + 1 THEN RAISE EXCEPTION 'countable count expected +1 after promotion'; END IF;
  RAISE NOTICE 'ok: verification promotes the advisory ballot';
END $$;
-- back to unverified for the proposal checks below
DELETE FROM public.identity_verification_cases WHERE profile_id = current_setting('test.member_pid')::uuid;
SELECT public.project_profile_verification_state(current_setting('test.member_pid')::uuid);

-- ---- 4. proposals: author support excluded, verified author required to publish ---------------
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

-- unverified member drafts the second proposal and opens it
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member_uid'))::text, true);
SELECT set_config('test.prop_unverified', public.create_voting_proposal_from_matter(
  '22222222-2222-4222-8222-222222222222', 'D2 unverified author proposal', 'Summary', 'Body', NULL)::text, true);
SELECT public.open_voting_proposal_for_support(current_setting('test.prop_unverified')::uuid, 1);
-- member supports the verified author's proposal (support itself needs no verification)
DO $$
DECLARE s jsonb := public.toggle_voting_proposal_support(current_setting('test.prop_verified')::uuid);
BEGIN
  IF (s->>'count')::int <> 1 OR NOT (s->>'ready')::boolean OR (s->>'is_author')::boolean THEN RAISE EXCEPTION 'supporter summary wrong: %', s; END IF;
  RAISE NOTICE 'ok: another member reaches the threshold';
END $$;

-- citizen supports the unverified author's proposal; the author still cannot publish
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.citizen_uid'))::text, true);
SELECT public.toggle_voting_proposal_support(current_setting('test.prop_unverified')::uuid);
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member_uid'))::text, true);
DO $$
BEGIN
  PERFORM public.publish_voting_proposal(current_setting('test.prop_unverified')::uuid);
  RAISE EXCEPTION 'unverified author published';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'verification_required' THEN RAISE EXCEPTION 'expected verification_required, got %', SQLERRM; END IF;
  RAISE NOTICE 'ok: unverified author cannot publish';
END $$;

-- core publish is not callable directly by members
DO $$
BEGIN
  PERFORM public.publish_voting_proposal_core(current_setting('test.prop_unverified')::uuid);
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
