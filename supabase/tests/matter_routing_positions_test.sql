-- Launch gaps 1 and 2: Matters for the Civizen community reach Member Support's queue and its holder acts for
-- Civizen; a Matter whose addressee does not answer goes to Civic Operations, by the timeout job or by the initiator.
-- Runs against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('t.citizen_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.member_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.member_pid', (SELECT id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.holder_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'verified_member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.holder_pid', (SELECT id::text FROM public.profiles WHERE username = 'verified_member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.civizen_pid', public.resolve_civizen_org_profile()::text, true);
UPDATE public.org_position_terms SET ended_at = now(), end_reason = 'test reset' WHERE ended_at IS NULL;
INSERT INTO public.org_position_terms (position_key, profile_id) VALUES ('member_support', current_setting('t.holder_pid')::uuid);

CREATE OR REPLACE FUNCTION pg_temp.act_as(p_uid text) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

CREATE TEMP TABLE t_ids (label text PRIMARY KEY, id uuid) ON COMMIT DROP;
GRANT ALL ON t_ids TO authenticated;

-- a citizen raises a participants-only Matter for the Civizen community, and another for a member
SELECT pg_temp.act_as(current_setting('t.citizen_uid'));
SET LOCAL ROLE authenticated;
INSERT INTO t_ids SELECT 'community', public.create_matter(jsonb_build_object(
  'title', 'Routing test: street lights', 'description', 'Fictional Matter for the routing test.', 'matter_type', 'issue',
  'visibility', 'participants', 'addressee_kind', 'organization', 'addressee_profile_id', current_setting('t.civizen_pid')::uuid,
  'scope_kind', 'global', 'submit', true));
INSERT INTO t_ids SELECT 'person', public.create_matter(jsonb_build_object(
  'title', 'Routing test: a question for a member', 'description', 'Fictional Matter for the routing test.', 'matter_type', 'question',
  'visibility', 'participants', 'addressee_kind', 'person', 'addressee_profile_id', current_setting('t.member_pid')::uuid,
  'scope_kind', 'global', 'submit', true));
RESET ROLE;

DO $$
DECLARE
  v_community uuid := (SELECT id FROM t_ids WHERE label = 'community');
  v_person uuid := (SELECT id FROM t_ids WHERE label = 'person');
  v_ok boolean;
  v_failed boolean;
BEGIN
  IF v_community IS NULL OR v_person IS NULL THEN
    RAISE EXCEPTION 'create_matter did not return ids';
  END IF;

  -- 1. the community Matter is in Member Support's queue, linked to the Matter; the person's Matter is not
  IF NOT EXISTS (SELECT 1 FROM public.org_position_items WHERE position_key = 'member_support' AND source_type = 'matter'
                   AND source_ref = v_community::text AND status = 'open') THEN
    RAISE EXCEPTION 'a community Matter should open a triage item';
  END IF;
  IF EXISTS (SELECT 1 FROM public.org_position_items WHERE source_ref = v_person::text) THEN
    RAISE EXCEPTION 'a Matter for a member should not reach a position on creation';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_notifications WHERE recipient_profile_id = current_setting('t.holder_pid')::uuid
                   AND notification_type = 'position_item') THEN
    RAISE EXCEPTION 'the Member Support holder should be notified';
  END IF;

  -- 2. the holder acts for Civizen on the Matter; a plain member does not
  PERFORM pg_temp.act_as(current_setting('t.holder_uid'));
  SET LOCAL ROLE authenticated;
  v_ok := public.can_access_matter(v_community)
          AND public.current_profile_represents_actor('organization', current_setting('t.civizen_pid')::uuid);
  RESET ROLE;
  IF NOT v_ok THEN RAISE EXCEPTION 'the Member Support holder should act for Civizen'; END IF;
  PERFORM pg_temp.act_as(current_setting('t.member_uid'));
  SET LOCAL ROLE authenticated;
  v_ok := public.can_access_matter(v_community)
          OR public.current_profile_represents_actor('organization', current_setting('t.civizen_pid')::uuid);
  RESET ROLE;
  IF v_ok THEN RAISE EXCEPTION 'a plain member should not act for Civizen'; END IF;

  -- 3. nothing overdue yet: the initiator cannot escalate; others never can
  PERFORM pg_temp.act_as(current_setting('t.citizen_uid'));
  SET LOCAL ROLE authenticated;
  v_failed := false;
  BEGIN
    PERFORM public.escalate_matter_to_civic_operations(v_person, 'too early');
  EXCEPTION WHEN invalid_parameter_value THEN v_failed := true;
  END;
  RESET ROLE;
  IF NOT v_failed THEN RAISE EXCEPTION 'escalating before anything is overdue should fail'; END IF;

  -- 4. the member does not answer: the timeout job passes the Matter to Civic Operations, once
  UPDATE public.matter_action_requirements SET due_at = now() - interval '121 hours', reminder_at = now() - interval '122 hours'
   WHERE matter_id = v_person AND status = 'pending';
  PERFORM public.process_matter_action_timeouts();
  PERFORM public.process_matter_action_timeouts();
  IF (SELECT count(*) FROM public.org_position_items WHERE position_key = 'civic_operations_lead' AND source_ref = v_person::text) <> 1 THEN
    RAISE EXCEPTION 'a stalled Matter should reach Civic Operations exactly once, got %',
      (SELECT count(*) FROM public.org_position_items WHERE position_key = 'civic_operations_lead' AND source_ref = v_person::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.matter_events WHERE matter_id = v_person AND event_type = 'escalated_to_position') THEN
    RAISE EXCEPTION 'the Matter should record the escalation';
  END IF;
  IF EXISTS (SELECT 1 FROM public.matter_action_requirements WHERE matter_id = v_person AND action_type = 'manual_review'
               AND assigned_profile_id = current_setting('t.member_pid')::uuid) THEN
    RAISE EXCEPTION 'manual review should not go back to the member who did not answer';
  END IF;

  -- 5. Civizen does not answer its own Matter either: it goes to Civic Operations, not back to Member Support
  UPDATE public.matter_action_requirements SET due_at = now() - interval '73 hours', reminder_at = now() - interval '74 hours'
   WHERE matter_id = v_community AND status = 'pending';
  PERFORM public.process_matter_action_timeouts();
  IF NOT EXISTS (SELECT 1 FROM public.org_position_items WHERE position_key = 'civic_operations_lead' AND source_ref = v_community::text) THEN
    RAISE EXCEPTION 'a stalled community Matter should reach Civic Operations';
  END IF;

  -- 6. the initiator escalates an overdue Matter themselves; the item is not duplicated, and others cannot
  UPDATE public.org_position_items SET status = 'done', resolution = 'test' WHERE source_ref = v_person::text;
  PERFORM pg_temp.act_as(current_setting('t.citizen_uid'));
  SET LOCAL ROLE authenticated;
  PERFORM public.escalate_matter_to_civic_operations(v_person, 'Still waiting after a week.');
  RESET ROLE;
  IF NOT EXISTS (SELECT 1 FROM public.org_position_items WHERE position_key = 'civic_operations_lead' AND source_ref = v_person::text
                   AND status = 'open' AND body LIKE '%Still waiting after a week.%') THEN
    RAISE EXCEPTION 'the initiator''s escalation should open an item with their note';
  END IF;
  PERFORM pg_temp.act_as(current_setting('t.member_uid'));
  SET LOCAL ROLE authenticated;
  v_failed := false;
  BEGIN
    PERFORM public.escalate_matter_to_civic_operations(v_person, 'not mine');
  EXCEPTION WHEN insufficient_privilege THEN v_failed := true;
  END;
  RESET ROLE;
  IF NOT v_failed THEN RAISE EXCEPTION 'only the initiator should escalate'; END IF;
END $$;
DO $$ BEGIN RAISE NOTICE 'ok: matter routing to positions'; END $$;

ROLLBACK;
