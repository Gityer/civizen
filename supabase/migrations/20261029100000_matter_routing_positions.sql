-- Launch gaps 1 and 2 (plan §9): Matters for the Civizen community reach positions, and stalled Matters escalate to
-- a position instead of back to the party that did not answer.
--
-- 1. Civizen acts through positions. Holders of positions marked `acts_for_civizen` (Member Support, Civic Operations
--    Lead), or whoever answers for them while they are vacant, represent the Civizen organisation on Matters: they
--    can read, respond, accept responsibility and close, as its account owner could.
-- 2. Triage. A Matter addressed to (or made the responsibility of) the Civizen organisation opens a triage item in
--    Member Support's queue, linked to the Matter.
-- 3. Escalation. When an escalation step would notify the "responsible lead" or the "manual queue" and that resolves
--    to the party that is not answering (or to the Civizen organisation itself), the Matter goes into Civic Operations
--    Lead's queue instead, and the initiator is told. Response escalation gains the manual-review step at 120 hours
--    that responsibility escalation already had.
-- 4. The initiator can pass a Matter with an overdue action to Civic Operations themselves.

-- ---------------------------------------------------------------------------------------------
-- 1. Civizen acts through positions
-- ---------------------------------------------------------------------------------------------
ALTER TABLE public.org_positions ADD COLUMN IF NOT EXISTS acts_for_civizen boolean NOT NULL DEFAULT false;
UPDATE public.org_positions SET acts_for_civizen = true WHERE position_key IN ('member_support', 'civic_operations_lead');

CREATE OR REPLACE FUNCTION public.org_current_profile_acts_for_civizen()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_profile_id() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.org_positions p
     WHERE p.acts_for_civizen AND p.is_active
       AND public.current_profile_id() IN (SELECT public.org_position_answerers(p.position_key)));
$$;
REVOKE ALL ON FUNCTION public.org_current_profile_acts_for_civizen() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.org_current_profile_acts_for_civizen() TO authenticated;

