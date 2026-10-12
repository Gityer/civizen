-- v2 plan step A6 (decision E2): members report any post, comment, Matter, Solutions comment, job listing or
-- profile; moderators of the Moderation and Conduct domain (content.moderate) work one queue, hide or dismiss with
-- a reason, and the author may appeal once to a different moderator. Hidden posts and comments disappear for
-- everyone except their author (who sees the reason) and moderators. A hidden public Matter becomes
-- participants-only and a hidden job listing is closed; the previous state is kept so an overturned appeal restores
-- it exactly. Profiles are not hidden here; conduct towards people goes through governance sanctions.

-- ---- reports: one model for every target ---------------------------------------------------------------
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS target_kind text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS target_id uuid;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS reason_code text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS claimed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS claimed_at timestamptz;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS decided_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS decision text;
CREATE INDEX IF NOT EXISTS reports_target_idx ON public.reports (target_kind, target_id) WHERE status IN ('pending', 'reviewed');

CREATE OR REPLACE FUNCTION public.moderation_reason_codes()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ARRAY['harassment', 'hate', 'violence', 'sexual', 'spam', 'misinformation', 'privacy', 'illegal', 'other'];
$$;

-- ---- hidden markers on posts and comments ------------------------------------------------------------
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS moderation_hidden_at timestamptz;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS moderation_reason text;
ALTER TABLE public.post_comments ADD COLUMN IF NOT EXISTS moderation_hidden_at timestamptz;
ALTER TABLE public.post_comments ADD COLUMN IF NOT EXISTS moderation_reason text;
ALTER TABLE public.matter_comments ADD COLUMN IF NOT EXISTS moderation_hidden_at timestamptz;
ALTER TABLE public.matter_comments ADD COLUMN IF NOT EXISTS moderation_reason text;
ALTER TABLE public.solution_comments ADD COLUMN IF NOT EXISTS moderation_hidden_at timestamptz;
ALTER TABLE public.solution_comments ADD COLUMN IF NOT EXISTS moderation_reason text;

DROP POLICY IF EXISTS posts_moderation_hidden ON public.posts;
CREATE POLICY posts_moderation_hidden ON public.posts AS RESTRICTIVE FOR SELECT
  USING (moderation_hidden_at IS NULL OR author_id = public.current_profile_id()
         OR public.has_permission('content.moderate'::public.app_permission));
DROP POLICY IF EXISTS post_comments_moderation_hidden ON public.post_comments;
CREATE POLICY post_comments_moderation_hidden ON public.post_comments AS RESTRICTIVE FOR SELECT
  USING (moderation_hidden_at IS NULL OR author_id = public.current_profile_id()
         OR public.has_permission('content.moderate'::public.app_permission));
DROP POLICY IF EXISTS matter_comments_moderation_hidden ON public.matter_comments;
CREATE POLICY matter_comments_moderation_hidden ON public.matter_comments AS RESTRICTIVE FOR SELECT
  USING (moderation_hidden_at IS NULL OR author_profile_id = public.current_profile_id()
         OR public.has_permission('content.moderate'::public.app_permission));
DROP POLICY IF EXISTS solution_comments_moderation_hidden ON public.solution_comments;
CREATE POLICY solution_comments_moderation_hidden ON public.solution_comments AS RESTRICTIVE FOR SELECT
  USING (moderation_hidden_at IS NULL OR author_id = public.current_profile_id()
         OR public.has_permission('content.moderate'::public.app_permission));

