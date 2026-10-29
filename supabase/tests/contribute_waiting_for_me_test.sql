-- Plan step D4: contribute_waiting_for_me() counts what waits for the signed-in member (open Matter actions,
-- proposals to support, open ballots not yet cast) and the open challenges and shared knowledge spaces.
-- Runs against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('t.member_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.member_pid', (SELECT id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.citizen_pid', (SELECT id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.matter_id', (SELECT id::text FROM public.matters WHERE lifecycle_status IN ('submitted', 'active') ORDER BY created_at LIMIT 1), true);
SELECT set_config('t.election_id', (SELECT id::text FROM public.civic_elections WHERE metadata ->> 'consultation_key' = 'single-world-citizenship' LIMIT 1), true);
-- start from nothing waiting for the member
UPDATE public.matter_action_requirements SET status = 'completed'
 WHERE assigned_profile_id = current_setting('t.member_pid')::uuid AND status IN ('pending', 'overdue');
DELETE FROM public.civic_ballots WHERE profile_id = current_setting('t.member_pid')::uuid;
DELETE FROM public.civic_vote_sessions WHERE profile_id = current_setting('t.member_pid')::uuid;

CREATE TEMP TABLE t_counts (label text PRIMARY KEY, counts jsonb) ON COMMIT DROP;
GRANT ALL ON t_counts TO authenticated;

CREATE OR REPLACE FUNCTION pg_temp.as_member() RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.member_uid'), 'role', 'authenticated')::text, true);
$$;

-- anonymous callers are refused
DO $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role": "anon"}', true);
  BEGIN
    PERFORM public.contribute_waiting_for_me();
    RAISE EXCEPTION 'anonymous call should fail';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

SELECT pg_temp.as_member();
SET LOCAL ROLE authenticated;
INSERT INTO t_counts VALUES ('before', public.contribute_waiting_for_me());
RESET ROLE;

-- an open action for the member, one for someone else, and one already done
INSERT INTO public.matter_action_requirements (matter_id, action_type, assigned_kind, assigned_profile_id, due_at, reminder_at, timing_policy_id, status)
VALUES (current_setting('t.matter_id')::uuid, 'respond', 'person', current_setting('t.member_pid')::uuid, now() + interval '3 days', now() + interval '2 days', 'suggestion_response', 'pending'),
       (current_setting('t.matter_id')::uuid, 'respond', 'person', current_setting('t.citizen_pid')::uuid, now() + interval '3 days', now() + interval '2 days', 'suggestion_response', 'pending'),
       (current_setting('t.matter_id')::uuid, 'respond', 'person', current_setting('t.member_pid')::uuid, now() + interval '3 days', now() + interval '2 days', 'suggestion_response', 'completed');
-- a proposal open for support by someone else (one open draft per Matter, so the other cases reuse it below)
DELETE FROM public.civic_voting_proposals WHERE matter_id = current_setting('t.matter_id')::uuid AND status = 'draft';
WITH ins AS (
  INSERT INTO public.civic_voting_proposals (matter_id, title, created_by_profile_id, status, metadata)
  VALUES (current_setting('t.matter_id')::uuid, 'Open for support', current_setting('t.citizen_pid')::uuid, 'draft', '{"open_for_support": true}')
  RETURNING id)
SELECT set_config('t.proposal_id', id::text, true) FROM ins;

SELECT pg_temp.as_member();
SET LOCAL ROLE authenticated;
INSERT INTO t_counts VALUES ('after', public.contribute_waiting_for_me());
RESET ROLE;
-- once supported, written by the member, or not open, the proposal no longer waits
INSERT INTO public.civic_voting_proposal_support (proposal_id, profile_id) VALUES (current_setting('t.proposal_id')::uuid, current_setting('t.member_pid')::uuid);
SELECT pg_temp.as_member();
SET LOCAL ROLE authenticated;
INSERT INTO t_counts VALUES ('supported', public.contribute_waiting_for_me());
RESET ROLE;
DELETE FROM public.civic_voting_proposal_support WHERE proposal_id = current_setting('t.proposal_id')::uuid;
UPDATE public.civic_voting_proposals SET created_by_profile_id = current_setting('t.member_pid')::uuid WHERE id = current_setting('t.proposal_id')::uuid;
SELECT pg_temp.as_member();
SET LOCAL ROLE authenticated;
INSERT INTO t_counts VALUES ('own', public.contribute_waiting_for_me());
RESET ROLE;
UPDATE public.civic_voting_proposals SET created_by_profile_id = current_setting('t.citizen_pid')::uuid, metadata = '{}' WHERE id = current_setting('t.proposal_id')::uuid;
SELECT pg_temp.as_member();
SET LOCAL ROLE authenticated;
INSERT INTO t_counts VALUES ('closed', public.contribute_waiting_for_me());
-- casting a ballot removes the consultation from what is waiting
SELECT public.cast_consultation_ballot(current_setting('t.election_id')::uuid, 'support');
INSERT INTO t_counts VALUES ('voted', public.contribute_waiting_for_me());
RESET ROLE;

DO $$
DECLARE
  b jsonb := (SELECT counts FROM t_counts WHERE label = 'before');
  a jsonb := (SELECT counts FROM t_counts WHERE label = 'after');
  v jsonb := (SELECT counts FROM t_counts WHERE label = 'voted');
  v_case text;
BEGIN
  IF (b ->> 'actions_due')::int <> 0 THEN RAISE EXCEPTION 'expected no actions before, got %', b; END IF;
  IF (a ->> 'actions_due')::int <> 1 THEN RAISE EXCEPTION 'expected one open action, got %', a; END IF;
  IF (a ->> 'proposals_to_support')::int <> (b ->> 'proposals_to_support')::int + 1 THEN
    RAISE EXCEPTION 'expected one more proposal to support: before %, after %', b, a;
  END IF;
  FOREACH v_case IN ARRAY ARRAY['supported', 'own', 'closed'] LOOP
    IF ((SELECT counts FROM t_counts WHERE t_counts.label = v_case) ->> 'proposals_to_support')::int <> (b ->> 'proposals_to_support')::int THEN
      RAISE EXCEPTION 'proposal should not wait when %: %', v_case, (SELECT counts FROM t_counts WHERE t_counts.label = v_case);
    END IF;
  END LOOP;
  IF (b ->> 'ballots_open')::int < 1 THEN RAISE EXCEPTION 'expected the open consultation to wait for the member, got %', b; END IF;
  IF (v ->> 'ballots_open')::int <> (b ->> 'ballots_open')::int - 1 THEN
    RAISE EXCEPTION 'expected the cast consultation to stop waiting: before %, after vote %', b, v;
  END IF;
  IF NOT (a ? 'challenges' AND a ? 'knowledge') THEN RAISE EXCEPTION 'lane counts missing: %', a; END IF;
END $$;
DO $$ BEGIN RAISE NOTICE 'ok: contribute waiting for me'; END $$;

ROLLBACK;
