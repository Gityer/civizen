-- Consultation ballot integrity: cast / change / withdraw / receipt / eligibility / lifecycle.
-- Run with scripts/local-supabase/run-sql-tests.sh against the LOCAL database only.
-- Everything happens inside one transaction that is rolled back at the end.

BEGIN;

SELECT set_config('test.election_id', (
  SELECT id::text FROM public.civic_elections
  WHERE metadata->>'consultation_key' = 'single-world-citizenship' LIMIT 1), true);
-- The countable flow needs a verified voter (decision D2); "member" below is the verified fixture citizen.
SELECT set_config('test.member_uid', (
  SELECT p.user_id::text FROM public.profiles p WHERE p.username = 'citizen' AND p.deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.member_pid', (
  SELECT p.id::text FROM public.profiles p WHERE p.username = 'citizen' AND p.deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.unverified_uid', (
  SELECT p.user_id::text FROM public.profiles p WHERE p.username = 'member' AND p.deleted_at IS NULL LIMIT 1), true);

DO $$
BEGIN
  IF coalesce(current_setting('test.election_id', true), '') = '' THEN
    RAISE EXCEPTION 'single-world-citizenship election missing in the local database';
  END IF;
  IF coalesce(current_setting('test.member_uid', true), '') = '' THEN
    RAISE EXCEPTION 'test profiles "citizen"/"member" missing in the local database';
  END IF;
END $$;

-- Clean slate for the member and a known-open window.
DELETE FROM public.civic_ballots
  WHERE election_id = current_setting('test.election_id')::uuid
    AND profile_id = current_setting('test.member_pid')::uuid;
DELETE FROM public.civic_vote_sessions
  WHERE election_id = current_setting('test.election_id')::uuid
    AND profile_id = current_setting('test.member_pid')::uuid;
DELETE FROM public.governance_sanctions WHERE profile_id = current_setting('test.member_pid')::uuid;
UPDATE public.civic_elections
  SET status = 'open',
      voting_opens_at = now() - interval '1 day',
      voting_closes_at = now() + interval '30 days',
      metadata = metadata - 'min_age' - 'requires_verified' - 'final_tally' - 'closed_at'
  WHERE id = current_setting('test.election_id')::uuid;
UPDATE public.profiles SET date_of_birth = NULL WHERE id = current_setting('test.member_pid')::uuid;

SELECT set_config('test.events_before', (
  SELECT count(*)::text FROM public.civic_voting_events
  WHERE election_id = current_setting('test.election_id')::uuid), true);
SELECT set_config('test.support_before', (
  SELECT coalesce(sum(vote_count), 0)::text FROM public.civic_election_public_tallies(current_setting('test.election_id')::uuid)
  WHERE option_key = 'support'), true);

-- ---- act as the member through the API role ------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member_uid'))::text, true);

-- eligible before casting
DO $$
DECLARE e jsonb := public.my_consultation_eligibility(current_setting('test.election_id')::uuid);
BEGIN
  IF NOT (e->>'eligible')::boolean THEN RAISE EXCEPTION 'member should be eligible, got %', e; END IF;
END $$;

-- 1. cast returns a receipt, stores no clear choice, tally moves
SELECT set_config('test.cast1', public.cast_consultation_ballot(current_setting('test.election_id')::uuid, 'support')::text, true);
DO $$
DECLARE
  r jsonb := current_setting('test.cast1')::jsonb;
  b record;
  mine jsonb;
  support bigint;
BEGIN
  IF length(r->>'receipt') < 16 THEN RAISE EXCEPTION 'no receipt returned: %', r; END IF;
  SELECT * INTO b FROM public.civic_ballots WHERE id = (r->>'ballot_id')::uuid;
  IF b.encrypted_payload IS NULL THEN RAISE EXCEPTION 'choice not sealed'; END IF;
  IF b.metadata ? 'option_key' THEN RAISE EXCEPTION 'clear option_key left in ballot metadata'; END IF;
  IF EXISTS (SELECT 1 FROM public.civic_ballot_selections WHERE ballot_id = b.id AND candidate_id IS NOT NULL) THEN
    RAISE EXCEPTION 'clear candidate selection stored';
  END IF;
  mine := public.my_consultation_ballot(current_setting('test.election_id')::uuid);
  IF mine->>'option_key' <> 'support' THEN RAISE EXCEPTION 'own ballot not readable back: %', mine; END IF;
  IF mine->>'receipt' <> r->>'receipt' THEN RAISE EXCEPTION 'receipt mismatch'; END IF;
  SELECT vote_count INTO support FROM public.civic_election_public_tallies(current_setting('test.election_id')::uuid) WHERE option_key = 'support';
  IF support <> current_setting('test.support_before')::bigint + 1 THEN RAISE EXCEPTION 'support tally expected +1, got %', support; END IF;
  IF NOT public.civic_election_receipt_included(current_setting('test.election_id')::uuid, r->>'receipt') THEN
    RAISE EXCEPTION 'receipt not listed as counted';
  END IF;
  RAISE NOTICE 'ok: cast sealed, tallied, receipt listed';
