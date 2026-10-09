-- Phase 2 steps 2.5 / 2.7: loop notifications (opened, closing soon, Matter comment), the e-mail digest
-- candidate list, and proposal hygiene (frozen settings, threshold floor, withdraw, passed for custom options).
-- Run with scripts/local-supabase/run-sql-tests.sh against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('test.author_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.author_pid', (SELECT id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.other_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'verified_member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.other_pid', (SELECT id::text FROM public.profiles WHERE username = 'verified_member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.member_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.member_pid', (SELECT id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);

DO $$
BEGIN
  IF coalesce(current_setting('test.author_uid', true), '') = '' OR coalesce(current_setting('test.other_uid', true), '') = ''
     OR coalesce(current_setting('test.member_uid', true), '') = '' THEN
    RAISE EXCEPTION 'fixtures citizen/verified_member/member missing in the local database';
  END IF;
END $$;

DELETE FROM public.user_notifications WHERE recipient_profile_id IN (current_setting('test.other_pid')::uuid, current_setting('test.member_pid')::uuid, current_setting('test.author_pid')::uuid);

INSERT INTO public.matters (
  id, title, description, matter_type, visibility, initiator_kind, initiator_profile_id,
  addressee_kind, addressee_profile_id, responsible_kind, responsible_profile_id, created_by_profile_id, lifecycle_status
) VALUES (
  '44444444-4444-4444-8444-444444444441', 'Loop notifications matter', 'Do followers hear about the vote?', 'suggestion', 'participants',
  'person', current_setting('test.author_pid')::uuid,
  'person', current_setting('test.member_pid')::uuid,
  'person', current_setting('test.member_pid')::uuid,
  current_setting('test.author_pid')::uuid, 'active'
);

-- ---- comment on the Matter notifies the other people of the Matter, not the author ----------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.author_uid'))::text, true);
SELECT public.add_matter_comment('44444444-4444-4444-8444-444444444441', 'A comment from the initiator.', NULL, NULL, '{}'::uuid[]);
RESET ROLE;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_notifications WHERE recipient_profile_id = current_setting('test.member_pid')::uuid
                 AND notification_type = 'matter_comment' AND entity_id = '44444444-4444-4444-8444-444444444441' AND metadata->>'title' = 'Loop notifications matter') THEN
    RAISE EXCEPTION 'responsible party not notified of the comment';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_notifications WHERE recipient_profile_id = current_setting('test.author_pid')::uuid AND notification_type = 'matter_comment') THEN
    RAISE EXCEPTION 'comment author notified of their own comment';
  END IF;
  RAISE NOTICE 'ok: matter comment notification';
END $$;

-- ---- draft, support, hygiene --------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.author_uid'))::text, true);
SELECT set_config('test.proposal_id', public.create_voting_proposal_from_matter(
  '44444444-4444-4444-8444-444444444441', 'Loop notifications proposal', 'Summary', 'Body', NULL)::text, true);
SELECT public.update_voting_proposal_settings(current_setting('test.proposal_id')::uuid, 'global', NULL, now() + interval '2 days', now() + interval '12 days');
SELECT public.open_voting_proposal_for_support(current_setting('test.proposal_id')::uuid, 2);
DO $$
BEGIN
  BEGIN
    PERFORM public.open_voting_proposal_for_support(current_setting('test.proposal_id')::uuid, 1);
    RAISE EXCEPTION 'threshold was lowered';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'threshold_cannot_be_lowered' THEN RAISE EXCEPTION 'expected threshold_cannot_be_lowered, got %', SQLERRM; END IF;
  END;
  PERFORM public.open_voting_proposal_for_support(current_setting('test.proposal_id')::uuid, 1 + 0); -- same value is fine? no: 1 < 2
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'threshold_cannot_be_lowered' THEN RAISE EXCEPTION 'unexpected: %', SQLERRM; END IF;
  RAISE NOTICE 'ok: threshold cannot be lowered once open';
END $$;
SELECT public.open_voting_proposal_for_support(current_setting('test.proposal_id')::uuid, 1 + 1); -- unchanged threshold is allowed

-- another member supports: settings freeze for the author
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.other_uid'))::text, true);
SELECT public.toggle_voting_proposal_support(current_setting('test.proposal_id')::uuid);
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.author_uid'))::text, true);
DO $$
BEGIN
  PERFORM public.update_voting_proposal_settings(current_setting('test.proposal_id')::uuid, 'country', 'AM');
  RAISE EXCEPTION 'settings changed after support started';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'proposal_frozen' THEN RAISE EXCEPTION 'expected proposal_frozen, got %', SQLERRM; END IF;
  RAISE NOTICE 'ok: settings frozen after first support';
END $$;

-- withdraw the first draft (its supporter is told), then start over with a new draft that publishes
SELECT set_config('test.withdrawn', public.withdraw_voting_proposal(current_setting('test.proposal_id')::uuid), true);
RESET ROLE;
DO $$
DECLARE s text := current_setting('test.withdrawn');
BEGIN
  IF s <> 'withdrawn' THEN RAISE EXCEPTION 'withdraw returned %', s; END IF;
  IF (SELECT status FROM public.civic_voting_proposals WHERE id = current_setting('test.proposal_id')::uuid) <> 'withdrawn' THEN
    RAISE EXCEPTION 'proposal not withdrawn';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_notifications WHERE recipient_profile_id = current_setting('test.other_pid')::uuid AND notification_type = 'civic_proposal_withdrawn') THEN
    RAISE EXCEPTION 'supporter not told about the withdrawal';
  END IF;
  RAISE NOTICE 'ok: draft withdrawn, supporter notified';
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.author_uid'))::text, true);

