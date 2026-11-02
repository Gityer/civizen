-- Trust & Safety baseline T8 (rest): claims and dismissals left no record apart from the last values on the report row.
-- Every claim, dismissal and message-report decision now writes one row per report to moderation_report_events.
-- moderation_actions stays the record of hides and appeals that authors see; these events are staff-only.

CREATE TABLE IF NOT EXISTS public.moderation_report_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  event text NOT NULL CHECK (event IN ('claimed', 'dismissed', 'status_changed')),
  status text,
  note text,
  moderator_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS moderation_report_events_report_idx ON public.moderation_report_events (report_id, created_at);

ALTER TABLE public.moderation_report_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS moderation_report_events_staff_read ON public.moderation_report_events;
CREATE POLICY moderation_report_events_staff_read ON public.moderation_report_events FOR SELECT TO authenticated
USING (public.has_permission('content.moderate'::public.app_permission) OR public.has_permission('report.review'::public.app_permission));
REVOKE ALL ON public.moderation_report_events FROM anon, authenticated;
GRANT SELECT ON public.moderation_report_events TO authenticated;

DROP TRIGGER IF EXISTS enforcement_suspension_guard ON public.moderation_report_events;
CREATE TRIGGER enforcement_suspension_guard BEFORE INSERT OR UPDATE OR DELETE ON public.moderation_report_events
  FOR EACH STATEMENT EXECUTE FUNCTION public.enforcement_suspension_guard();

CREATE OR REPLACE FUNCTION public.moderation_claim(p_target_kind text, p_target_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_me uuid := public.current_profile_id(); v_n integer;
BEGIN
  IF NOT public.has_permission('content.moderate'::public.app_permission) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF public.moderation_is_conflicted(p_target_kind, p_target_id) THEN
    RAISE EXCEPTION 'conflict_of_interest' USING ERRCODE = '42501';
  END IF;
  WITH claimed AS (
    UPDATE public.reports SET claimed_by = v_me, claimed_at = now(), status = 'reviewed'
     WHERE coalesce(target_kind, 'user') = p_target_kind AND coalesce(target_id, reported_user_id) = p_target_id
       AND status IN ('pending', 'reviewed')
    RETURNING id
  )
  INSERT INTO public.moderation_report_events (report_id, event, status, moderator_profile_id)
  SELECT id, 'claimed', 'reviewed', v_me FROM claimed;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

CREATE OR REPLACE FUNCTION public.moderation_dismiss(p_target_kind text, p_target_id uuid, p_note text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_me uuid := public.current_profile_id(); v_n integer;
BEGIN
  IF NOT (public.has_permission('content.moderate'::public.app_permission) OR public.has_permission('report.review'::public.app_permission)) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF public.moderation_is_conflicted(p_target_kind, p_target_id) THEN
    RAISE EXCEPTION 'conflict_of_interest' USING ERRCODE = '42501';
  END IF;
  WITH dismissed AS (
    UPDATE public.reports
       SET status = 'dismissed', decision = 'dismissed', decided_by = v_me, resolved_at = now(),
           admin_notes = coalesce(nullif(btrim(p_note), ''), admin_notes)
     WHERE coalesce(target_kind, 'user') = p_target_kind AND coalesce(target_id, reported_user_id) = p_target_id
       AND status IN ('pending', 'reviewed')
    RETURNING id
  )
  INSERT INTO public.moderation_report_events (report_id, event, status, note, moderator_profile_id)
  SELECT id, 'dismissed', 'dismissed', nullif(btrim(p_note), ''), v_me FROM dismissed;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

CREATE OR REPLACE FUNCTION public.moderation_review_message_report(p_report_id uuid, p_status text, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_me uuid := public.current_profile_id(); r public.reports%ROWTYPE;
BEGIN
  IF NOT (public.has_permission('report.review'::public.app_permission) OR public.has_permission('content.moderate'::public.app_permission)) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('pending', 'reviewed', 'resolved', 'dismissed') THEN
    RAISE EXCEPTION 'invalid_status' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO r FROM public.reports WHERE id = p_report_id FOR UPDATE;
  IF NOT FOUND OR coalesce(r.report_context->>'source', '') NOT IN ('private_message', 'private_contact') THEN
    RAISE EXCEPTION 'report_not_found' USING ERRCODE = '22023';
  END IF;
  IF r.reporter_id = v_me OR r.reported_user_id = v_me THEN
    RAISE EXCEPTION 'conflict_of_interest' USING ERRCODE = '42501';
  END IF;
  UPDATE public.reports
     SET status = p_status,
         admin_notes = CASE WHEN p_note IS NULL THEN admin_notes ELSE nullif(btrim(p_note), '') END,
         resolved_at = CASE WHEN p_status IN ('resolved', 'dismissed') THEN now() END,
         decided_by = CASE WHEN p_status IN ('resolved', 'dismissed') THEN v_me END,
         decision = CASE WHEN p_status IN ('resolved', 'dismissed') THEN p_status END
   WHERE id = p_report_id;
  INSERT INTO public.moderation_report_events (report_id, event, status, note, moderator_profile_id)
  VALUES (p_report_id, CASE WHEN p_status = 'dismissed' THEN 'dismissed' ELSE 'status_changed' END, p_status,
          nullif(btrim(coalesce(p_note, '')), ''), v_me);
END;
$$;
