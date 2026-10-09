-- Member-supported voting proposals: open for support, support toggle, threshold-gated author
-- publication, scope/time settings, scheduled opening, notifications, legacy weight clamp.
-- Run with scripts/local-supabase/run-sql-tests.sh against the LOCAL database only. Rolls back.

BEGIN;

-- Author and supporter are verified fixtures: a member publishes only with a verified identity (D2).
SELECT set_config('test.author_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.author_pid', (SELECT id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.supporter_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'verified_member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.supporter_pid', (SELECT id::text FROM public.profiles WHERE username = 'verified_member' AND deleted_at IS NULL LIMIT 1), true);

DO $$
BEGIN
  IF coalesce(current_setting('test.author_uid', true), '') = '' OR coalesce(current_setting('test.supporter_uid', true), '') = '' THEN
    RAISE EXCEPTION 'test profiles citizen/verified_member missing in the local database';
  END IF;
END $$;

-- A Matter owned by the author (minimal columns; the schema has defaults for the rest).
INSERT INTO public.matters (
  id, title, description, matter_type, initiator_kind, initiator_profile_id,
  addressee_kind, addressee_profile_id, responsible_kind, responsible_profile_id, created_by_profile_id
) VALUES (
  '11111111-1111-4111-8111-111111111111', 'Integrity test matter', 'Should we test proposals?', 'suggestion',
  'person', current_setting('test.author_pid')::uuid,
  'person', current_setting('test.supporter_pid')::uuid,
  'person', current_setting('test.supporter_pid')::uuid,
  current_setting('test.author_pid')::uuid
);

-- ---- author drafts and opens for support ------------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.author_uid'))::text, true);
SELECT set_config('test.proposal_id', public.create_voting_proposal_from_matter(
  '11111111-1111-4111-8111-111111111111', 'Integrity test proposal', 'Summary', 'Body', NULL)::text, true);

DO $$
BEGIN
  PERFORM public.publish_voting_proposal(current_setting('test.proposal_id')::uuid);
  RAISE EXCEPTION 'author published without support';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'not_authorized_to_publish' THEN RAISE EXCEPTION 'expected not_authorized_to_publish, got %', SQLERRM; END IF;
  RAISE NOTICE 'ok: author cannot publish before threshold';
END $$;

SELECT public.update_voting_proposal_settings(current_setting('test.proposal_id')::uuid, 'country', 'am', now() + interval '2 days', now() + interval '30 days');
DO $$
DECLARE s jsonb := public.open_voting_proposal_for_support(current_setting('test.proposal_id')::uuid, 1);
BEGIN
  IF NOT (s->>'open_for_support')::boolean THEN RAISE EXCEPTION 'not opened: %', s; END IF;
  IF (s->>'threshold')::int <> 1 THEN RAISE EXCEPTION 'threshold not stored: %', s; END IF;
  RAISE NOTICE 'ok: opened for support with threshold 1';
END $$;

-- ---- a different member supports it -----------------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.supporter_uid'))::text, true);
DO $$
DECLARE s jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.civic_voting_proposals WHERE id = current_setting('test.proposal_id')::uuid) THEN
    RAISE EXCEPTION 'draft open for support is not visible to other members';
  END IF;
  s := public.toggle_voting_proposal_support(current_setting('test.proposal_id')::uuid);
  IF NOT (s->>'supported')::boolean OR (s->>'count')::int <> 1 OR NOT (s->>'ready')::boolean THEN
    RAISE EXCEPTION 'support toggle wrong: %', s;
  END IF;
  s := public.toggle_voting_proposal_support(current_setting('test.proposal_id')::uuid);
  IF (s->>'supported')::boolean OR (s->>'count')::int <> 0 THEN RAISE EXCEPTION 'un-support wrong: %', s; END IF;
  s := public.toggle_voting_proposal_support(current_setting('test.proposal_id')::uuid);
  RAISE NOTICE 'ok: support toggles and reaches threshold';
END $$;