-- ---- moderation actions (the decision record, and the appeal) ------------------------------------------
CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_kind text NOT NULL,
  target_id uuid NOT NULL,
  author_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason_code text NOT NULL,
  note text,
  previous_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  moderator_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  restored_at timestamptz,
  restored_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  appeal_text text,
  appealed_at timestamptz,
  appeal_reviewer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  appeal_decision text CHECK (appeal_decision IN ('upheld', 'overturned')),
  appeal_note text,
  appeal_decided_at timestamptz
);
CREATE INDEX IF NOT EXISTS moderation_actions_author_idx ON public.moderation_actions (author_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS moderation_actions_target_idx ON public.moderation_actions (target_kind, target_id);
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.moderation_actions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.moderation_actions TO authenticated;
DROP POLICY IF EXISTS moderation_actions_read ON public.moderation_actions;
CREATE POLICY moderation_actions_read ON public.moderation_actions FOR SELECT TO authenticated
  USING (author_profile_id = public.current_profile_id()
         OR public.has_permission('content.moderate'::public.app_permission));

-- ---- helpers -------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.moderation_target_author(p_kind text, p_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v uuid;
BEGIN
  CASE p_kind
    WHEN 'post' THEN SELECT author_id INTO v FROM public.posts WHERE id = p_id;
    WHEN 'post_comment' THEN SELECT author_id INTO v FROM public.post_comments WHERE id = p_id;
    WHEN 'matter' THEN SELECT coalesce(created_by_profile_id, initiator_profile_id) INTO v FROM public.matters WHERE id = p_id;
    WHEN 'matter_comment' THEN SELECT author_profile_id INTO v FROM public.matter_comments WHERE id = p_id;
    WHEN 'solution_comment' THEN SELECT author_id INTO v FROM public.solution_comments WHERE id = p_id;
    WHEN 'job_listing' THEN SELECT profile_id INTO v FROM public.market_job_interests WHERE id = p_id;
    WHEN 'user' THEN SELECT id INTO v FROM public.profiles WHERE id = p_id AND deleted_at IS NULL;
    ELSE RAISE EXCEPTION 'unknown_target_kind' USING ERRCODE = '22023';
  END CASE;
  RETURN v;
END;
$$;
REVOKE ALL ON FUNCTION public.moderation_target_author(text, uuid) FROM PUBLIC, anon, authenticated;

-- A short excerpt for the queue (moderators only).
CREATE OR REPLACE FUNCTION public.moderation_target_excerpt(p_kind text, p_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v text;
BEGIN
  CASE p_kind
    WHEN 'post' THEN SELECT content INTO v FROM public.posts WHERE id = p_id;
    WHEN 'post_comment' THEN SELECT content INTO v FROM public.post_comments WHERE id = p_id;
    WHEN 'matter' THEN SELECT title || ' — ' || coalesce(description, '') INTO v FROM public.matters WHERE id = p_id;
    WHEN 'matter_comment' THEN SELECT body INTO v FROM public.matter_comments WHERE id = p_id;
    WHEN 'solution_comment' THEN SELECT body INTO v FROM public.solution_comments WHERE id = p_id;
    WHEN 'job_listing' THEN SELECT array_to_string(job_types, ', ') || ' — ' || coalesce(notes, '') INTO v FROM public.market_job_interests WHERE id = p_id;
    WHEN 'user' THEN SELECT coalesce(full_name, username) INTO v FROM public.profiles WHERE id = p_id;
    ELSE v := NULL;
  END CASE;
  RETURN left(regexp_replace(coalesce(v, ''), '<[^>]+>', ' ', 'g'), 280);
END;
$$;
REVOKE ALL ON FUNCTION public.moderation_target_excerpt(text, uuid) FROM PUBLIC, anon, authenticated;

-- The stored title/body are the English fallback; clients render notificationTypes.<type> in the reader's language.
CREATE OR REPLACE FUNCTION public.moderation_notify(p_profile uuid, p_type text, p_title text, p_body text, p_action uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.user_notifications (recipient_profile_id, notification_type, title, body, entity_type, entity_id, metadata)
  SELECT p_profile, p_type, p_title, p_body, 'moderation_action', p_action, '{}'::jsonb
  WHERE p_profile IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.moderation_notify(uuid, text, text, text, uuid) FROM PUBLIC, anon, authenticated;

-- Applies or reverts the hidden state of a target. Returns the state needed to revert.
CREATE OR REPLACE FUNCTION public.moderation_apply_hidden(p_kind text, p_id uuid, p_hidden boolean, p_reason text, p_previous jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_prev jsonb := '{}'::jsonb;
BEGIN
  CASE p_kind
    WHEN 'post' THEN UPDATE public.posts SET moderation_hidden_at = CASE WHEN p_hidden THEN now() END, moderation_reason = CASE WHEN p_hidden THEN p_reason END WHERE id = p_id;
    WHEN 'post_comment' THEN UPDATE public.post_comments SET moderation_hidden_at = CASE WHEN p_hidden THEN now() END, moderation_reason = CASE WHEN p_hidden THEN p_reason END WHERE id = p_id;
    WHEN 'matter_comment' THEN UPDATE public.matter_comments SET moderation_hidden_at = CASE WHEN p_hidden THEN now() END, moderation_reason = CASE WHEN p_hidden THEN p_reason END WHERE id = p_id;
    WHEN 'solution_comment' THEN UPDATE public.solution_comments SET moderation_hidden_at = CASE WHEN p_hidden THEN now() END, moderation_reason = CASE WHEN p_hidden THEN p_reason END WHERE id = p_id;
    WHEN 'matter' THEN
      IF p_hidden THEN
        SELECT jsonb_build_object('visibility', visibility) INTO v_prev FROM public.matters WHERE id = p_id;
        UPDATE public.matters SET visibility = 'participants' WHERE id = p_id;
      ELSE
        UPDATE public.matters SET visibility = coalesce(p_previous->>'visibility', visibility) WHERE id = p_id;
      END IF;
    WHEN 'job_listing' THEN
      IF p_hidden THEN
        SELECT jsonb_build_object('status', status) INTO v_prev FROM public.market_job_interests WHERE id = p_id;
        UPDATE public.market_job_interests SET status = 'closed' WHERE id = p_id;
      ELSE
        UPDATE public.market_job_interests SET status = coalesce(p_previous->>'status', status) WHERE id = p_id;
      END IF;
    ELSE RAISE EXCEPTION 'target_not_hideable' USING ERRCODE = '22023';
  END CASE;
  RETURN coalesce(v_prev, '{}'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.moderation_apply_hidden(text, uuid, boolean, text, jsonb) FROM PUBLIC, anon, authenticated;

-- ---- member: report ------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.report_content(p_target_kind text, p_target_id uuid, p_reason_code text, p_details text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := public.current_profile_id();
  v_author uuid;
  v_id uuid;
BEGIN
  IF v_me IS NULL OR NOT public.has_permission('report.create'::public.app_permission) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF NOT (p_reason_code = ANY (public.moderation_reason_codes())) THEN
    RAISE EXCEPTION 'unknown_reason' USING ERRCODE = '22023';
  END IF;
  v_author := public.moderation_target_author(p_target_kind, p_target_id);
  IF v_author IS NULL AND p_target_kind <> 'job_listing' THEN
    RAISE EXCEPTION 'target_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_author = v_me THEN
    RAISE EXCEPTION 'cannot_report_own_content' USING ERRCODE = '22023';
  END IF;
  SELECT id INTO v_id FROM public.reports
   WHERE reporter_id = v_me AND target_kind = p_target_kind AND target_id = p_target_id AND status IN ('pending', 'reviewed')
   LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;
  INSERT INTO public.reports (reporter_id, reported_user_id, reason, reason_code, target_kind, target_id, status, report_context)
  VALUES (v_me, v_author, coalesce(nullif(btrim(left(p_details, 2000)), ''), p_reason_code), p_reason_code, p_target_kind, p_target_id,
          'pending', jsonb_build_object('source', 'report_content'))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.report_content(text, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_content(text, uuid, text, text) TO authenticated;

-- ---- moderators: queue, claim, decide ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.moderation_queue()
RETURNS TABLE (
  target_kind text, target_id uuid, author_profile_id uuid, author_username text, excerpt text,
  report_count integer, reason_codes text[], first_reported_at timestamptz, last_reported_at timestamptz,
  claimed_by uuid, claimed_by_username text, report_ids uuid[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_permission('content.moderate'::public.app_permission) OR public.has_permission('report.review'::public.app_permission)) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  WITH open AS (
    SELECT r.*, coalesce(r.target_kind, 'user') AS kind, coalesce(r.target_id, r.reported_user_id) AS tid
      FROM public.reports r
     WHERE r.status IN ('pending', 'reviewed')
       -- message reports keep their conversation context in Settings > Messaging
       AND coalesce(r.report_context->>'source', '') <> 'private_message'
  )
  SELECT o.kind, o.tid, max(o.reported_user_id::text)::uuid, max(p.username),
         public.moderation_target_excerpt(o.kind, o.tid),
         count(*)::integer, array_agg(DISTINCT coalesce(o.reason_code, 'other')),
         min(o.created_at), max(o.created_at),
         max(o.claimed_by::text)::uuid, max(c.username), array_agg(o.id)
    FROM open o
    LEFT JOIN public.profiles p ON p.id = o.reported_user_id
    LEFT JOIN public.profiles c ON c.id = o.claimed_by
   WHERE o.tid IS NOT NULL
   GROUP BY o.kind, o.tid
   ORDER BY count(*) DESC, min(o.created_at);
END;
$$;
REVOKE ALL ON FUNCTION public.moderation_queue() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderation_queue() TO authenticated;

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
  UPDATE public.reports SET claimed_by = v_me, claimed_at = now(), status = 'reviewed'
   WHERE coalesce(target_kind, 'user') = p_target_kind AND coalesce(target_id, reported_user_id) = p_target_id
     AND status IN ('pending', 'reviewed');
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;
REVOKE ALL ON FUNCTION public.moderation_claim(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderation_claim(text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.moderation_hide(p_target_kind text, p_target_id uuid, p_reason_code text, p_note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := public.current_profile_id();
  v_author uuid;
  v_prev jsonb;
  v_action uuid;
BEGIN
  IF NOT public.has_permission('content.moderate'::public.app_permission) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF NOT (p_reason_code = ANY (public.moderation_reason_codes())) THEN
    RAISE EXCEPTION 'unknown_reason' USING ERRCODE = '22023';
  END IF;
  IF p_target_kind = 'user' THEN
    RAISE EXCEPTION 'use_sanctions_for_people' USING ERRCODE = '22023';
  END IF;
  v_author := public.moderation_target_author(p_target_kind, p_target_id);
  IF v_author IS NOT NULL AND v_author = v_me THEN
    RAISE EXCEPTION 'cannot_moderate_own_content' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.moderation_actions WHERE target_kind = p_target_kind AND target_id = p_target_id AND restored_at IS NULL) THEN
    RAISE EXCEPTION 'already_hidden' USING ERRCODE = '22023';
  END IF;
  v_prev := public.moderation_apply_hidden(p_target_kind, p_target_id, true, p_reason_code, NULL);
  INSERT INTO public.moderation_actions (target_kind, target_id, author_profile_id, reason_code, note, previous_state, moderator_profile_id)
  VALUES (p_target_kind, p_target_id, v_author, p_reason_code, nullif(btrim(p_note), ''), v_prev, v_me)
  RETURNING id INTO v_action;
  UPDATE public.reports SET status = 'resolved', decision = 'hidden', decided_by = v_me, resolved_at = now()
   WHERE target_kind = p_target_kind AND target_id = p_target_id AND status IN ('pending', 'reviewed');
  PERFORM public.moderation_notify(v_author, 'moderation_hidden', 'Your content was hidden by moderation',
    'Open Moderation to see the reason. You can appeal once; a different moderator will review it.', v_action);
  RETURN v_action;
END;
$$;
REVOKE ALL ON FUNCTION public.moderation_hide(text, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderation_hide(text, uuid, text, text) TO authenticated;

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
  UPDATE public.reports
     SET status = 'dismissed', decision = 'dismissed', decided_by = v_me, resolved_at = now(),
         admin_notes = coalesce(nullif(btrim(p_note), ''), admin_notes)
   WHERE coalesce(target_kind, 'user') = p_target_kind AND coalesce(target_id, reported_user_id) = p_target_id
     AND status IN ('pending', 'reviewed');
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;
REVOKE ALL ON FUNCTION public.moderation_dismiss(text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderation_dismiss(text, uuid, text) TO authenticated;

-- ---- author: appeal once; a different moderator decides -----------------------------------------------
CREATE OR REPLACE FUNCTION public.moderation_appeal(p_action_id uuid, p_text text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_me uuid := public.current_profile_id(); v_row public.moderation_actions%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.moderation_actions WHERE id = p_action_id FOR UPDATE;
  IF NOT FOUND OR v_row.author_profile_id IS DISTINCT FROM v_me THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF v_row.appealed_at IS NOT NULL THEN RAISE EXCEPTION 'already_appealed' USING ERRCODE = '22023'; END IF;
  IF v_row.restored_at IS NOT NULL THEN RAISE EXCEPTION 'already_restored' USING ERRCODE = '22023'; END IF;
  IF nullif(btrim(p_text), '') IS NULL THEN RAISE EXCEPTION 'appeal_text_required' USING ERRCODE = '22023'; END IF;
  UPDATE public.moderation_actions SET appeal_text = left(btrim(p_text), 2000), appealed_at = now() WHERE id = p_action_id;
END;
$$;
REVOKE ALL ON FUNCTION public.moderation_appeal(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderation_appeal(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.moderation_decide_appeal(p_action_id uuid, p_overturn boolean, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_me uuid := public.current_profile_id(); v_row public.moderation_actions%ROWTYPE;
BEGIN
  IF NOT public.has_permission('content.moderate'::public.app_permission) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_row FROM public.moderation_actions WHERE id = p_action_id FOR UPDATE;
  IF NOT FOUND OR v_row.appealed_at IS NULL OR v_row.appeal_decided_at IS NOT NULL THEN
    RAISE EXCEPTION 'no_open_appeal' USING ERRCODE = '22023';
  END IF;
  IF v_row.moderator_profile_id = v_me THEN
    RAISE EXCEPTION 'appeal_needs_another_moderator' USING ERRCODE = '42501';
  END IF;
  IF v_row.author_profile_id = v_me THEN
    RAISE EXCEPTION 'cannot_decide_own_appeal' USING ERRCODE = '42501';
  END IF;
  IF p_overturn THEN
    PERFORM public.moderation_apply_hidden(v_row.target_kind, v_row.target_id, false, NULL, v_row.previous_state);
  END IF;
  UPDATE public.moderation_actions
     SET appeal_reviewer_id = v_me, appeal_decision = CASE WHEN p_overturn THEN 'overturned' ELSE 'upheld' END,
         appeal_note = nullif(btrim(p_note), ''), appeal_decided_at = now(),
         restored_at = CASE WHEN p_overturn THEN now() END, restored_by = CASE WHEN p_overturn THEN v_me END
   WHERE id = p_action_id;
  PERFORM public.moderation_notify(v_row.author_profile_id,
    CASE WHEN p_overturn THEN 'moderation_appeal_overturned' ELSE 'moderation_appeal_upheld' END,
    CASE WHEN p_overturn THEN 'Your appeal was accepted' ELSE 'Your appeal was reviewed' END,
    CASE WHEN p_overturn THEN 'Your content is visible again.' ELSE 'A second moderator kept the decision.' END, p_action_id);
END;
$$;
REVOKE ALL ON FUNCTION public.moderation_decide_appeal(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderation_decide_appeal(uuid, boolean, text) TO authenticated;

-- Moderation actions with a readable excerpt: the author sees their own, moderators see all (appeals first).
CREATE OR REPLACE FUNCTION public.moderation_actions_list(p_scope text DEFAULT 'mine')
RETURNS TABLE (
  id uuid, target_kind text, target_id uuid, excerpt text, reason_code text, note text, created_at timestamptz,
  moderator_profile_id uuid, author_profile_id uuid, author_username text, restored_at timestamptz,
  appeal_text text, appealed_at timestamptz, appeal_decision text, appeal_note text, appeal_decided_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_me uuid := public.current_profile_id();
BEGIN
  IF p_scope = 'appeals' AND NOT public.has_permission('content.moderate'::public.app_permission) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT a.id, a.target_kind, a.target_id, public.moderation_target_excerpt(a.target_kind, a.target_id), a.reason_code,
         CASE WHEN p_scope = 'appeals' OR a.author_profile_id = v_me THEN a.note END, a.created_at,
         CASE WHEN p_scope = 'appeals' THEN a.moderator_profile_id END, a.author_profile_id, p.username, a.restored_at,
         a.appeal_text, a.appealed_at, a.appeal_decision, a.appeal_note, a.appeal_decided_at
    FROM public.moderation_actions a
    LEFT JOIN public.profiles p ON p.id = a.author_profile_id
   WHERE (p_scope = 'mine' AND a.author_profile_id = v_me)
      OR (p_scope = 'appeals' AND a.appealed_at IS NOT NULL AND a.appeal_decided_at IS NULL)
   ORDER BY a.created_at DESC
   LIMIT 200;
END;
$$;
REVOKE ALL ON FUNCTION public.moderation_actions_list(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderation_actions_list(text) TO authenticated;

NOTIFY pgrst, 'reload schema';
