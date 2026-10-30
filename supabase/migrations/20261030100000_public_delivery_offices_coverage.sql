-- Public bodies, continued: what happens after a Matter is routed to a public function.
--
-- 1. Offices held by officials. A real official asks for a seat for their body (with evidence); the division's
--    liaison approves it and the official is appointed. Matters routed to that body then go to the office's queue,
--    on Civizen, instead of the liaison delivering them from outside.
-- 2. Delivery tracking. The liaison records when and how a Matter was delivered (with the body's reference); the
--    answer is due within the body's legal deadline (30 days when none is recorded). The answer is recorded on the
--    Matter. A daily job marks overdue answers, tells the initiator, and gives the Public Liaison Lead an item that
--    names the oversight body for the place (ombudsman, audit) as the next step.
-- 3. Coverage. For any place: which functions no body performs there (gaps) and which several bodies perform at the
--    same level (overlaps); the evidence for improving existing structures.

-- ---------------------------------------------------------------------------------------------
-- 1. Offices held by officials
-- ---------------------------------------------------------------------------------------------
ALTER TABLE public.org_positions ADD COLUMN IF NOT EXISTS public_body_id uuid REFERENCES public.public_bodies(id) ON DELETE SET NULL;

-- The division liaison for a body (by its first function).
CREATE OR REPLACE FUNCTION public.public_body_liaison(p_body_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.liaison_position_key
    FROM public.public_body_functions bf
    JOIN public.public_functions f ON f.function_key = bf.function_key
    JOIN public.public_function_divisions d ON d.division_code = f.division_code
   WHERE bf.body_id = p_body_id
   ORDER BY d.sort_order, f.sort_order
   LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.public_body_liaison(uuid) FROM PUBLIC, anon, authenticated;

-- The body's office on Civizen, if one is held (or acted in) right now.
CREATE OR REPLACE FUNCTION public.public_body_office(p_body_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.position_key FROM public.org_positions p
   WHERE p.public_body_id = p_body_id AND p.is_active
     AND EXISTS (SELECT 1 FROM public.org_position_terms t WHERE t.position_key = p.position_key AND t.ended_at IS NULL)
   ORDER BY p.created_at LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.public_body_office(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.request_public_office(p_body_id uuid, p_title text, p_evidence_url text, p_note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := public.current_profile_id();
  v_body public.public_bodies%ROWTYPE;
  v_item uuid;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_body FROM public.public_bodies WHERE id = p_body_id AND status = 'verified';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'body_not_found' USING ERRCODE = '22023';
  END IF;
  IF length(btrim(coalesce(p_title, ''))) < 3 OR coalesce(p_evidence_url, '') !~ '^https://' THEN
    RAISE EXCEPTION 'evidence_required' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.org_position_items WHERE source_type = 'office_request' AND created_by = v_me
               AND status IN ('open', 'in_progress', 'waiting')) THEN
    RAISE EXCEPTION 'request_already_open' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.org_position_items (position_key, kind, title, body, recommendation, source_type, source_ref, metadata, created_by)
  VALUES (coalesce(public.public_body_liaison(p_body_id), 'public_liaison_lead'), 'review',
          'Office request: ' || left(btrim(p_title), 80) || ', ' || left(v_body.name, 80),
          'Requested office: ' || btrim(p_title) || E'\nBody: ' || v_body.name || E'\nEvidence: ' || btrim(p_evidence_url)
            || CASE WHEN nullif(btrim(p_note), '') IS NOT NULL THEN E'\nNote: ' || left(btrim(p_note), 1000) ELSE '' END,
          'Confirm from the evidence (an official page, or an e-mail from the body''s official domain) that this member holds this office at this body; then approve, or decline with a note.',
          'office_request', p_body_id::text, jsonb_build_object('title', left(btrim(p_title), 120), 'requester', v_me), v_me)
  RETURNING id INTO v_item;
  INSERT INTO public.org_position_log (position_key, item_id, event, actor_profile_id, body)
  SELECT position_key, id, 'item_opened', v_me, title FROM public.org_position_items WHERE id = v_item;
  PERFORM public.org_notify_position(coalesce(public.public_body_liaison(p_body_id), 'public_liaison_lead'), v_item, 'Office request for ' || v_body.name);
  RETURN v_item;
END;
$$;
REVOKE ALL ON FUNCTION public.request_public_office(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_public_office(uuid, text, text, text) TO authenticated;

-- The liaison approves: a position for the office is created under the liaison and the official is appointed.
CREATE OR REPLACE FUNCTION public.approve_public_office(p_item_id uuid, p_note text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := public.current_profile_id();
  v_item public.org_position_items%ROWTYPE;
  v_body public.public_bodies%ROWTYPE;
  v_key text;
  v_requester uuid;
BEGIN
  SELECT * INTO v_item FROM public.org_position_items WHERE id = p_item_id AND source_type = 'office_request' FOR UPDATE;
  IF NOT FOUND OR v_item.status NOT IN ('open', 'in_progress', 'waiting') THEN
    RAISE EXCEPTION 'item_not_found' USING ERRCODE = '22023';
  END IF;
  IF NOT public.org_can_work_position(v_item.position_key, v_me) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF nullif(btrim(p_note), '') IS NULL THEN
    RAISE EXCEPTION 'note_required' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_body FROM public.public_bodies WHERE id = v_item.source_ref::uuid;
  v_requester := (v_item.metadata ->> 'requester')::uuid;
  v_key := 'office_' || substr(md5(v_body.id::text || (v_item.metadata ->> 'title')), 1, 12);
  INSERT INTO public.org_positions (position_key, unit_id, title, domain_role_key, parent_position_key, sort_order, mandate, duties, public_body_id)
  SELECT v_key, u.id, left((v_item.metadata ->> 'title') || ', ' || v_body.name, 200), 'reviewer', v_item.position_key, 500,
         'Answers, on Civizen, the Matters members address to ' || v_body.name || '.',
         ARRAY['Answer Matters addressed to the body within its deadline', 'Record each answer on the Matter', 'Hand over open Matters when the office changes hands'],
         v_body.id
    FROM public.governance_execution_units u WHERE u.unit_key = 'public_liaison'
  ON CONFLICT (position_key) DO NOTHING;
  INSERT INTO public.org_position_terms (position_key, profile_id, appointed_by)
  SELECT v_key, v_requester, v_me
   WHERE NOT EXISTS (SELECT 1 FROM public.org_position_terms WHERE position_key = v_key AND profile_id = v_requester AND ended_at IS NULL);
  INSERT INTO public.org_position_log (position_key, event, actor_profile_id, body)
  VALUES (v_key, 'holder_started', v_me, 'Office approved: ' || btrim(p_note));
  UPDATE public.org_position_items SET status = 'done', resolution = 'Approved: ' || btrim(p_note), resolved_by = v_me, resolved_at = now(), updated_at = now()
   WHERE id = p_item_id;
  INSERT INTO public.org_position_log (position_key, item_id, event, actor_profile_id, body)
  VALUES (v_item.position_key, p_item_id, 'item_resolved', v_me, 'Approved: ' || btrim(p_note));
  INSERT INTO public.user_notifications (recipient_profile_id, notification_type, title, body, entity_type, metadata)
  VALUES (v_requester, 'position_started', 'Your office on Civizen was approved',
          'Matters addressed to ' || v_body.name || ' now reach your office''s queue.', 'org_position', jsonb_build_object('position_key', v_key));
  RETURN v_key;
END;
$$;
REVOKE ALL ON FUNCTION public.approve_public_office(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_public_office(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------------------------
-- 2. Delivery and answers
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.public_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  body_id uuid NOT NULL REFERENCES public.public_bodies(id),
  function_key text REFERENCES public.public_functions(function_key),
  channel_kind text NOT NULL,
  channel_address text,
  reference text CHECK (reference IS NULL OR length(reference) <= 200),
  delivered_at timestamptz NOT NULL DEFAULT now(),
  delivered_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  answer_due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'delivered' CHECK (status IN ('delivered', 'overdue', 'answered')),
  outcome text CHECK (outcome IS NULL OR outcome IN ('resolved', 'answered', 'refused', 'redirected')),
  answer_summary text CHECK (answer_summary IS NULL OR length(answer_summary) <= 4000),
  answered_at timestamptz,
  answered_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  overdue_notified_at timestamptz,
  external_id text,
  external_status text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS public_deliveries_matter_idx ON public.public_deliveries (matter_id);
CREATE INDEX IF NOT EXISTS public_deliveries_due_idx ON public.public_deliveries (answer_due_at) WHERE status = 'delivered';
ALTER TABLE public.public_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.public_deliveries FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  EXECUTE 'DROP TRIGGER IF EXISTS enforcement_suspension_guard ON public.public_deliveries';
  EXECUTE 'CREATE TRIGGER enforcement_suspension_guard BEFORE INSERT OR UPDATE OR DELETE ON public.public_deliveries '
          'FOR EACH STATEMENT EXECUTE FUNCTION public.enforcement_suspension_guard()';
END $$;

-- Who may deliver and record answers for a Matter: whoever works the liaison for its function, or the body's office.
CREATE OR REPLACE FUNCTION public.public_can_handle_matter(p_matter_id uuid, p_profile uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_matter public.matters%ROWTYPE;
  v_liaison text;
  v_office text;
BEGIN
  SELECT * INTO v_matter FROM public.matters WHERE id = p_matter_id;
  IF NOT FOUND OR v_matter.public_function_key IS NULL OR p_profile IS NULL THEN
    RETURN false;
  END IF;
  SELECT d.liaison_position_key INTO v_liaison FROM public.public_functions f
    JOIN public.public_function_divisions d ON d.division_code = f.division_code WHERE f.function_key = v_matter.public_function_key;
  IF v_liaison IS NOT NULL AND public.org_can_work_position(v_liaison, p_profile) THEN
    RETURN true;
  END IF;
  IF v_matter.public_body_id IS NOT NULL THEN
    v_office := public.public_body_office(v_matter.public_body_id);
    RETURN v_office IS NOT NULL AND public.org_can_work_position(v_office, p_profile);
  END IF;
  RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION public.public_can_handle_matter(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- Opens a delivery to the Matter's body and tells the initiator when the answer is due.
CREATE OR REPLACE FUNCTION public.public_open_delivery(p_matter_id uuid, p_reference text, p_by uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_matter public.matters%ROWTYPE;
  v_body public.public_bodies%ROWTYPE;
  v_office text;
  v_id uuid;
  v_due timestamptz;
BEGIN
  SELECT * INTO v_matter FROM public.matters WHERE id = p_matter_id;
  SELECT * INTO v_body FROM public.public_bodies WHERE id = v_matter.public_body_id;
  IF v_body.id IS NULL THEN
    RAISE EXCEPTION 'no_body' USING ERRCODE = '22023';
  END IF;
  v_office := public.public_body_office(v_body.id);
  v_due := now() + make_interval(days => coalesce(v_body.answer_deadline_days, 30));
  INSERT INTO public.public_deliveries (matter_id, body_id, function_key, channel_kind, channel_address, reference, delivered_by, answer_due_at)
  VALUES (p_matter_id, v_body.id, v_matter.public_function_key, CASE WHEN v_office IS NOT NULL THEN 'civizen' ELSE v_body.channel_kind END,
          CASE WHEN v_office IS NOT NULL THEN v_office ELSE v_body.channel_address END, nullif(btrim(p_reference), ''), p_by, v_due)
  RETURNING id INTO v_id;
  PERFORM public.matter_log_event(p_matter_id, 'public_delivered',
    'Delivered to ' || v_body.name || CASE WHEN nullif(btrim(p_reference), '') IS NOT NULL THEN ' (reference ' || btrim(p_reference) || ')' ELSE '' END
      || '; answer due by ' || to_char(v_due, 'YYYY-MM-DD') || '.',
    CASE WHEN p_by IS NULL THEN 'system' ELSE 'person' END, p_by, p_by IS NULL,
    jsonb_build_object('deliveryId', v_id, 'bodyId', v_body.id, 'dueAt', v_due));
  PERFORM public.matter_notify_actor(v_matter.initiator_kind, v_matter.initiator_profile_id, 'matter_public_delivered',
    'Your Matter was delivered to ' || v_body.name, 'The answer is due by ' || to_char(v_due, 'YYYY-MM-DD') || '.', p_matter_id);
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.public_open_delivery(uuid, text, uuid) FROM PUBLIC, anon, authenticated;

-- Routing, as before, except that a body with an office on Civizen receives the Matter in that office's queue and the
-- delivery is recorded at once.
CREATE OR REPLACE FUNCTION public.set_matter_public_route(p_matter_id uuid, p_function_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_matter public.matters%ROWTYPE;
  v_route jsonb;
  v_body jsonb;
  v_liaison text;
  v_office text;
  v_target text;
BEGIN
  SELECT * INTO v_matter FROM public.matters WHERE id = p_matter_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'matter_not_found' USING ERRCODE = '22023';
  END IF;
  IF NOT public.current_profile_represents_actor(v_matter.initiator_kind, v_matter.initiator_profile_id) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  v_route := public.route_public_function(p_function_key, v_matter.scope_kind, v_matter.scope_country_code,
                                          v_matter.scope_region_code, v_matter.scope_locality_code);
  v_body := nullif(v_route -> 'body', 'null'::jsonb);
  v_liaison := coalesce(v_route ->> 'liaison_position_key', 'public_liaison_lead');
  v_office := CASE WHEN v_body IS NULL THEN NULL ELSE public.public_body_office((v_body ->> 'id')::uuid) END;
  v_target := coalesce(v_office, v_liaison);
  UPDATE public.matters SET public_function_key = p_function_key, public_body_id = (v_body ->> 'id')::uuid WHERE id = p_matter_id;
  WITH closed AS (
    UPDATE public.org_position_items
       SET status = 'done', resolution = 'Routed to ' || coalesce((SELECT title FROM public.org_positions WHERE position_key = v_target), v_target)
                                         || ' (public function: ' || (v_route ->> 'function_name') || ').', resolved_at = now(), updated_at = now()
     WHERE position_key = 'member_support' AND source_type = 'matter' AND source_ref = p_matter_id::text
       AND status IN ('open', 'in_progress', 'waiting')
    RETURNING id)
  INSERT INTO public.org_position_log (position_key, item_id, event, body)
  SELECT 'member_support', id, 'item_resolved', 'Routed to ' || v_target FROM closed;
  PERFORM public.org_open_matter_item(
    v_target, 'task',
    CASE WHEN v_office IS NOT NULL THEN 'Answer for ' || (v_body ->> 'name') || ': '
         WHEN v_body IS NULL THEN 'Find the responsible office: '
         ELSE 'Deliver to ' || (v_body ->> 'name') || ': ' END || v_matter.title,
    'Public function: ' || (v_route ->> 'function_name') || E'\nPlace: ' || v_matter.scope_kind
      || coalesce(' ' || v_matter.scope_country_code, '') || coalesce(' / ' || v_matter.scope_region_code, '')
      || coalesce(' / ' || v_matter.scope_locality_code, '')
      || CASE WHEN v_body IS NULL THEN E'\nNo verified body performs this function here yet.'
         WHEN v_office IS NOT NULL THEN E'\nThe body answers on Civizen through this office.'
         ELSE E'\nChannel: ' || (v_body ->> 'channel_kind') || ' ' || (v_body ->> 'channel_address')
              || coalesce(E'\nAnswer due within ' || (v_body ->> 'answer_deadline_days') || ' days by law or policy.', '')
              || E'\nSource: ' || (v_body ->> 'source_url') END,
    CASE WHEN v_office IS NOT NULL THEN 'Answer the Matter and record the answer on the Matter page.'
         WHEN v_body IS NULL THEN 'Find the office that performs this function in this place from an official source, propose it as a public body, assign it to the Matter, then deliver the Matter and record the delivery on the Matter page.'
         ELSE 'Deliver the Matter through the official channel, then record the delivery (with the body''s reference) on the Matter page, and the answer when it comes.' END,
    'normal', p_matter_id);
  IF v_office IS NOT NULL THEN
    PERFORM public.public_open_delivery(p_matter_id, NULL, NULL);
  END IF;
  PERFORM public.matter_log_event(p_matter_id, 'public_route_set',
    'Addressed to the public function "' || (v_route ->> 'function_name') || '"'
      || CASE WHEN v_body IS NULL THEN '; a Civizen liaison will find the responsible office.' ELSE '; it goes to ' || (v_body ->> 'name') || '.' END,
    'system', NULL, true, jsonb_build_object('functionKey', p_function_key, 'bodyId', v_body ->> 'id', 'position', v_target));
  RETURN v_route;
END;
$$;
REVOKE ALL ON FUNCTION public.set_matter_public_route(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_matter_public_route(uuid, text) TO authenticated;

-- The liaison found and verified the body after the Matter was raised: attach it.
CREATE OR REPLACE FUNCTION public.assign_matter_public_body(p_matter_id uuid, p_body_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_matter public.matters%ROWTYPE;
BEGIN
  IF NOT public.public_can_handle_matter(p_matter_id, public.current_profile_id()) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_matter FROM public.matters WHERE id = p_matter_id;
  IF NOT EXISTS (SELECT 1 FROM public.public_bodies b JOIN public.public_body_functions f ON f.body_id = b.id
                  WHERE b.id = p_body_id AND b.status = 'verified' AND f.function_key = v_matter.public_function_key) THEN
    RAISE EXCEPTION 'body_not_for_function' USING ERRCODE = '22023';
  END IF;
  UPDATE public.matters SET public_body_id = p_body_id WHERE id = p_matter_id;
  PERFORM public.matter_log_event(p_matter_id, 'public_body_assigned',
    'The responsible body was found: ' || (SELECT name FROM public.public_bodies WHERE id = p_body_id) || '.',
    'person', public.current_profile_id(), false, jsonb_build_object('bodyId', p_body_id));
END;
$$;
REVOKE ALL ON FUNCTION public.assign_matter_public_body(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_matter_public_body(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_public_delivery(p_matter_id uuid, p_reference text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.public_can_handle_matter(p_matter_id, public.current_profile_id()) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.public_deliveries WHERE matter_id = p_matter_id AND status IN ('delivered', 'overdue')) THEN
    RAISE EXCEPTION 'delivery_already_open' USING ERRCODE = '22023';
  END IF;
  RETURN public.public_open_delivery(p_matter_id, p_reference, public.current_profile_id());
END;
$$;
REVOKE ALL ON FUNCTION public.record_public_delivery(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_public_delivery(uuid, text) TO authenticated;

-- The body's answer, recorded on the Matter (by the liaison, or by the body's own office). The position items for the
-- Matter close with it.
CREATE OR REPLACE FUNCTION public.record_public_answer(p_delivery_id uuid, p_outcome text, p_summary text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := public.current_profile_id();
  v_delivery public.public_deliveries%ROWTYPE;
  v_matter public.matters%ROWTYPE;
  v_body text;
BEGIN
  SELECT * INTO v_delivery FROM public.public_deliveries WHERE id = p_delivery_id FOR UPDATE;
  IF NOT FOUND OR v_delivery.status = 'answered' THEN
    RAISE EXCEPTION 'delivery_not_open' USING ERRCODE = '22023';
  END IF;
  IF NOT public.public_can_handle_matter(v_delivery.matter_id, v_me) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF p_outcome NOT IN ('resolved', 'answered', 'refused', 'redirected') OR length(btrim(coalesce(p_summary, ''))) < 3 THEN
    RAISE EXCEPTION 'answer_required' USING ERRCODE = '22023';
  END IF;
  UPDATE public.public_deliveries
     SET status = 'answered', outcome = p_outcome, answer_summary = btrim(p_summary), answered_at = now(), answered_by = v_me
   WHERE id = p_delivery_id;
  SELECT * INTO v_matter FROM public.matters WHERE id = v_delivery.matter_id;
  SELECT name INTO v_body FROM public.public_bodies WHERE id = v_delivery.body_id;
  PERFORM public.matter_log_event(v_delivery.matter_id, 'public_answered',
    v_body || ' answered (' || p_outcome || '): ' || left(btrim(p_summary), 1500), 'person', v_me, false,
    jsonb_build_object('deliveryId', p_delivery_id, 'outcome', p_outcome));
  PERFORM public.matter_notify_actor(v_matter.initiator_kind, v_matter.initiator_profile_id, 'matter_public_answered',
    v_body || ' answered your Matter', left(btrim(p_summary), 300), v_delivery.matter_id);
  WITH closed AS (
    UPDATE public.org_position_items
       SET status = 'done', resolution = 'Answer recorded (' || p_outcome || ').', resolved_by = v_me, resolved_at = now(), updated_at = now()
     WHERE source_type = 'matter' AND source_ref = v_delivery.matter_id::text AND status IN ('open', 'in_progress', 'waiting')
    RETURNING id, position_key)
  INSERT INTO public.org_position_log (position_key, item_id, event, actor_profile_id, body)
  SELECT position_key, id, 'item_resolved', v_me, 'Answer recorded (' || p_outcome || ').' FROM closed;
END;
$$;
REVOKE ALL ON FUNCTION public.record_public_answer(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_public_answer(uuid, text, text) TO authenticated;

-- Daily: answers past their deadline. The initiator is told; the Public Liaison Lead gets an item naming the oversight
-- body for the place as the next step.
CREATE OR REPLACE FUNCTION public.process_public_delivery_deadlines()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
  v_oversight jsonb;
  v_count integer := 0;
BEGIN
  FOR v_row IN
    SELECT d.*, m.title, m.initiator_kind, m.initiator_profile_id, m.scope_kind, m.scope_country_code, m.scope_region_code,
           m.scope_locality_code, b.name AS body_name
      FROM public.public_deliveries d
      JOIN public.matters m ON m.id = d.matter_id
      JOIN public.public_bodies b ON b.id = d.body_id
     WHERE d.status = 'delivered' AND d.answer_due_at < now()
     FOR UPDATE OF d SKIP LOCKED
  LOOP
    UPDATE public.public_deliveries SET status = 'overdue', overdue_notified_at = now() WHERE id = v_row.id;
    v_oversight := nullif(public.route_public_function('audit_oversight', v_row.scope_kind, v_row.scope_country_code,
                                                       v_row.scope_region_code, v_row.scope_locality_code) -> 'body', 'null'::jsonb);
    PERFORM public.org_open_matter_item(
      'public_liaison_lead', 'task', 'Overdue answer from ' || v_row.body_name || ': ' || v_row.title,
      'Delivered ' || to_char(v_row.delivered_at, 'YYYY-MM-DD') || coalesce(' (reference ' || v_row.reference || ')', '')
        || '; the answer was due by ' || to_char(v_row.answer_due_at, 'YYYY-MM-DD') || '.',
      CASE WHEN v_oversight IS NULL
        THEN 'Remind the body through its channel. If it still does not answer, find the oversight body for this place (ombudsman, audit or complaints office), propose it under "Audit, ombudsman and anti-corruption", and help the initiator complain there.'
        ELSE 'Remind the body through its channel. If it still does not answer within 14 days, help the initiator complain to ' || (v_oversight ->> 'name')
             || ' (' || (v_oversight ->> 'channel_kind') || ' ' || (v_oversight ->> 'channel_address') || ').' END,
      'high', v_row.matter_id);
    PERFORM public.matter_log_event(v_row.matter_id, 'public_answer_overdue',
      v_row.body_name || ' has not answered by its deadline; Civizen''s Public Liaison is following up.', 'system', NULL, true,
      jsonb_build_object('deliveryId', v_row.id));
    PERFORM public.matter_notify_actor(v_row.initiator_kind, v_row.initiator_profile_id, 'matter_public_overdue',
      v_row.body_name || ' has not answered in time', 'Civizen''s Public Liaison is following it up.', v_row.matter_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.process_public_delivery_deadlines() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('public_delivery_deadline_tick');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    PERFORM cron.schedule('public_delivery_deadline_tick', '37 6 * * *', $cron$SELECT public.process_public_delivery_deadlines();$cron$);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- What anyone who can see the Matter may know about its public route: the function, the body, the deliveries and
-- answers; and whether the viewer may record them.
CREATE OR REPLACE FUNCTION public.matter_public_status(p_matter_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_matter public.matters%ROWTYPE;
  v_me uuid := public.current_profile_id();
BEGIN
  SELECT * INTO v_matter FROM public.matters WHERE id = p_matter_id;
  IF NOT FOUND OR v_matter.public_function_key IS NULL THEN
    RETURN NULL;
  END IF;
  IF NOT (v_matter.visibility = 'public' OR public.can_access_matter(p_matter_id) OR public.public_can_handle_matter(p_matter_id, v_me)) THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'function_key', v_matter.public_function_key,
    'function_name', (SELECT name FROM public.public_functions WHERE function_key = v_matter.public_function_key),
    'body', (SELECT jsonb_build_object('id', b.id, 'name', b.name, 'website', b.website, 'answer_deadline_days', b.answer_deadline_days,
                                       'channel_kind', b.channel_kind)
               FROM public.public_bodies b WHERE b.id = v_matter.public_body_id),
    'office', CASE WHEN v_matter.public_body_id IS NULL THEN NULL ELSE public.public_body_office(v_matter.public_body_id) END,
    'deliveries', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id', d.id, 'body_name', b.name, 'channel_kind', d.channel_kind, 'reference', d.reference, 'delivered_at', d.delivered_at,
        'answer_due_at', d.answer_due_at, 'status', d.status, 'outcome', d.outcome, 'answer_summary', d.answer_summary,
        'answered_at', d.answered_at, 'external_id', d.external_id, 'external_status', d.external_status) ORDER BY d.delivered_at DESC)
      FROM public.public_deliveries d JOIN public.public_bodies b ON b.id = d.body_id WHERE d.matter_id = p_matter_id), '[]'::jsonb),
    'candidate_bodies', CASE WHEN public.public_can_handle_matter(p_matter_id, v_me) THEN coalesce((
        SELECT jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name, 'scope_kind', b.scope_kind) ORDER BY b.name)
          FROM public.public_bodies b JOIN public.public_body_functions f ON f.body_id = b.id
         WHERE f.function_key = v_matter.public_function_key AND b.status = 'verified'), '[]'::jsonb) ELSE '[]'::jsonb END,
    'can_handle', public.public_can_handle_matter(p_matter_id, v_me));
END;
$$;
REVOKE ALL ON FUNCTION public.matter_public_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.matter_public_status(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3. Coverage of a place
-- ---------------------------------------------------------------------------------------------
-- For every function (except catch-alls and Civizen's own): the verified bodies that perform it for the place, and
-- whether that is a gap (none), covered (one at the most local level) or an overlap (several at the same level).
CREATE OR REPLACE FUNCTION public.public_coverage(
  p_scope_kind text DEFAULT 'global', p_country text DEFAULT NULL, p_region text DEFAULT NULL, p_locality text DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH place AS (
    SELECT nullif(nullif(upper(btrim(coalesce(p_country, ''))), 'GLOBAL'), '') AS country,
           nullif(btrim(coalesce(p_region, '')), '') AS region,
           nullif(btrim(coalesce(p_locality, '')), '') AS locality
  ), covering AS (
    SELECT f.function_key, b.id, b.name, b.scope_kind,
           CASE b.scope_kind WHEN 'locality' THEN 0 WHEN 'region' THEN 1 WHEN 'country' THEN 2 ELSE 3 END AS level
      FROM public.public_body_functions f
      JOIN public.public_bodies b ON b.id = f.body_id AND b.status = 'verified'
      CROSS JOIN place
     WHERE (b.scope_kind = 'locality' AND b.scope_country_code = place.country AND b.scope_locality_code = place.locality
              AND (b.scope_region_code IS NULL OR b.scope_region_code = place.region))
        OR (b.scope_kind = 'region' AND b.scope_country_code = place.country AND b.scope_region_code = place.region)
        OR (b.scope_kind = 'country' AND b.scope_country_code = place.country)
        OR b.scope_kind = 'global'
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'function_key', fn.function_key, 'name', fn.name, 'division_code', fn.division_code,
           'bodies', coalesce((SELECT jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'scope_kind', c.scope_kind) ORDER BY c.level, c.name)
                                 FROM covering c WHERE c.function_key = fn.function_key), '[]'::jsonb),
           'status', CASE
             WHEN NOT EXISTS (SELECT 1 FROM covering c WHERE c.function_key = fn.function_key) THEN 'gap'
             WHEN (SELECT count(*) FROM covering c WHERE c.function_key = fn.function_key
                     AND c.level = (SELECT min(c2.level) FROM covering c2 WHERE c2.function_key = fn.function_key)) > 1 THEN 'overlap'
             ELSE 'covered' END)
         ORDER BY d.sort_order, fn.sort_order), '[]'::jsonb)
    FROM public.public_functions fn
    JOIN public.public_function_divisions d ON d.division_code = fn.division_code
   WHERE fn.origin <> 'catch_all' AND d.cofog_code IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.public_coverage(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_coverage(text, text, text, text) TO anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 4. A public body's page
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.public_body_detail(p_body_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', b.id, 'name', b.name, 'kind', b.kind, 'scope_kind', b.scope_kind, 'scope_country_code', b.scope_country_code,
    'scope_region_code', b.scope_region_code, 'scope_locality_code', b.scope_locality_code, 'website', b.website,
    'channel_kind', b.channel_kind, 'channel_address', b.channel_address, 'answer_deadline_days', b.answer_deadline_days,
    'source_url', b.source_url, 'reviewed_at', b.reviewed_at,
    'functions', coalesce((SELECT jsonb_agg(jsonb_build_object('function_key', f.function_key, 'name', f.name, 'coverage_note', bf.coverage_note)
                                           ORDER BY f.sort_order)
                             FROM public.public_body_functions bf JOIN public.public_functions f ON f.function_key = bf.function_key
                            WHERE bf.body_id = b.id), '[]'::jsonb),
    'offices', coalesce((SELECT jsonb_agg(jsonb_build_object('position_key', p.position_key, 'title', p.title,
                                             'held', EXISTS (SELECT 1 FROM public.org_position_terms t WHERE t.position_key = p.position_key AND t.ended_at IS NULL)))
                           FROM public.org_positions p WHERE p.public_body_id = b.id AND p.is_active), '[]'::jsonb))
    FROM public.public_bodies b
   WHERE b.id = p_body_id AND b.status = 'verified';
$$;
REVOKE ALL ON FUNCTION public.public_body_detail(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_body_detail(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 5. Delivery through a city service-request system (Open311 GeoReport v2)
-- ---------------------------------------------------------------------------------------------
-- A body whose channel is `service_request_api` stores "<endpoint>|<service code>" as its channel address, for example
-- "https://city.example.org/open311/v2|streetlight". The `public-delivery-open311` edge function asks for what to send
-- (checking the caller may handle the Matter), submits it, and records the request id as the delivery reference.
CREATE OR REPLACE FUNCTION public.prepare_open311_delivery(p_matter_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_matter public.matters%ROWTYPE;
  v_body public.public_bodies%ROWTYPE;
BEGIN
  IF NOT public.public_can_handle_matter(p_matter_id, public.current_profile_id()) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_matter FROM public.matters WHERE id = p_matter_id;
  SELECT * INTO v_body FROM public.public_bodies WHERE id = v_matter.public_body_id;
  IF v_body.id IS NULL OR v_body.channel_kind <> 'service_request_api' OR position('|' in v_body.channel_address) = 0 THEN
    RAISE EXCEPTION 'not_a_service_request_body' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.public_deliveries WHERE matter_id = p_matter_id AND status IN ('delivered', 'overdue')) THEN
    RAISE EXCEPTION 'delivery_already_open' USING ERRCODE = '22023';
  END IF;
  RETURN jsonb_build_object(
    'endpoint', split_part(v_body.channel_address, '|', 1), 'service_code', split_part(v_body.channel_address, '|', 2),
    'description', left(v_matter.title || E'\n\n' || coalesce(v_matter.description, ''), 4000),
    'address_string', concat_ws(', ', v_matter.scope_locality_code, v_matter.scope_region_code, v_matter.scope_country_code));
END;
$$;
REVOKE ALL ON FUNCTION public.prepare_open311_delivery(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prepare_open311_delivery(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_open311_delivery(p_matter_id uuid, p_external_id text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF nullif(btrim(p_external_id), '') IS NULL THEN
    RAISE EXCEPTION 'external_id_required' USING ERRCODE = '22023';
  END IF;
  v_id := public.record_public_delivery(p_matter_id, btrim(p_external_id));
  UPDATE public.public_deliveries SET external_id = btrim(p_external_id), external_status = 'open' WHERE id = v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.record_open311_delivery(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_open311_delivery(uuid, text) TO authenticated;

-- What the edge function needs to ask the city for a request's status.
CREATE OR REPLACE FUNCTION public.prepare_open311_refresh(p_delivery_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery public.public_deliveries%ROWTYPE;
  v_body public.public_bodies%ROWTYPE;
BEGIN
  SELECT * INTO v_delivery FROM public.public_deliveries WHERE id = p_delivery_id;
  IF NOT FOUND OR v_delivery.external_id IS NULL OR NOT public.public_can_handle_matter(v_delivery.matter_id, public.current_profile_id()) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_body FROM public.public_bodies WHERE id = v_delivery.body_id;
  RETURN jsonb_build_object('endpoint', split_part(v_body.channel_address, '|', 1), 'external_id', v_delivery.external_id, 'status', v_delivery.status);
END;
$$;
REVOKE ALL ON FUNCTION public.prepare_open311_refresh(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prepare_open311_refresh(uuid) TO authenticated;

-- The city's status for the request; a closed request records its notes as the body's answer.
CREATE OR REPLACE FUNCTION public.record_open311_status(p_delivery_id uuid, p_status text, p_notes text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery public.public_deliveries%ROWTYPE;
BEGIN
  SELECT * INTO v_delivery FROM public.public_deliveries WHERE id = p_delivery_id;
  IF NOT FOUND OR NOT public.public_can_handle_matter(v_delivery.matter_id, public.current_profile_id()) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  UPDATE public.public_deliveries SET external_status = left(coalesce(p_status, ''), 40) WHERE id = p_delivery_id;
  IF lower(coalesce(p_status, '')) = 'closed' AND v_delivery.status <> 'answered' THEN
    PERFORM public.record_public_answer(p_delivery_id, 'answered',
      coalesce(nullif(btrim(p_notes), ''), 'The city closed the service request.'));
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.record_open311_status(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_open311_status(uuid, text, text) TO authenticated;