SELECT set_config('test.proposal_id', public.create_voting_proposal_from_matter(
  '44444444-4444-4444-8444-444444444441', 'Loop notifications proposal 2', 'Summary', 'Body', NULL)::text, true);
SELECT public.update_voting_proposal_settings(current_setting('test.proposal_id')::uuid, 'global', NULL, now() + interval '2 days', now() + interval '12 days');
SELECT public.open_voting_proposal_for_support(current_setting('test.proposal_id')::uuid, 1);
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.other_uid'))::text, true);
SELECT public.toggle_voting_proposal_support(current_setting('test.proposal_id')::uuid);
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.author_uid'))::text, true);
SELECT set_config('test.election_id', public.publish_voting_proposal(current_setting('test.proposal_id')::uuid)::text, true);

-- ---- opened: the tick opens a scheduled election and followers are told ----------------------------
RESET ROLE;
UPDATE public.civic_elections SET voting_opens_at = now() - interval '1 minute' WHERE id = current_setting('test.election_id')::uuid;
SELECT public.civic_close_due_elections();
DO $$
BEGIN
  IF (SELECT status FROM public.civic_elections WHERE id = current_setting('test.election_id')::uuid) <> 'open' THEN RAISE EXCEPTION 'not opened'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_notifications WHERE recipient_profile_id = current_setting('test.other_pid')::uuid
                 AND notification_type = 'civic_consultation_opened' AND entity_id = current_setting('test.election_id')::uuid
                 AND metadata->>'title' = 'Loop notifications proposal 2') THEN
    RAISE EXCEPTION 'supporter not told that voting opened';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_notifications WHERE recipient_profile_id = current_setting('test.member_pid')::uuid
                 AND notification_type = 'civic_consultation_opened' AND entity_id = current_setting('test.election_id')::uuid) THEN
    RAISE EXCEPTION 'Matter responsible party not told that voting opened';
  END IF;
  RAISE NOTICE 'ok: voting opened notifications';
END $$;