END $$;

-- 2. change keeps the receipt and moves the tally
SELECT set_config('test.cast2', public.cast_consultation_ballot(current_setting('test.election_id')::uuid, 'oppose')::text, true);
DO $$
DECLARE
  r1 jsonb := current_setting('test.cast1')::jsonb;
  r2 jsonb := current_setting('test.cast2')::jsonb;
  support bigint; oppose bigint;
BEGIN
  IF r1->>'receipt' <> r2->>'receipt' THEN RAISE EXCEPTION 'changing a counted ballot must keep the receipt'; END IF;
  SELECT vote_count INTO support FROM public.civic_election_public_tallies(current_setting('test.election_id')::uuid) WHERE option_key = 'support';
  SELECT vote_count INTO oppose FROM public.civic_election_public_tallies(current_setting('test.election_id')::uuid) WHERE option_key = 'oppose';
  IF support <> current_setting('test.support_before')::bigint THEN RAISE EXCEPTION 'support should be back to baseline, got %', support; END IF;
  IF oppose < 1 THEN RAISE EXCEPTION 'oppose should count the change'; END IF;
  IF public.my_consultation_ballot_option(current_setting('test.election_id')::uuid) <> 'oppose' THEN RAISE EXCEPTION 'option after change wrong'; END IF;
  RAISE NOTICE 'ok: change counted, receipt kept';
END $$;

-- 3. withdraw removes the ballot from counts and the receipt list
SELECT public.withdraw_consultation_ballot(current_setting('test.election_id')::uuid);
DO $$
DECLARE r1 jsonb := current_setting('test.cast1')::jsonb; b record;
BEGIN
  IF public.my_consultation_ballot(current_setting('test.election_id')::uuid) IS NOT NULL THEN RAISE EXCEPTION 'withdrawn ballot still readable as mine'; END IF;
  IF public.civic_election_receipt_included(current_setting('test.election_id')::uuid, r1->>'receipt') THEN RAISE EXCEPTION 'withdrawn receipt still listed'; END IF;
  SELECT * INTO b FROM public.civic_ballots WHERE id = (r1->>'ballot_id')::uuid;
  IF b.encrypted_payload IS NOT NULL THEN RAISE EXCEPTION 'withdrawn ballot still holds a sealed choice'; END IF;
  IF b.metadata ? 'prior_choice_hash' THEN RAISE EXCEPTION 'reversible prior_choice_hash written'; END IF;
  RAISE NOTICE 'ok: withdraw';
END $$;

-- 4. re-cast after withdrawal gets a fresh receipt
SELECT set_config('test.cast3', public.cast_consultation_ballot(current_setting('test.election_id')::uuid, 'abstain')::text, true);
DO $$
DECLARE r1 jsonb := current_setting('test.cast1')::jsonb; r3 jsonb := current_setting('test.cast3')::jsonb;
BEGIN
  IF r1->>'receipt' = r3->>'receipt' THEN RAISE EXCEPTION 're-cast after withdrawal must not reuse the receipt'; END IF;
  RAISE NOTICE 'ok: re-cast fresh receipt';
END $$;

-- 5. event chain: cast, changed, withdrawn, cast = 4 new events, each linked to the previous
DO $$
DECLARE
  before int := current_setting('test.events_before')::int;
  after int;
  broken int;
BEGIN
  SELECT count(*) INTO after FROM public.civic_voting_events WHERE election_id = current_setting('test.election_id')::uuid;
  IF after <> before + 4 THEN RAISE EXCEPTION 'expected 4 new events, got %', after - before; END IF;
  SELECT count(*) INTO broken FROM (
    SELECT event_hash, prev_event_hash,
      lag(event_hash) OVER (ORDER BY created_at, id) AS expected_prev
    FROM public.civic_voting_events WHERE election_id = current_setting('test.election_id')::uuid
  ) x WHERE coalesce(prev_event_hash, '') <> coalesce(expected_prev, '');
  IF broken > 0 THEN RAISE EXCEPTION 'hash chain broken in % rows', broken; END IF;
  IF EXISTS (SELECT 1 FROM public.civic_voting_events WHERE election_id = current_setting('test.election_id')::uuid AND (actor_id IS NOT NULL OR session_id IS NOT NULL)) THEN
    RAISE EXCEPTION 'event carries a voter/session id';
  END IF;
  RAISE NOTICE 'ok: event chain';
