-- Moderation console support.
--
-- Reviewers (report.review) already read and update reports through RLS. This records who closed
-- each report, tells the reporter when it was handled, and lets a reviewer with post.moderate
-- remove a reported post and close the report in one step.

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reports_status_created ON public.reports (status, created_at DESC);

CREATE OR REPLACE FUNCTION public.stamp_report_review()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.reviewed_by := coalesce(public.current_profile_id(), NEW.reviewed_by);
    NEW.resolved_at := CASE WHEN NEW.status IN ('resolved', 'dismissed') THEN now() ELSE NULL END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stamp_report_review ON public.reports;
CREATE TRIGGER stamp_report_review
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.stamp_report_review();

-- The reporter learns the outcome, never who reviewed it.
CREATE OR REPLACE FUNCTION public.notify_report_reviewed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('resolved', 'dismissed') AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.notify_member(
      NEW.reporter_id, NULL, 'reports', 'report_' || NEW.status,
      CASE WHEN NEW.status = 'resolved'
        THEN 'Your report was reviewed and action was taken'
        ELSE 'Your report was reviewed; no action was needed' END,
      NULL, 'report', NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_report_reviewed ON public.reports;
CREATE TRIGGER notify_report_reviewed
  AFTER UPDATE OF status ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_report_reviewed();

CREATE OR REPLACE FUNCTION public.moderation_remove_reported_post(p_report_id uuid, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report public.reports;
  v_post_id uuid;
BEGIN
  IF NOT (public.has_permission('report.review'::public.app_permission)
    AND public.has_permission('post.moderate'::public.app_permission)) THEN
    RAISE EXCEPTION 'moderation_not_allowed' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_report FROM public.reports WHERE id = p_report_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'report_not_found' USING ERRCODE = 'P0002';
  END IF;

  BEGIN
    v_post_id := (v_report.report_context->>'post_id')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    v_post_id := NULL;
  END;
  IF v_post_id IS NULL THEN
    RAISE EXCEPTION 'report_has_no_post' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.posts WHERE id = v_post_id;

  UPDATE public.reports
  SET status = 'resolved',
      admin_notes = concat_ws(E'\n', nullif(trim(admin_notes), ''), 'Post removed.', nullif(trim(p_note), ''))
  WHERE id = p_report_id;
END;
$$;

REVOKE ALL ON FUNCTION public.stamp_report_review() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_report_reviewed() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.moderation_remove_reported_post(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderation_remove_reported_post(uuid, text) TO authenticated;