CREATE OR REPLACE FUNCTION public.current_profile_represents_actor(p_kind text, p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.current_profile_id() IS NOT NULL
    AND p_profile_id IS NOT NULL
    AND (
      public.current_profile_id() = p_profile_id
      OR (
        p_kind = 'organization'
        AND (
          public.current_profile_manages_publisher(p_profile_id)
          OR (p_profile_id = public.resolve_civizen_org_profile() AND public.org_current_profile_acts_for_civizen())
        )
      )
    );
$$;

-- ---------------------------------------------------------------------------------------------
-- 2. Items opened by the system (no person behind them)
-- ---------------------------------------------------------------------------------------------
-- Opens an item unless the same Matter already has an open item in that position; returns the item either way.
CREATE OR REPLACE FUNCTION public.org_open_matter_item(
  p_position_key text, p_kind text, p_title text, p_body text, p_recommendation text, p_priority text, p_matter_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.org_position_items
   WHERE position_key = p_position_key AND source_type = 'matter' AND source_ref = p_matter_id::text
     AND status IN ('open', 'in_progress', 'waiting')
   LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;
  INSERT INTO public.org_position_items (position_key, kind, title, body, recommendation, priority, source_type, source_ref)
  VALUES (p_position_key, p_kind, left(p_title, 200), left(coalesce(p_body, ''), 8000), p_recommendation, p_priority, 'matter', p_matter_id::text)
  RETURNING id INTO v_id;
  INSERT INTO public.org_position_log (position_key, item_id, event, body)
  VALUES (p_position_key, v_id, 'item_opened', left(p_title, 200));
  PERFORM public.org_notify_position(p_position_key, v_id, left(p_title, 200));
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.org_open_matter_item(text, text, text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3. Triage of Matters for the Civizen community
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.matter_route_to_positions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_civizen uuid := public.resolve_civizen_org_profile();
BEGIN
  IF v_civizen IS NULL OR NEW.lifecycle_status NOT IN ('submitted', 'active') THEN
    RETURN NEW;
  END IF;
  IF v_civizen IN (NEW.responsible_profile_id, NEW.addressee_profile_id)
     AND (TG_OP = 'INSERT'
          OR OLD.lifecycle_status IS DISTINCT FROM NEW.lifecycle_status
          OR OLD.responsible_profile_id IS DISTINCT FROM NEW.responsible_profile_id
          OR OLD.addressee_profile_id IS DISTINCT FROM NEW.addressee_profile_id) THEN
    PERFORM public.org_open_matter_item(
      'member_support', 'task', 'Triage: ' || NEW.title,
      left(coalesce(NEW.description, ''), 2000),
      'Read it, answer for Civizen on the Matter, and either handle it or redirect it to the position or member who can. Record what you did here.',
      'normal', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.matter_route_to_positions() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS matter_route_to_positions ON public.matters;
CREATE TRIGGER matter_route_to_positions
  AFTER INSERT OR UPDATE OF lifecycle_status, responsible_profile_id, addressee_profile_id ON public.matters
  FOR EACH ROW EXECUTE FUNCTION public.matter_route_to_positions();

-- ---------------------------------------------------------------------------------------------
-- 4. Escalation that leaves the party that did not answer
-- ---------------------------------------------------------------------------------------------
-- Passes a stalled Matter to Civic Operations: an item in its queue, an event on the Matter, a notice to the initiator.
CREATE OR REPLACE FUNCTION public.matter_escalate_to_position(p_matter_id uuid, p_reason text, p_by uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_matter public.matters%ROWTYPE;
  v_item uuid;
BEGIN
  SELECT * INTO v_matter FROM public.matters WHERE id = p_matter_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  v_item := public.org_open_matter_item(
    'civic_operations_lead', 'task', 'Stalled Matter: ' || v_matter.title,
    p_reason || E'\n\n' || left(coalesce(v_matter.description, ''), 1500),
    'Contact the responsible party, or find another who can answer, and redirect the Matter; tell the initiator what happens next.',
    'high', p_matter_id);
  PERFORM public.matter_log_event(
    p_matter_id, 'escalated_to_position', 'Passed to Civic Operations: ' || p_reason,
    CASE WHEN p_by IS NULL THEN 'system' ELSE 'person' END, p_by, p_by IS NULL,
    jsonb_build_object('positionKey', 'civic_operations_lead', 'itemId', v_item));
  PERFORM public.matter_notify_actor(
    v_matter.initiator_kind, v_matter.initiator_profile_id,
    'matter_escalated', 'Your Matter was passed to Civic Operations',
    'The responsible party has not answered in time, so Civic Operations will follow it up.', p_matter_id);
  RETURN v_item;
END;
$$;
REVOKE ALL ON FUNCTION public.matter_escalate_to_position(uuid, text, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.matter_execute_escalation_step(
  p_action public.matter_action_requirements,
  p_step public.matter_escalation_steps
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_matter public.matters%ROWTYPE;
  v_target_kind text;
  v_target_profile uuid;
  v_lead public.matter_responsibilities%ROWTYPE;
  v_civizen uuid := public.resolve_civizen_org_profile();
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.matter_escalation_executions
    WHERE action_id = p_action.id AND step_order = p_step.step_order
  ) THEN
    RETURN;
  END IF;
  SELECT * INTO v_matter FROM public.matters WHERE id = p_action.matter_id;
  v_target_kind := 'person';
  v_target_profile := p_action.assigned_profile_id;
  CASE p_step.target_role
    WHEN 'responsible_lead' THEN
      SELECT * INTO v_lead FROM public.matter_responsibilities
      WHERE matter_id = p_action.matter_id AND kind = 'lead' AND status = 'accepted'
      ORDER BY assigned_at LIMIT 1;
      IF FOUND THEN
        v_target_kind := v_lead.actor_kind;
        v_target_profile := v_lead.actor_profile_id;
      ELSE
        v_target_kind := v_matter.responsible_kind;
        v_target_profile := v_matter.responsible_profile_id;
      END IF;
    WHEN 'initiator' THEN
      v_target_kind := v_matter.initiator_kind;
      v_target_profile := v_matter.initiator_profile_id;
    WHEN 'fallback_profile' THEN
      v_target_profile := p_step.target_profile_id;
    WHEN 'manual_queue' THEN
      v_target_profile := NULL;
    ELSE
      NULL;
  END CASE;

  -- the lead or the manual queue is the same party that did not answer, nobody, or Civizen itself: pass the Matter
  -- to Civic Operations instead of telling the silent party again
  IF p_step.step_behavior IN ('notify_lead', 'require_manual_review')
     AND (v_target_profile IS NULL OR v_target_profile = p_action.assigned_profile_id OR v_target_profile = v_civizen) THEN
    PERFORM public.matter_escalate_to_position(
      p_action.matter_id,
      'No answer from the responsible party ' || p_step.after_hours || ' hours after the deadline.');
    INSERT INTO public.matter_escalation_executions (action_id, step_order)
    VALUES (p_action.id, p_step.step_order)
    ON CONFLICT DO NOTHING;
    RETURN;
  END IF;

  CASE p_step.step_behavior
    WHEN 'remind' THEN
      PERFORM public.matter_notify_actor(
        p_action.assigned_kind, p_action.assigned_profile_id,
        'matter_action_reminder', 'Matter deadline approaching', 'A Matter still needs your action.', p_action.matter_id
      );
    WHEN 'mark_unresponsive' THEN
      PERFORM public.matter_log_event(
        p_action.matter_id, 'actor_marked_unresponsive',
        'No response received after escalation period.',
        'system', NULL, true,
        jsonb_build_object('actionId', p_action.id, 'profileId', p_action.assigned_profile_id)
      );
    WHEN 'notify_lead' THEN
      PERFORM public.matter_notify_actor(
        v_target_kind, v_target_profile,
        'matter_escalated', 'Matter escalated', 'A Matter needs attention — assigned actor is overdue.',
        p_action.matter_id
      );
      PERFORM public.matter_log_event(
        p_action.matter_id, 'escalation_performed',
        'Escalation notified Responsible Lead.',
        'system', NULL, true,
        jsonb_build_object('actionId', p_action.id, 'stepOrder', p_step.step_order)
      );
    WHEN 'require_manual_review' THEN
      PERFORM public.matter_assign_action(
        p_action.matter_id, 'manual_review', v_target_kind, v_target_profile,
        NULL, 'address_work', 'remind', 'matter', NULL
      );
      PERFORM public.matter_log_event(
        p_action.matter_id, 'manual_review_required',
        'Manual review required after escalation.',
        'system', NULL, true,
        jsonb_build_object('actionId', p_action.id, 'stepOrder', p_step.step_order)
      );
    WHEN 'return_to_initiator' THEN
      PERFORM public.matter_notify_actor(
        v_matter.initiator_kind, v_matter.initiator_profile_id,
        'matter_escalated', 'Matter returned for review', 'A Matter needs your attention.',
        p_action.matter_id
      );
    WHEN 'forward_responsibility' THEN
      IF p_step.target_profile_id IS NOT NULL THEN
        PERFORM public.matter_log_event(
          p_action.matter_id, 'escalation_forwarded',
          'Escalation forwarded responsibility request.',
          'system', NULL, true,
          jsonb_build_object('targetProfileId', p_step.target_profile_id)
        );
      END IF;
    ELSE
      NULL;
  END CASE;
  INSERT INTO public.matter_escalation_executions (action_id, step_order)
  VALUES (p_action.id, p_step.step_order)
  ON CONFLICT DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.matter_execute_escalation_step(public.matter_action_requirements, public.matter_escalation_steps) FROM PUBLIC, authenticated;

INSERT INTO public.matter_escalation_steps (policy_id, step_order, after_hours, step_behavior, target_role)
VALUES ('response_escalation', 4, 120, 'require_manual_review', 'manual_queue')
ON CONFLICT (policy_id, step_order) DO NOTHING;

-- ---------------------------------------------------------------------------------------------
-- 5. The initiator passes an overdue Matter to Civic Operations
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.escalate_matter_to_civic_operations(p_matter_id uuid, p_note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := public.current_profile_id();
  v_matter public.matters%ROWTYPE;
BEGIN
  SELECT * INTO v_matter FROM public.matters WHERE id = p_matter_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'matter_not_found' USING ERRCODE = '22023';
  END IF;
  IF NOT public.current_profile_represents_actor(v_matter.initiator_kind, v_matter.initiator_profile_id) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF v_matter.lifecycle_status NOT IN ('submitted', 'active') THEN
    RAISE EXCEPTION 'matter_not_open' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.matter_action_requirements a
     WHERE a.matter_id = p_matter_id AND a.status IN ('pending', 'overdue') AND a.due_at < now()
       AND NOT public.current_profile_represents_actor(a.assigned_kind, a.assigned_profile_id)) THEN
    RAISE EXCEPTION 'nothing_overdue' USING ERRCODE = '22023';
  END IF;
  RETURN public.matter_escalate_to_position(
    p_matter_id,
    'The initiator asked Civic Operations to follow up an overdue answer.'
      || CASE WHEN nullif(btrim(p_note), '') IS NOT NULL THEN ' Their note: ' || left(btrim(p_note), 1000) ELSE '' END,
    v_me);
END;
$$;
REVOKE ALL ON FUNCTION public.escalate_matter_to_civic_operations(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.escalate_matter_to_civic_operations(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------------------------
-- 6. Position items show where they came from, so a Matter item links to its Matter
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.org_position_detail(p_position_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := public.current_profile_id();
  v_pos public.org_positions%ROWTYPE;
  v_can_work boolean;
  v_result jsonb;
BEGIN
  SELECT * INTO v_pos FROM public.org_positions WHERE position_key = p_position_key;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  v_can_work := public.org_can_work_position(p_position_key, v_me);
  v_result := jsonb_build_object(
    'position_key', v_pos.position_key, 'title', v_pos.title, 'mandate', v_pos.mandate, 'duties', to_jsonb(v_pos.duties),
    'seats', v_pos.seats, 'contact_topic', v_pos.contact_topic, 'parent_position_key', v_pos.parent_position_key,
    'parent_title', (SELECT title FROM public.org_positions WHERE position_key = v_pos.parent_position_key),
    'unit', (SELECT jsonb_build_object('unit_key', u.unit_key, 'name', u.name, 'domain_key', u.domain_key)
               FROM public.governance_execution_units u WHERE u.id = v_pos.unit_id),
    'terms', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', t.id, 'profile_id', pr.id, 'username', pr.username, 'full_name', pr.full_name,
                                          'kind', t.kind, 'started_at', t.started_at, 'ended_at', t.ended_at,
                                          'end_reason', t.end_reason, 'handover_note', CASE WHEN v_can_work THEN t.handover_note END)
                       ORDER BY t.ended_at IS NULL DESC, t.started_at DESC)
        FROM public.org_position_terms t JOIN public.profiles pr ON pr.id = t.profile_id
       WHERE t.position_key = p_position_key), '[]'::jsonb),
    'vacant', NOT EXISTS (SELECT 1 FROM public.org_position_terms WHERE position_key = p_position_key AND ended_at IS NULL),
    'answered_by', coalesce((
      SELECT jsonb_agg(jsonb_build_object('profile_id', pr.id, 'username', pr.username, 'full_name', pr.full_name))
        FROM public.org_position_answerers(p_position_key) a JOIN public.profiles pr ON pr.id = a), '[]'::jsonb),
    'open_items', (SELECT count(*) FROM public.org_position_items
                    WHERE position_key = p_position_key AND status IN ('open', 'in_progress', 'waiting')),
    'can_work', v_can_work,
    'can_appoint', public.org_can_appoint_position(p_position_key),
    'is_holder', EXISTS (SELECT 1 FROM public.org_position_terms WHERE position_key = p_position_key AND profile_id = v_me AND ended_at IS NULL)
  );
  IF v_can_work THEN
    v_result := v_result || jsonb_build_object(
      'items', coalesce((
        SELECT jsonb_agg(jsonb_build_object(
                 'id', i.id, 'kind', i.kind, 'title', i.title, 'body', i.body, 'recommendation', i.recommendation,
                 'status', i.status, 'priority', i.priority, 'due_at', i.due_at, 'resolution', i.resolution,
                 'resolved_at', i.resolved_at, 'created_at', i.created_at, 'metadata', i.metadata,
                 'source_type', i.source_type, 'source_ref', i.source_ref,
                 'claimed_by', (SELECT jsonb_build_object('profile_id', pr.id, 'username', pr.username) FROM public.profiles pr WHERE pr.id = i.claimed_by))
               ORDER BY (i.status IN ('done', 'declined')), CASE i.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
                        i.due_at NULLS LAST, i.created_at)
          FROM public.org_position_items i WHERE i.position_key = p_position_key), '[]'::jsonb),
      'log', coalesce((
        SELECT jsonb_agg(entry ORDER BY (entry ->> 'created_at') DESC)
          FROM (SELECT jsonb_build_object('id', l.id, 'event', l.event, 'item_id', l.item_id, 'body', l.body, 'created_at', l.created_at,
                                          'actor', (SELECT pr.username FROM public.profiles pr WHERE pr.id = l.actor_profile_id)) AS entry
                  FROM public.org_position_log l WHERE l.position_key = p_position_key
                 ORDER BY l.created_at DESC LIMIT 200) recent), '[]'::jsonb));
  END IF;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.org_position_detail(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.org_position_detail(text) TO anon, authenticated;
