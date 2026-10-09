-- Approval ballots: a member picks several options, each pick is tallied, the ballot stays sealed.
-- Run with scripts/local-supabase/run-sql-tests.sh against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('test.author_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'verified_member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.author_pid', (SELECT id::text FROM public.profiles WHERE username = 'verified_member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.voter_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.voter_pid', (SELECT id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);

INSERT INTO public.matters (
  id, title, description, matter_type, initiator_kind, initiator_profile_id,
  addressee_kind, addressee_profile_id, responsible_kind, responsible_profile_id, created_by_profile_id
) VALUES (
  '33333333-3333-4333-8333-333333333333', 'Approval test matter', 'Which projects first?', 'suggestion',
  'person', current_setting('test.author_pid')::uuid,
  'person', current_setting('test.voter_pid')::uuid,
  'person', current_setting('test.voter_pid')::uuid,
  current_setting('test.author_pid')::uuid
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.author_uid'))::text, true);
SELECT set_config('test.proposal_id', public.create_voting_proposal_from_matter(
  '33333333-3333-4333-8333-333333333333', 'Which projects first?', 'Summary', 'Body', NULL)::text, true);

-- ---- settings: approval needs custom options, max selections is bounded --------------------------
DO $$
BEGIN
  PERFORM public.update_voting_proposal_settings(current_setting('test.proposal_id')::uuid, 'global', NULL, NULL, NULL, NULL, NULL, NULL, 'approval', NULL);
  RAISE EXCEPTION 'approval without options accepted';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'approval_needs_options' THEN RAISE EXCEPTION 'expected approval_needs_options, got %', SQLERRM; END IF;
  RAISE NOTICE 'ok: approval without custom options rejected';
END $$;

DO $$
BEGIN
  PERFORM public.update_voting_proposal_settings(current_setting('test.proposal_id')::uuid, 'global', NULL, NULL, NULL,
    '["Park", "Library", "Clinic", "Bridge"]'::jsonb, NULL, NULL, 'approval', 9);
  RAISE EXCEPTION 'max selections above the option count accepted';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'invalid_max_selections' THEN RAISE EXCEPTION 'expected invalid_max_selections, got %', SQLERRM; END IF;
  RAISE NOTICE 'ok: max selections bounded by the option count';
END $$;

DO $$
DECLARE s jsonb;
BEGIN
  s := public.update_voting_proposal_settings(current_setting('test.proposal_id')::uuid, 'global', NULL, NULL, NULL,
    '["Park", "Library", "Clinic", "Bridge"]'::jsonb, 1, NULL, 'approval', 2);
  IF s->>'ballot_method' <> 'approval' OR (s->>'max_selections')::int <> 2 THEN RAISE EXCEPTION 'method not stored: %', s; END IF;
  RAISE NOTICE 'ok: approval method and max selections stored';
END $$;

SELECT public.open_voting_proposal_for_support(current_setting('test.proposal_id')::uuid, 1);
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.voter_uid'))::text, true);
SELECT public.toggle_voting_proposal_support(current_setting('test.proposal_id')::uuid);
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.author_uid'))::text, true);
SELECT set_config('test.election_id', public.publish_voting_proposal(current_setting('test.proposal_id')::uuid)::text, true);

RESET ROLE;
DO $$
DECLARE e record; seats int;
BEGIN
  SELECT * INTO e FROM public.civic_elections WHERE id = current_setting('test.election_id')::uuid;
  IF e.metadata->>'ballot_method' <> 'approval' THEN RAISE EXCEPTION 'ballot_method not copied to the election: %', e.metadata; END IF;
  IF (e.metadata->>'max_selections')::int <> 2 THEN RAISE EXCEPTION 'max_selections not copied: %', e.metadata; END IF;
  SELECT seat_count INTO seats FROM public.civic_contests WHERE election_id = e.id;
  IF seats <> 2 THEN RAISE EXCEPTION 'contest seat_count should mirror max_selections, got %', seats; END IF;
  RAISE NOTICE 'ok: published as an approval ballot';
END $$;

-- ---- casting ------------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.voter_uid'))::text, true);
DO $$
BEGIN
  PERFORM public.cast_consultation_ballot(current_setting('test.election_id')::uuid, ARRAY['park', 'library', 'clinic']);
  RAISE EXCEPTION 'three picks accepted with max 2';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'too_many_selections' THEN RAISE EXCEPTION 'expected too_many_selections, got %', SQLERRM; END IF;
  RAISE NOTICE 'ok: more picks than allowed rejected';
END $$;
DO $$
BEGIN
  PERFORM public.cast_consultation_ballot(current_setting('test.election_id')::uuid, ARRAY['park', 'castle']);
  RAISE EXCEPTION 'unknown option accepted';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'option_not_found' THEN RAISE EXCEPTION 'expected option_not_found, got %', SQLERRM; END IF;
  RAISE NOTICE 'ok: unknown option in an approval ballot rejected';
END $$;

SELECT set_config('test.receipt', public.cast_consultation_ballot(current_setting('test.election_id')::uuid, ARRAY['park', 'Library '])->>'receipt', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.author_uid'))::text, true);
SELECT public.cast_consultation_ballot(current_setting('test.election_id')::uuid, ARRAY['library']);
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.voter_uid'))::text, true);

DO $$
DECLARE park bigint; lib bigint; clinic bigint; mine jsonb; stored text;
BEGIN
  SELECT vote_count INTO park FROM public.civic_election_public_tallies(current_setting('test.election_id')::uuid) WHERE option_key = 'park';
  SELECT vote_count INTO lib FROM public.civic_election_public_tallies(current_setting('test.election_id')::uuid) WHERE option_key = 'library';
  SELECT vote_count INTO clinic FROM public.civic_election_public_tallies(current_setting('test.election_id')::uuid) WHERE option_key = 'clinic';
  IF park <> 1 OR lib <> 2 OR clinic <> 0 THEN RAISE EXCEPTION 'approval tallies wrong: park % library % clinic %', park, lib, clinic; END IF;
  mine := public.my_consultation_ballot(current_setting('test.election_id')::uuid);
  IF mine->'option_keys' <> '["park","library"]'::jsonb THEN RAISE EXCEPTION 'own picks not readable (voter order, trimmed, lower-cased): %', mine; END IF;
  IF mine->>'option_key' <> 'park' THEN RAISE EXCEPTION 'first pick should fill option_key: %', mine; END IF;
  SELECT encrypted_payload INTO stored FROM public.civic_ballots
    WHERE election_id = current_setting('test.election_id')::uuid AND profile_id = current_setting('test.voter_pid')::uuid;
  IF stored IS NULL OR stored ILIKE '%park%' THEN RAISE EXCEPTION 'approval choices stored in clear'; END IF;
  RAISE NOTICE 'ok: every pick tallied, own picks readable, payload sealed';
END $$;

-- a single-choice election rejects a multi-pick ballot
RESET ROLE;
SELECT set_config('test.swc_id', (SELECT id::text FROM public.civic_elections WHERE metadata->>'consultation_key' = 'single-world-citizenship' LIMIT 1), true);
UPDATE public.civic_elections
  SET status = 'open', voting_opens_at = now() - interval '1 day', voting_closes_at = now() + interval '1 day',
      metadata = metadata - 'min_age' - 'requires_verified'
  WHERE id = current_setting('test.swc_id')::uuid;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.voter_uid'))::text, true);
DO $$
BEGIN
  PERFORM public.cast_consultation_ballot(current_setting('test.swc_id')::uuid, ARRAY['support', 'abstain']);
  RAISE EXCEPTION 'two picks accepted on a single-choice ballot';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'too_many_selections' THEN RAISE EXCEPTION 'expected too_many_selections, got %', SQLERRM; END IF;
  RAISE NOTICE 'ok: single-choice ballot rejects several picks';
END $$;

-- ---- outcome: ballots are counted once, the most approved option leads, a reached decision passes ----------
RESET ROLE;
UPDATE public.civic_elections SET voting_opens_at = now() - interval '2 minutes', voting_closes_at = now() - interval '1 minute'
  WHERE id = current_setting('test.election_id')::uuid;
DO $$
DECLARE e record; o jsonb;
BEGIN
  PERFORM public.civic_close_due_elections();
  SELECT * INTO e FROM public.civic_elections WHERE id = current_setting('test.election_id')::uuid;
  o := e.metadata->'final_outcome';
  IF o IS NULL THEN RAISE EXCEPTION 'final_outcome missing'; END IF;
  IF (o->>'total_countable')::int <> 2 THEN RAISE EXCEPTION 'ballots must be counted once each: %', o; END IF;
  IF (o->>'approvals_total')::int <> 3 THEN RAISE EXCEPTION 'approvals_total wrong: %', o; END IF;
  IF o->>'leading_option_key' <> 'library' THEN RAISE EXCEPTION 'leading option wrong: %', o; END IF;
  IF o->>'ballot_method' <> 'approval' THEN RAISE EXCEPTION 'ballot_method missing from outcome: %', o; END IF;
  IF (o->>'passed')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'approval outcome with a leading option should pass (step 2.7): %', o; END IF;
  IF (o->>'quorum_met')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'quorum 1 should be met: %', o; END IF;
  RAISE NOTICE 'ok: approval outcome';
END $$;

ROLLBACK;
