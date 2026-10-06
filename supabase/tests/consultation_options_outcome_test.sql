-- Custom ballot options, quorum and pass threshold, published outcome.
-- Run with scripts/local-supabase/run-sql-tests.sh against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('test.author_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.author_pid', (SELECT id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.voter_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.voter_pid', (SELECT id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.swc_id', (SELECT id::text FROM public.civic_elections WHERE metadata->>'consultation_key' = 'single-world-citizenship' LIMIT 1), true);

INSERT INTO public.matters (
  id, title, description, matter_type, initiator_kind, initiator_profile_id,
  addressee_kind, addressee_profile_id, responsible_kind, responsible_profile_id, created_by_profile_id
) VALUES (
  '22222222-2222-4222-8222-222222222222', 'Options test matter', 'Which colour?', 'suggestion',
  'person', current_setting('test.author_pid')::uuid,
  'person', current_setting('test.voter_pid')::uuid,
  'person', current_setting('test.voter_pid')::uuid,
  current_setting('test.author_pid')::uuid
);

-- ---- custom options ------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.author_uid'))::text, true);
SELECT set_config('test.proposal_id', public.create_voting_proposal_from_matter(
  '22222222-2222-4222-8222-222222222222', 'Pick a colour', 'Summary', 'Body', NULL)::text, true);

DO $$
BEGIN
  PERFORM public.update_voting_proposal_settings(current_setting('test.proposal_id')::uuid, 'global', NULL, NULL, NULL, '["Only one"]'::jsonb, NULL, NULL);
  RAISE EXCEPTION 'single option accepted';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'invalid_options' THEN RAISE EXCEPTION 'expected invalid_options, got %', SQLERRM; END IF;
  RAISE NOTICE 'ok: fewer than two options rejected';
END $$;

DO $$
DECLARE s jsonb;
BEGIN
  s := public.update_voting_proposal_settings(
    current_setting('test.proposal_id')::uuid, 'global', NULL, NULL, NULL,
    '["Keep as is", {"key": "change_it", "label": "Change it"}, "Not sure"]'::jsonb, 1, 60);
  IF jsonb_array_length(s->'options') <> 3 THEN RAISE EXCEPTION 'options not stored: %', s; END IF;
  IF (s->'options'->0->>'key') <> 'keep_as_is' THEN RAISE EXCEPTION 'key not slugified: %', s; END IF;
  IF (s->>'quorum')::int <> 1 OR (s->>'pass_threshold_percent')::numeric <> 60 THEN RAISE EXCEPTION 'rules not stored: %', s; END IF;
  RAISE NOTICE 'ok: options, quorum and threshold stored';
END $$;

-- manager-free author publication via threshold 1
SELECT public.open_voting_proposal_for_support(current_setting('test.proposal_id')::uuid, 1);
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.voter_uid'))::text, true);
SELECT public.toggle_voting_proposal_support(current_setting('test.proposal_id')::uuid);
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.author_uid'))::text, true);
SELECT set_config('test.election_id', public.publish_voting_proposal(current_setting('test.proposal_id')::uuid)::text, true);

RESET ROLE;
DO $$
DECLARE n int; e record;
BEGIN
  SELECT count(*) INTO n FROM public.civic_candidates c JOIN public.civic_contests ct ON ct.id = c.contest_id
  WHERE ct.election_id = current_setting('test.election_id')::uuid;
  IF n <> 3 THEN RAISE EXCEPTION 'expected 3 candidates, got %', n; END IF;
  SELECT * INTO e FROM public.civic_elections WHERE id = current_setting('test.election_id')::uuid;
  IF NOT coalesce((e.metadata->>'custom_options')::boolean, false) THEN RAISE EXCEPTION 'custom_options flag missing'; END IF;
  IF (e.metadata->>'quorum')::int <> 1 THEN RAISE EXCEPTION 'quorum not copied to election'; END IF;
  RAISE NOTICE 'ok: published with custom options';
END $$;

-- ---- voting on custom options ----------------------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.voter_uid'))::text, true);
DO $$
BEGIN
  PERFORM public.cast_consultation_ballot(current_setting('test.election_id')::uuid, 'purple');
  RAISE EXCEPTION 'unknown option accepted';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'option_not_found' THEN RAISE EXCEPTION 'expected option_not_found, got %', SQLERRM; END IF;
  RAISE NOTICE 'ok: unknown option rejected';
END $$;
SELECT public.cast_consultation_ballot(current_setting('test.election_id')::uuid, 'change_it');
DO $$
DECLARE n bigint;
BEGIN
  SELECT vote_count INTO n FROM public.civic_election_public_tallies(current_setting('test.election_id')::uuid) WHERE option_key = 'change_it';
  IF n <> 1 THEN RAISE EXCEPTION 'custom option not tallied'; END IF;
  IF public.my_consultation_ballot_option(current_setting('test.election_id')::uuid) <> 'change_it' THEN RAISE EXCEPTION 'own custom choice not readable'; END IF;
  RAISE NOTICE 'ok: custom option cast and tallied';
END $$;

-- ---- outcome without a Support/Oppose pair: leading option only -------------------------------
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
  IF o->>'leading_option_key' <> 'change_it' THEN RAISE EXCEPTION 'leading option wrong: %', o; END IF;
  IF (o->>'quorum_met')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'quorum should be met: %', o; END IF;
  IF jsonb_typeof(o->'passed') <> 'null' THEN RAISE EXCEPTION 'passed must be null without support/oppose: %', o; END IF;
  RAISE NOTICE 'ok: outcome for custom options';
END $$;

-- ---- binary outcome on the live consultation: quorum 2, threshold 60, 1 support + 1 oppose ----
DELETE FROM public.civic_ballots WHERE election_id = current_setting('test.swc_id')::uuid
  AND profile_id IN (current_setting('test.author_pid')::uuid, current_setting('test.voter_pid')::uuid);
DELETE FROM public.civic_vote_sessions WHERE election_id = current_setting('test.swc_id')::uuid
  AND profile_id IN (current_setting('test.author_pid')::uuid, current_setting('test.voter_pid')::uuid);
UPDATE public.civic_elections
  SET status = 'open', voting_opens_at = now() - interval '1 day', voting_closes_at = now() + interval '1 day',
      metadata = (metadata - 'final_outcome' - 'final_tally' - 'closed_at' - 'min_age' - 'requires_verified')
        || '{"quorum": 2, "pass_threshold_percent": 60}'::jsonb
  WHERE id = current_setting('test.swc_id')::uuid;
SELECT set_config('test.support_before', (
  SELECT coalesce(sum(vote_count), 0)::text FROM public.civic_election_public_tallies(current_setting('test.swc_id')::uuid)
  WHERE option_key IN ('support', 'oppose')), true);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.author_uid'))::text, true);
SELECT public.cast_consultation_ballot(current_setting('test.swc_id')::uuid, 'support');
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.voter_uid'))::text, true);
SELECT public.cast_consultation_ballot(current_setting('test.swc_id')::uuid, 'oppose');
RESET ROLE;
DO $$
DECLARE o jsonb;
BEGIN
  IF current_setting('test.support_before')::int <> 0 THEN
    RAISE NOTICE 'skip: live consultation already has decided ballots (%), binary outcome not asserted', current_setting('test.support_before');
    RETURN;
  END IF;
  o := public.civic_election_outcome(current_setting('test.swc_id')::uuid);
  IF (o->>'total_countable')::int < 2 THEN RAISE EXCEPTION 'expected 2 countable, got %', o; END IF;
  IF (o->>'quorum_met')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'quorum 2 should be met: %', o; END IF;
  IF (o->>'support_share_percent')::numeric <> 50 THEN RAISE EXCEPTION 'share should be 50: %', o; END IF;
  IF (o->>'passed')::boolean IS NOT FALSE THEN RAISE EXCEPTION 'should not pass a 60%% threshold: %', o; END IF;
  RAISE NOTICE 'ok: binary outcome with quorum and threshold';
END $$;

ROLLBACK;
