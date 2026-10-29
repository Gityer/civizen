-- Organisation positions: responsibility sits with positions; a vacant position's work goes up to its parent and, at
-- the top, to the founder office; a new holder inherits the queue, the journal and the handover note.
-- Runs against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('t.member_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.member_pid', (SELECT id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.citizen_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.citizen_pid', (SELECT id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.verified_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'verified_member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.verified_pid', (SELECT id::text FROM public.profiles WHERE username = 'verified_member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.founder_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'maturehumanity' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('t.founder_pid', (SELECT id::text FROM public.profiles WHERE username = 'maturehumanity' AND deleted_at IS NULL LIMIT 1), true);
-- start from vacant positions
UPDATE public.org_position_terms SET ended_at = now(), end_reason = 'test reset' WHERE ended_at IS NULL;

CREATE OR REPLACE FUNCTION pg_temp.act_as(p_uid text) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

DO $$
DECLARE
  v_item uuid;
  v_term uuid;
  v_detail jsonb;
  v_failed boolean;
BEGIN
  -- 1. every position has a mandate and duties; the chart is public
  IF EXISTS (SELECT 1 FROM public.org_positions WHERE is_active AND (length(mandate) < 20 OR cardinality(duties) = 0)) THEN
    RAISE EXCEPTION 'a position has no mandate or duties';
  END IF;
  IF jsonb_array_length(public.org_chart()) < 10 THEN
    RAISE EXCEPTION 'the chart should list the units with positions';
  END IF;

  -- 2. a vacant position is answered by its parent's answerers and, at the top, by the founder office
  IF NOT (current_setting('t.founder_pid')::uuid IN (SELECT public.org_position_answerers('data_protection_officer'))) THEN
    RAISE EXCEPTION 'a vacant position should fall back to the founder office';
  END IF;

  -- 3. a plain member cannot appoint, cannot read the queue, and cannot work it
  PERFORM pg_temp.act_as(current_setting('t.member_uid'));
  SET LOCAL ROLE authenticated;
  v_failed := false;
  BEGIN
    PERFORM public.org_appoint_position_holder('data_protection_officer', current_setting('t.member_pid')::uuid);
  EXCEPTION WHEN insufficient_privilege THEN v_failed := true;
  END;
  IF NOT v_failed THEN RAISE EXCEPTION 'a member should not appoint'; END IF;
  v_detail := public.org_position_detail('data_protection_officer');
  IF v_detail ? 'items' OR (v_detail ->> 'can_work')::boolean THEN
    RAISE EXCEPTION 'a member should not see the queue: %', v_detail;
  END IF;
  RESET ROLE;

  -- 4. the founder appoints the policy lead; the lead appoints the data protection officer below them
  PERFORM pg_temp.act_as(current_setting('t.founder_uid'));
  SET LOCAL ROLE authenticated;
  PERFORM public.org_appoint_position_holder('policy_legal_lead', current_setting('t.citizen_pid')::uuid, 'holder', 'test');
  RESET ROLE;
  IF NOT EXISTS (SELECT 1 FROM public.profile_governance_roles WHERE profile_id = current_setting('t.citizen_pid')::uuid
                   AND domain_key = 'policy_legal' AND role_key = 'domain_lead' AND is_active AND assignment_source = 'position') THEN
    RAISE EXCEPTION 'holding a position should give its domain role';
  END IF;
  -- with the lead in place, the vacant officer position is answered by the lead, not the founder
  IF NOT (current_setting('t.citizen_pid')::uuid IN (SELECT public.org_position_answerers('data_protection_officer'))) THEN
    RAISE EXCEPTION 'a vacant position should fall back to its parent''s holder';
  END IF;

  PERFORM pg_temp.act_as(current_setting('t.citizen_uid'));
  SET LOCAL ROLE authenticated;
  PERFORM public.org_appoint_position_holder('data_protection_officer', current_setting('t.verified_pid')::uuid);
  RESET ROLE;

  -- 5. the officer sees the inherited queue, takes on an item and writes a note
  PERFORM pg_temp.act_as(current_setting('t.verified_uid'));
  SET LOCAL ROLE authenticated;
  v_detail := public.org_position_detail('data_protection_officer');
  IF NOT (v_detail ->> 'can_work')::boolean OR jsonb_array_length(v_detail -> 'items') < 1 THEN
    RAISE EXCEPTION 'the new holder should inherit the queue: %', v_detail;
  END IF;
  v_item := (v_detail -> 'items' -> 0 ->> 'id')::uuid;
  PERFORM public.org_update_position_item(v_item, 'claim');
  PERFORM public.org_update_position_item(v_item, 'note', 'Asked the hosting provider about role mailboxes.');
  v_failed := false;
  BEGIN
    PERFORM public.org_update_position_item(v_item, 'done', '');
  EXCEPTION WHEN invalid_parameter_value THEN v_failed := true;
  END;
  IF NOT v_failed THEN RAISE EXCEPTION 'resolving without a resolution should fail'; END IF;

  -- 6. stepping down with open items needs a handover note; the claimed item goes back to the position
  v_term := (SELECT id FROM public.org_position_terms WHERE position_key = 'data_protection_officer'
              AND profile_id = current_setting('t.verified_pid')::uuid AND ended_at IS NULL);
  v_failed := false;
  BEGIN
    PERFORM public.org_end_position_term(v_term, 'Moving to another unit');
  EXCEPTION WHEN invalid_parameter_value THEN v_failed := true;
  END;
  IF NOT v_failed THEN RAISE EXCEPTION 'ending a term with open items should need a handover note'; END IF;
  PERFORM public.org_end_position_term(v_term, 'Moving to another unit', 'Mailbox request is with the hosting provider; reply expected next week.');
  RESET ROLE;
  IF (SELECT claimed_by FROM public.org_position_items WHERE id = v_item) IS NOT NULL
     OR (SELECT status FROM public.org_position_items WHERE id = v_item) <> 'open' THEN
    RAISE EXCEPTION 'the leaving holder''s item should return to the position';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profile_governance_roles WHERE profile_id = current_setting('t.verified_pid')::uuid
               AND domain_key = 'policy_legal' AND role_key = 'steward' AND is_active AND assignment_source = 'position') THEN
    RAISE EXCEPTION 'the domain role should end with the term';
  END IF;

  -- 7. the next holder reads the handover note and the journal
  PERFORM pg_temp.act_as(current_setting('t.citizen_uid'));
  SET LOCAL ROLE authenticated;
  PERFORM public.org_appoint_position_holder('data_protection_officer', current_setting('t.member_pid')::uuid);
  RESET ROLE;
  PERFORM pg_temp.act_as(current_setting('t.member_uid'));
  SET LOCAL ROLE authenticated;
  v_detail := public.org_position_detail('data_protection_officer');
  RESET ROLE;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_detail -> 'terms') t WHERE t ->> 'handover_note' LIKE 'Mailbox request%') THEN
    RAISE EXCEPTION 'the next holder should see the handover note: %', v_detail -> 'terms';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_detail -> 'log') l WHERE l ->> 'body' LIKE 'Asked the hosting provider%') THEN
    RAISE EXCEPTION 'the next holder should see the journal';
  END IF;

  -- 8. contact messages reach the position for the topic; unknown topics, bad input and floods are refused
  PERFORM set_config('request.jwt.claims', '{"role": "anon"}', true);
  SET LOCAL ROLE anon;
  v_item := public.submit_contact_message('privacy', 'Ani', 'ani@example.org', 'Please send me a copy of my data.');
  v_failed := false;
  BEGIN
    PERFORM public.submit_contact_message('nonsense', 'Ani', 'ani@example.org', 'Please send me a copy of my data.');
  EXCEPTION WHEN invalid_parameter_value THEN v_failed := true;
  END;
  IF NOT v_failed THEN RAISE EXCEPTION 'an unknown topic should be refused'; END IF;
  PERFORM public.submit_contact_message('privacy', 'Ani', 'ani@example.org', 'Second message about my data.');
  PERFORM public.submit_contact_message('privacy', 'Ani', 'ani@example.org', 'Third message about my data.');
  v_failed := false;
  BEGIN
    PERFORM public.submit_contact_message('privacy', 'Ani', 'ani@example.org', 'Fourth message about my data.');
  EXCEPTION WHEN SQLSTATE 'PT429' THEN v_failed := true;
  END;
  IF NOT v_failed THEN RAISE EXCEPTION 'a fourth message within the hour should be refused'; END IF;
  RESET ROLE;
  IF (SELECT position_key FROM public.org_position_items WHERE id = v_item) <> 'data_protection_officer' THEN
    RAISE EXCEPTION 'a privacy message should reach the data protection officer';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_notifications WHERE recipient_profile_id = current_setting('t.member_pid')::uuid
                   AND notification_type = 'position_item' AND entity_id = v_item) THEN
    RAISE EXCEPTION 'the holder should be notified of the message';
  END IF;
  -- nobody reads the queue tables directly
  SET LOCAL ROLE authenticated;
  v_failed := false;
  BEGIN
    PERFORM 1 FROM public.org_position_items LIMIT 1;
  EXCEPTION WHEN insufficient_privilege THEN v_failed := true;
  END;
  RESET ROLE;
  IF NOT v_failed THEN RAISE EXCEPTION 'the queue table should not be readable directly'; END IF;
END $$;
DO $$ BEGIN RAISE NOTICE 'ok: organisation positions'; END $$;

ROLLBACK;