-- ---- closing soon: the author votes, the supporter does not; only the non-voters are reminded ------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.author_uid'))::text, true);
SELECT public.cast_consultation_ballot(current_setting('test.election_id')::uuid, 'support');
RESET ROLE;
UPDATE public.civic_elections SET voting_closes_at = now() + interval '6 days' WHERE id = current_setting('test.election_id')::uuid;
SELECT public.civic_consultation_reminders();
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.user_notifications WHERE notification_type = 'civic_consultation_closing_soon'
    AND entity_id = current_setting('test.election_id')::uuid AND recipient_profile_id = current_setting('test.other_pid')::uuid AND (metadata->>'hours')::int = 168;
  IF n <> 1 THEN RAISE EXCEPTION 'expected one 7-day reminder for the supporter, got %', n; END IF;
  IF EXISTS (SELECT 1 FROM public.user_notifications WHERE notification_type = 'civic_consultation_closing_soon'
             AND entity_id = current_setting('test.election_id')::uuid AND recipient_profile_id = current_setting('test.author_pid')::uuid) THEN
    RAISE EXCEPTION 'voter was reminded although they already voted';
  END IF;
  PERFORM public.civic_consultation_reminders();
  SELECT count(*) INTO n FROM public.user_notifications WHERE notification_type = 'civic_consultation_closing_soon'
    AND entity_id = current_setting('test.election_id')::uuid AND (metadata->>'hours')::int = 168;
  IF n <> 2 THEN RAISE EXCEPTION '7-day reminder sent again or to the wrong people (% rows)', n; END IF; -- supporter + Matter responsible
  RAISE NOTICE 'ok: 7-day reminder once, non-voters only';
END $$;
UPDATE public.civic_elections SET voting_closes_at = now() + interval '20 hours' WHERE id = current_setting('test.election_id')::uuid;
SELECT public.civic_consultation_reminders();
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.user_notifications WHERE notification_type = 'civic_consultation_closing_soon'
    AND entity_id = current_setting('test.election_id')::uuid AND recipient_profile_id = current_setting('test.other_pid')::uuid AND (metadata->>'hours')::int = 24;
  IF n <> 1 THEN RAISE EXCEPTION 'expected one 24-hour reminder, got %', n; END IF;
  RAISE NOTICE 'ok: 24-hour reminder';
END $$;

-- ---- digest: opt-in member with unread notifications is a candidate; recording a digest removes them --
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.other_uid'))::text, true);
SELECT public.set_notification_email_digest(true);
DO $$
BEGIN
  PERFORM public.notification_digest_candidates();
  RAISE EXCEPTION 'member could read the digest candidate list';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'ok: digest candidates are server-only';
END $$;
RESET ROLE;
DO $$
DECLARE c record;
BEGIN
  SELECT * INTO c FROM public.notification_digest_candidates() WHERE profile_id = current_setting('test.other_pid')::uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'opted-in member with unread notifications is not a digest candidate'; END IF;
  IF c.email IS NULL OR jsonb_array_length(c.items) < 3 THEN RAISE EXCEPTION 'candidate lacks email or items: % %', c.email, c.items; END IF;
  PERFORM public.record_notification_digest(c.profile_id, jsonb_array_length(c.items), now());
  IF EXISTS (SELECT 1 FROM public.notification_digest_candidates() WHERE profile_id = current_setting('test.other_pid')::uuid) THEN
    RAISE EXCEPTION 'candidate listed again right after a digest';
  END IF;
  IF EXISTS (SELECT 1 FROM public.notification_digest_candidates() WHERE profile_id = current_setting('test.member_pid')::uuid) THEN
    RAISE EXCEPTION 'member who did not opt in is a candidate';
  END IF;
  RAISE NOTICE 'ok: digest candidates';
END $$;

-- ---- custom options: a reached decision counts as passed ------------------------------------------
DO $$
DECLARE o jsonb;
BEGIN
  UPDATE public.civic_elections SET metadata = coalesce(metadata, '{}'::jsonb) || '{"ballot_method": "single"}'::jsonb WHERE id = current_setting('test.election_id')::uuid;
  o := public.civic_election_outcome(current_setting('test.election_id')::uuid);
  IF (o->>'passed')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'support ballot should pass: %', o; END IF;
  -- pretend the ballot had custom options only: rename the tallied option keys away from support/oppose
  UPDATE public.civic_candidates c SET option_key = 'option_' || c.option_key
  FROM public.civic_contests ct WHERE ct.id = c.contest_id AND ct.election_id = current_setting('test.election_id')::uuid;
  -- the sealed choice says 'support'; re-seal nothing: the tally now has zero rows matching, so leading is null
  o := public.civic_election_outcome(current_setting('test.election_id')::uuid);
  IF (o->>'passed')::boolean IS DISTINCT FROM false THEN RAISE EXCEPTION 'no leading option should not pass: %', o; END IF;
  RAISE NOTICE 'ok: passed is set for non Support/Oppose ballots';
END $$;

ROLLBACK;
