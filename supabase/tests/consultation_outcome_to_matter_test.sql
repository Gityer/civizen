-- Phase 2 step 2.2: publishing a proposal makes its Matter public; closing the consultation writes
-- the outcome back to the Matter (system event, Decision, outcome follow-up for the responsible party)
-- exactly once.
-- Run with scripts/local-supabase/run-sql-tests.sh against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('test.author_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.author_pid', (SELECT id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.other_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'verified_member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.other_pid', (SELECT id::text FROM public.profiles WHERE username = 'verified_member' AND deleted_at IS NULL LIMIT 1), true);

DO $$
BEGIN
  IF coalesce(current_setting('test.author_uid', true), '') = '' OR coalesce(current_setting('test.other_uid', true), '') = '' THEN
    RAISE EXCEPTION 'fixtures citizen/verified_member missing in the local database';
  END IF;
END $$;

-- participants-only Matter from the author to the other member (who becomes the responsible party)
INSERT INTO public.matters (
  id, title, description, matter_type, visibility, initiator_kind, initiator_profile_id,
  addressee_kind, addressee_profile_id, responsible_kind, responsible_profile_id, created_by_profile_id, lifecycle_status
) VALUES (
  '33333333-3333-4333-8333-333333333331', 'Outcome test matter', 'Should the outcome come back here?', 'suggestion', 'participants',
  'person', current_setting('test.author_pid')::uuid,
  'person', current_setting('test.other_pid')::uuid,
  'person', current_setting('test.other_pid')::uuid,
  current_setting('test.author_pid')::uuid, 'active'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.author_uid'))::text, true);
SELECT set_config('test.proposal_id', public.create_voting_proposal_from_matter(
  '33333333-3333-4333-8333-333333333331', 'Outcome test proposal', 'Summary', 'Body', NULL)::text, true);
SELECT public.open_voting_proposal_for_support(current_setting('test.proposal_id')::uuid, 1);
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.other_uid'))::text, true);
SELECT public.toggle_voting_proposal_support(current_setting('test.proposal_id')::uuid);
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.author_uid'))::text, true);
SELECT set_config('test.election_id', public.publish_voting_proposal(current_setting('test.proposal_id')::uuid)::text, true);

-- ---- 1. publishing made the Matter public and said so -------------------------------------------
RESET ROLE;
DO $$
BEGIN
  IF (SELECT visibility FROM public.matters WHERE id = '33333333-3333-4333-8333-333333333331') <> 'public' THEN
    RAISE EXCEPTION 'Matter not made public on publish';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.matter_events WHERE matter_id = '33333333-3333-4333-8333-333333333331'
      AND event_type = 'made_public_for_consultation' AND is_system AND payload->>'previous_visibility' = 'participants'
  ) THEN RAISE EXCEPTION 'made_public_for_consultation event missing'; END IF;
  RAISE NOTICE 'ok: publish makes the Matter public';
END $$;

-- ---- 2. a verified voter supports; the window ends; the tick closes the election -----------------
UPDATE public.civic_elections SET status = 'open', voting_opens_at = now() - interval '2 minutes' WHERE id = current_setting('test.election_id')::uuid;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.author_uid'))::text, true);
SELECT public.cast_consultation_ballot(current_setting('test.election_id')::uuid, 'support');
RESET ROLE;
UPDATE public.civic_elections SET voting_closes_at = now() - interval '1 minute' WHERE id = current_setting('test.election_id')::uuid;
SELECT public.civic_close_due_elections();

DO $$
DECLARE ev record; d record; f record; a record;
BEGIN
  IF (SELECT status FROM public.civic_elections WHERE id = current_setting('test.election_id')::uuid) <> 'closed' THEN
    RAISE EXCEPTION 'election did not close';
  END IF;
  SELECT * INTO ev FROM public.matter_events
  WHERE matter_id = '33333333-3333-4333-8333-333333333331' AND event_type = 'consultation_closed';
  IF NOT FOUND THEN RAISE EXCEPTION 'consultation_closed event missing on the Matter'; END IF;
  IF NOT ev.is_system OR ev.actor_kind <> 'system' THEN RAISE EXCEPTION 'outcome event should be a system event'; END IF;
  IF ev.payload->>'election_id' <> current_setting('test.election_id') THEN RAISE EXCEPTION 'event payload lacks the election'; END IF;
  IF ev.payload->'final_outcome'->>'passed' <> 'true' THEN RAISE EXCEPTION 'event payload lacks the passed outcome: %', ev.payload; END IF;
  IF ev.summary NOT LIKE 'Consultation closed: Outcome test proposal. Passed:%' THEN RAISE EXCEPTION 'unexpected summary: %', ev.summary; END IF;

  SELECT * INTO d FROM public.matter_decisions WHERE matter_id = '33333333-3333-4333-8333-333333333331';
  IF NOT FOUND THEN RAISE EXCEPTION 'Decision not recorded on the Matter'; END IF;
  IF d.status <> 'accepted' OR d.title <> 'Consultation result: Outcome test proposal' THEN RAISE EXCEPTION 'Decision wrong: % / %', d.status, d.title; END IF;
  IF d.proposed_by_profile_id <> current_setting('test.author_pid')::uuid THEN RAISE EXCEPTION 'Decision not attributed to the proposal author'; END IF;

  SELECT * INTO f FROM public.matter_outcome_followups WHERE matter_id = '33333333-3333-4333-8333-333333333331';
  IF NOT FOUND THEN RAISE EXCEPTION 'outcome follow-up missing'; END IF;
  IF f.status <> 'pending' OR f.reviewer_profile_id <> current_setting('test.other_pid')::uuid THEN
    RAISE EXCEPTION 'follow-up should be pending for the responsible party: % %', f.status, f.reviewer_profile_id;
  END IF;
  SELECT * INTO a FROM public.matter_action_requirements WHERE id = f.action_id;
  IF NOT FOUND OR a.action_type <> 'outcome_followup' OR a.status <> 'pending'
     OR a.assigned_profile_id <> current_setting('test.other_pid')::uuid THEN
    RAISE EXCEPTION 'follow-up action not assigned to the responsible party';
  END IF;
  RAISE NOTICE 'ok: outcome event, Decision and follow-up action on the Matter';
END $$;

-- ---- 3. idempotent -------------------------------------------------------------------------------
DO $$
DECLARE n integer;
BEGIN
  n := public.civic_consultation_outcome_to_matter(current_setting('test.election_id')::uuid);
  IF n <> 0 THEN RAISE EXCEPTION 'second run recorded again (%)', n; END IF;
  SELECT count(*) INTO n FROM public.matter_events
  WHERE matter_id = '33333333-3333-4333-8333-333333333331' AND event_type = 'consultation_closed';
  IF n <> 1 THEN RAISE EXCEPTION 'expected one outcome event, got %', n; END IF;
  SELECT count(*) INTO n FROM public.matter_decisions WHERE matter_id = '33333333-3333-4333-8333-333333333331';
  IF n <> 1 THEN RAISE EXCEPTION 'expected one Decision, got %', n; END IF;
  RAISE NOTICE 'ok: outcome recorded once';
END $$;

-- ---- 4. the responsible party sees it as needing action ------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.other_uid'))::text, true);
DO $$
DECLARE rows jsonb;
BEGIN
  rows := public.list_matters('needs_action');
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(rows) r WHERE r->'matter'->>'id' = '33333333-3333-4333-8333-333333333331') THEN
    RAISE EXCEPTION 'responsible party does not see the follow-up in Needs your action';
  END IF;
  RAISE NOTICE 'ok: follow-up appears in Needs your action';
END $$;

ROLLBACK;
