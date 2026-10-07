-- Ranked ballots: picks keep the voter's order, tallies show first preferences, instant run-off decides.
-- Run with scripts/local-supabase/run-sql-tests.sh against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('test.author_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.author_pid', (SELECT id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.voter_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.voter_pid', (SELECT id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
-- a third voter: any other live profile with an auth user
SELECT set_config('test.third_uid', (SELECT user_id::text FROM public.profiles WHERE deleted_at IS NULL AND user_id IS NOT NULL AND username NOT IN ('member', 'citizen') AND role NOT IN ('founder', 'admin') ORDER BY created_at LIMIT 1), true);
SELECT set_config('test.third_pid', (SELECT id::text FROM public.profiles WHERE user_id::text = current_setting('test.third_uid') LIMIT 1), true);

INSERT INTO public.matters (
  id, title, description, matter_type, initiator_kind, initiator_profile_id,
  addressee_kind, addressee_profile_id, responsible_kind, responsible_profile_id, created_by_profile_id
) VALUES (
  '44444444-4444-4444-8444-444444444444', 'Ranked test matter', 'Which venue?', 'suggestion',
  'person', current_setting('test.author_pid')::uuid,
  'person', current_setting('test.voter_pid')::uuid,
  'person', current_setting('test.voter_pid')::uuid,
  current_setting('test.author_pid')::uuid
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.author_uid'))::text, true);
SELECT set_config('test.proposal_id', public.create_voting_proposal_from_matter(
  '44444444-4444-4444-8444-444444444444', 'Which venue?', 'Summary', 'Body', NULL)::text, true);

DO $$
DECLARE s jsonb;
BEGIN
  s := public.update_voting_proposal_settings(current_setting('test.proposal_id')::uuid, 'global', NULL, NULL, NULL,
    '["Hall", "Park", "School"]'::jsonb, 1, NULL, 'ranked', NULL);
  IF s->>'ballot_method' <> 'ranked' THEN RAISE EXCEPTION 'ranked method not stored: %', s; END IF;
  RAISE NOTICE 'ok: ranked method stored';
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
  IF e.metadata->>'ballot_method' <> 'ranked' THEN RAISE EXCEPTION 'ballot_method not copied: %', e.metadata; END IF;
  SELECT seat_count INTO seats FROM public.civic_contests WHERE election_id = e.id;
  IF seats <> 3 THEN RAISE EXCEPTION 'seat_count should equal the option count, got %', seats; END IF;
  RAISE NOTICE 'ok: published as a ranked ballot';
END $$;

-- ---- three ballots: Park 1, Hall 1, School 1 first preferences; School's voter prefers Park next ----
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.voter_uid'))::text, true);
SELECT public.cast_consultation_ballot(current_setting('test.election_id')::uuid, ARRAY['park', 'hall']);
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.author_uid'))::text, true);
SELECT public.cast_consultation_ballot(current_setting('test.election_id')::uuid, ARRAY['hall', 'school', 'park']);
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.third_uid'))::text, true);
DO $$
BEGIN
  IF current_setting('test.third_uid') IS NULL OR current_setting('test.third_uid') = '' THEN
    RAISE NOTICE 'skip: no third voter available';
  ELSE
    PERFORM public.cast_consultation_ballot(current_setting('test.election_id')::uuid, ARRAY['school', 'park']);
    RAISE NOTICE 'ok: third ballot cast';
  END IF;
END $$;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.voter_uid'))::text, true);

DO $$
DECLARE park bigint; hall bigint; school bigint; mine jsonb; total bigint;
BEGIN
  SELECT vote_count INTO park FROM public.civic_election_public_tallies(current_setting('test.election_id')::uuid) WHERE option_key = 'park';
  SELECT vote_count INTO hall FROM public.civic_election_public_tallies(current_setting('test.election_id')::uuid) WHERE option_key = 'hall';
  SELECT vote_count INTO school FROM public.civic_election_public_tallies(current_setting('test.election_id')::uuid) WHERE option_key = 'school';
  SELECT sum(vote_count) INTO total FROM public.civic_election_public_tallies(current_setting('test.election_id')::uuid);
  IF park <> 1 OR hall <> 1 THEN RAISE EXCEPTION 'first preferences wrong: park % hall % school %', park, hall, school; END IF;
  IF total NOT IN (2, 3) THEN RAISE EXCEPTION 'each ballot must count once in the tally, got %', total; END IF;
  mine := public.my_consultation_ballot(current_setting('test.election_id')::uuid);
  IF mine->'option_keys' <> '["park","hall"]'::jsonb THEN RAISE EXCEPTION 'ranking order not kept: %', mine; END IF;
  RAISE NOTICE 'ok: first preferences tallied, ranking order kept';
END $$;

-- ---- instant run-off: with 3 ballots nobody has a majority in round 1; School (fewest, alphabetical tie-break
--      among the three 1-vote options? no: all tie at 1, the alphabetically last key 'school' is eliminated) ----
RESET ROLE;
DO $$
DECLARE r jsonb; n int;
BEGIN
  SELECT count(*) INTO n FROM public.civic_ballots WHERE election_id = current_setting('test.election_id')::uuid AND is_countable;
  r := public.civic_election_ranked_result(current_setting('test.election_id')::uuid);
  IF n = 3 THEN
    -- round 1: park 1, hall 1, school 1 -> eliminate 'school' (ties break to the alphabetically last key)
    -- round 2: school's ballot moves to park -> park 2 of 3 = majority
    IF r->>'winner_option_key' <> 'park' THEN RAISE EXCEPTION 'expected park to win the run-off: %', r; END IF;
    IF jsonb_array_length(r->'rounds') <> 2 THEN RAISE EXCEPTION 'expected 2 rounds: %', r; END IF;
    IF (r->'rounds'->0->>'eliminated') <> 'school' THEN RAISE EXCEPTION 'expected school eliminated first: %', r; END IF;
    RAISE NOTICE 'ok: instant run-off with transfer';
  ELSE
    -- two ballots: park 1, hall 1 -> eliminate 'school' (0) then tie 1-1 -> eliminate 'park' (alphabetically last) -> hall wins
    IF r->>'winner_option_key' IS NULL THEN RAISE EXCEPTION 'expected a winner: %', r; END IF;
    RAISE NOTICE 'ok: instant run-off (two ballots) produced a winner: %', r->>'winner_option_key';
  END IF;
END $$;

-- ---- outcome at close ---------------------------------------------------------------------------
UPDATE public.civic_elections SET voting_opens_at = now() - interval '2 minutes', voting_closes_at = now() - interval '1 minute'
  WHERE id = current_setting('test.election_id')::uuid;
DO $$
DECLARE e record; o jsonb;
BEGIN
  PERFORM public.civic_close_due_elections();
  SELECT * INTO e FROM public.civic_elections WHERE id = current_setting('test.election_id')::uuid;
  o := e.metadata->'final_outcome';
  IF o IS NULL THEN RAISE EXCEPTION 'final_outcome missing'; END IF;
  IF o->>'ballot_method' <> 'ranked' THEN RAISE EXCEPTION 'ballot_method missing: %', o; END IF;
  IF o->'ranked_rounds' IS NULL OR jsonb_array_length(o->'ranked_rounds') < 1 THEN RAISE EXCEPTION 'rounds missing: %', o; END IF;
  IF o->>'leading_option_key' IS NULL THEN RAISE EXCEPTION 'winner missing: %', o; END IF;
  IF jsonb_typeof(o->'passed') <> 'null' THEN RAISE EXCEPTION 'ranked outcome has no pass verdict: %', o; END IF;
  RAISE NOTICE 'ok: ranked outcome stored';
END $$;

ROLLBACK;