END $$;

-- ---- eligibility rules (admin edits, member attempts) ----------------------------------------
RESET ROLE;
INSERT INTO public.governance_sanctions (profile_id, reason, is_active, starts_at, blocks_voting)
VALUES (current_setting('test.member_pid')::uuid, 'integrity test', true, now() - interval '1 minute', true);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member_uid'))::text, true);
DO $$
BEGIN
  PERFORM public.cast_consultation_ballot(current_setting('test.election_id')::uuid, 'support');
  RAISE EXCEPTION 'sanctioned member could vote';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'voter_blocked' THEN RAISE EXCEPTION 'expected voter_blocked, got %', SQLERRM; END IF;
  RAISE NOTICE 'ok: sanction blocks voting';
END $$;

RESET ROLE;
DELETE FROM public.governance_sanctions WHERE profile_id = current_setting('test.member_pid')::uuid;
UPDATE public.civic_elections SET metadata = metadata || '{"min_age": 18}'::jsonb WHERE id = current_setting('test.election_id')::uuid;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member_uid'))::text, true);
DO $$
DECLARE e jsonb := public.my_consultation_eligibility(current_setting('test.election_id')::uuid);
BEGIN
  IF e->>'reason' <> 'age_unknown' THEN RAISE EXCEPTION 'expected age_unknown, got %', e; END IF;
  RAISE NOTICE 'ok: min_age without date of birth';
END $$;

RESET ROLE;
UPDATE public.profiles SET date_of_birth = current_date - interval '10 years' WHERE id = current_setting('test.member_pid')::uuid;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member_uid'))::text, true);
DO $$
BEGIN
  PERFORM public.cast_consultation_ballot(current_setting('test.election_id')::uuid, 'support');
  RAISE EXCEPTION 'under-age member could vote';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'under_age' THEN RAISE EXCEPTION 'expected under_age, got %', SQLERRM; END IF;
  RAISE NOTICE 'ok: under_age';
END $$;

RESET ROLE;
UPDATE public.civic_elections SET metadata = (metadata - 'min_age') || '{"requires_verified": true}'::jsonb WHERE id = current_setting('test.election_id')::uuid;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.unverified_uid'))::text, true);
DO $$
DECLARE e jsonb := public.my_consultation_eligibility(current_setting('test.election_id')::uuid);
BEGIN
  IF e->>'reason' <> 'verification_required' THEN RAISE EXCEPTION 'expected verification_required, got %', e; END IF;
  RAISE NOTICE 'ok: requires_verified';
END $$;

-- ---- lifecycle: window passes, election closes with a published tally ---------------------
RESET ROLE;
UPDATE public.civic_elections
  SET metadata = metadata - 'requires_verified', voting_closes_at = now() - interval '1 minute'
  WHERE id = current_setting('test.election_id')::uuid;
DO $$
DECLARE n int; e record;
BEGIN
  n := public.civic_close_due_elections();
  IF n < 1 THEN RAISE EXCEPTION 'close tick did not close the due election'; END IF;
  SELECT * INTO e FROM public.civic_elections WHERE id = current_setting('test.election_id')::uuid;
  IF e.status <> 'closed' THEN RAISE EXCEPTION 'election not closed'; END IF;
  IF NOT (e.metadata ? 'final_tally') THEN RAISE EXCEPTION 'final tally not published'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.civic_voting_events WHERE election_id = e.id AND event_type = 'election_closed') THEN
    RAISE EXCEPTION 'election_closed event missing';
  END IF;
  IF EXISTS (SELECT 1 FROM public.civic_voting_proposals WHERE election_id = e.id AND status = 'published') THEN
    RAISE EXCEPTION 'proposal left published after close';
  END IF;
  RAISE NOTICE 'ok: lifecycle close';
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member_uid'))::text, true);
DO $$
BEGIN
  PERFORM public.cast_consultation_ballot(current_setting('test.election_id')::uuid, 'support');
  RAISE EXCEPTION 'could vote after close';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'election_not_open' THEN RAISE EXCEPTION 'expected election_not_open, got %', SQLERRM; END IF;
  RAISE NOTICE 'ok: no votes after close';
END $$;

-- ---- secrets are not reachable through the API ---------------------------------------------
DO $$
BEGIN
  PERFORM 1 FROM public.civic_election_secrets LIMIT 1;
  RAISE EXCEPTION 'authenticated role can read election secrets';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'ok: secrets hidden from API roles';
END $$;

ROLLBACK;