-- ---- author publishes once ready; scheduled opening + notification ------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.author_uid'))::text, true);
SELECT set_config('test.election_id', public.publish_voting_proposal(current_setting('test.proposal_id')::uuid)::text, true);
RESET ROLE;
DO $$
DECLARE e record;
BEGIN
  SELECT * INTO e FROM public.civic_elections WHERE id = current_setting('test.election_id')::uuid;
  IF e.status <> 'scheduled' THEN RAISE EXCEPTION 'future opening should schedule, got %', e.status; END IF;
  IF e.tier::text <> 'national' OR e.scope_country_code <> 'AM' THEN RAISE EXCEPTION 'scope not honoured: % %', e.tier, e.scope_country_code; END IF;
  IF NOT coalesce((e.metadata->>'published_by_author')::boolean, false) THEN RAISE EXCEPTION 'published_by_author flag missing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.civic_voting_events WHERE election_id = e.id AND event_type = 'election_published') THEN
    RAISE EXCEPTION 'election_published event missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.user_notifications
    WHERE recipient_profile_id = current_setting('test.supporter_pid')::uuid
      AND notification_type = 'civic_consultation_published' AND entity_id = e.id
  ) THEN RAISE EXCEPTION 'supporter was not notified'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.user_notifications
    WHERE recipient_profile_id = current_setting('test.author_pid')::uuid AND entity_id = e.id
  ) THEN RAISE EXCEPTION 'publisher notified themselves'; END IF;
  RAISE NOTICE 'ok: author publication, scheduled, notified';
END $$;

-- ---- tick opens it once the opening time has passed, closes it after the window ----------------
UPDATE public.civic_elections SET voting_opens_at = now() - interval '1 minute' WHERE id = current_setting('test.election_id')::uuid;
DO $$
BEGIN
  PERFORM public.civic_close_due_elections();
  IF (SELECT status FROM public.civic_elections WHERE id = current_setting('test.election_id')::uuid) <> 'open' THEN
    RAISE EXCEPTION 'tick did not open the scheduled election';
  END IF;
  RAISE NOTICE 'ok: tick opens scheduled election';
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.supporter_uid'))::text, true);
UPDATE public.profiles SET country_code = 'AM' WHERE id = current_setting('test.supporter_pid')::uuid;
SELECT public.cast_consultation_ballot(current_setting('test.election_id')::uuid, 'support');
RESET ROLE;
UPDATE public.civic_elections SET voting_opens_at = now() - interval '2 minutes', voting_closes_at = now() - interval '1 minute' WHERE id = current_setting('test.election_id')::uuid;
DO $$
BEGIN
  PERFORM public.civic_close_due_elections();
  IF NOT EXISTS (
    SELECT 1 FROM public.user_notifications
    WHERE recipient_profile_id = current_setting('test.supporter_pid')::uuid
      AND notification_type = 'civic_consultation_closed' AND entity_id = current_setting('test.election_id')::uuid
  ) THEN RAISE EXCEPTION 'voter was not notified of the result'; END IF;
  IF (SELECT status FROM public.civic_voting_proposals WHERE id = current_setting('test.proposal_id')::uuid) <> 'closed' THEN
    RAISE EXCEPTION 'proposal not closed with its election';
  END IF;
  RAISE NOTICE 'ok: close notifies voters';
END $$;

-- ---- outside-scope member cannot vote in a country consultation --------------------------------
UPDATE public.civic_elections SET status = 'open', voting_closes_at = now() + interval '1 day' WHERE id = current_setting('test.election_id')::uuid;
UPDATE public.profiles SET country_code = 'FR' WHERE id = current_setting('test.supporter_pid')::uuid;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.supporter_uid'))::text, true);
DO $$
BEGIN
  PERFORM public.cast_consultation_ballot(current_setting('test.election_id')::uuid, 'oppose');
  RAISE EXCEPTION 'outside-scope member could vote';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'outside_scope' THEN RAISE EXCEPTION 'expected outside_scope, got %', SQLERRM; END IF;
  RAISE NOTICE 'ok: outside_scope';
END $$;

-- ---- legacy vote weight is clamped -------------------------------------------------------------
RESET ROLE;
DO $$
DECLARE v_weight integer;
BEGIN
  v_weight := (SELECT least(greatest(coalesce(99, 1), 0), 1));
  IF v_weight <> 1 THEN RAISE EXCEPTION 'clamp expression wrong'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'governance_proposal_votes_clamp_weight') THEN
    RAISE EXCEPTION 'clamp trigger missing';
  END IF;
  RAISE NOTICE 'ok: legacy weight clamp installed';
END $$;

ROLLBACK;
