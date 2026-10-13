-- v2 plan step C1: identity verification case management.
-- Reviewers of the Identity Verification domain (not only staff) can review; cases get claim/release,
-- reason codes, "request more information", internal notes and a history; the queue carries age and
-- assignment so the 48-hour target (decision E7) can be watched. Also fixes resubmission after a
-- rejection or revocation, which the A7 guard blocked.

-- 1. Who may review: staff or a member of the Identity Verification domain, never while blocked.
CREATE OR REPLACE FUNCTION public.can_review_identity_verification_storage()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.current_profile_id() IS NOT NULL
    AND NOT public.current_profile_has_governance_block('verification_review'::public.governance_block_scope)
    AND (
      public.has_permission('role.assign'::public.app_permission)
      OR public.has_permission('settings.manage'::public.app_permission)
      OR public.current_profile_in_governance_domain(ARRAY['identity_verification'])
    );
$$;
REVOKE ALL ON FUNCTION public.can_review_identity_verification_storage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_review_identity_verification_storage() TO authenticated;

DROP POLICY IF EXISTS "Identity verification artifacts are readable by owner or admins" ON public.identity_verification_artifacts;
CREATE POLICY "Identity verification artifacts are readable by owner or admins" ON public.identity_verification_artifacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.identity_verification_cases verification_case
      WHERE verification_case.id = identity_verification_artifacts.case_id
        AND (verification_case.profile_id = public.current_profile_id() OR public.can_review_identity_verification_storage())
    )
  );

-- 2. Reason codes shared by rejections and information requests.
CREATE OR REPLACE FUNCTION public.identity_verification_reason_code_valid(p_code text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_code IN (
    'document_unreadable', 'document_expired', 'document_missing', 'selfie_unclear', 'selfie_mismatch',
    'details_mismatch', 'underage', 'duplicate_identity', 'other'
  );
$$;

-- 3. Case history: who did what, with internal notes. Reviewers read it; the member does not.
CREATE TABLE IF NOT EXISTS public.identity_verification_case_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.identity_verification_cases(id) ON DELETE CASCADE,
  actor_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN (
    'submitted', 'resubmitted', 'assigned', 'released', 'info_requested', 'approved', 'rejected',
    'duplicate_flagged', 'note'
  )),
  reason_code text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS identity_verification_case_events_case_idx
  ON public.identity_verification_case_events (case_id, created_at);
ALTER TABLE public.identity_verification_case_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.identity_verification_case_events FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS identity_verification_case_events_reviewers ON public.identity_verification_case_events;
CREATE POLICY identity_verification_case_events_reviewers ON public.identity_verification_case_events
  FOR SELECT USING (public.can_review_identity_verification_storage());
GRANT SELECT ON public.identity_verification_case_events TO authenticated;

CREATE OR REPLACE FUNCTION public.identity_verification_log_event(
  p_case_id uuid, p_kind text, p_reason_code text DEFAULT NULL, p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.identity_verification_case_events (case_id, actor_profile_id, kind, reason_code, note)
  VALUES (p_case_id, public.current_profile_id(), p_kind, p_reason_code, nullif(trim(coalesce(p_note, '')), ''));
$$;
REVOKE ALL ON FUNCTION public.identity_verification_log_event(uuid, text, text, text) FROM PUBLIC, anon, authenticated;

-- Shared checks for reviewer actions on an open case. Returns the locked row.
CREATE OR REPLACE FUNCTION public.identity_verification_lock_open_case(p_case_id uuid)
RETURNS public.identity_verification_cases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case public.identity_verification_cases%ROWTYPE;
BEGIN
  IF public.current_profile_id() IS NULL OR NOT public.can_review_identity_verification_storage() THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_case FROM public.identity_verification_cases WHERE id = p_case_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'case_not_found'; END IF;
  IF v_case.status NOT IN ('submitted', 'in_review') THEN RAISE EXCEPTION 'case_not_reviewable'; END IF;
  IF public.profiles_are_linked(v_case.profile_id, public.current_profile_id()) THEN
    RAISE EXCEPTION 'cannot_review_own_case' USING ERRCODE = '42501';
  END IF;
  RETURN v_case;
END;
$$;
REVOKE ALL ON FUNCTION public.identity_verification_lock_open_case(uuid) FROM PUBLIC, anon, authenticated;

-- 4. Claim (or assign to another reviewer) and release.
CREATE OR REPLACE FUNCTION public.assign_identity_verification_case(p_case_id uuid, p_reviewer_profile_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_reviewer uuid := coalesce(p_reviewer_profile_id, public.current_profile_id());
  v_case public.identity_verification_cases%ROWTYPE;
BEGIN
  v_case := public.identity_verification_lock_open_case(p_case_id);
  IF public.profiles_are_linked(v_case.profile_id, v_reviewer) THEN
    RAISE EXCEPTION 'cannot_review_own_case' USING ERRCODE = '42501';
  END IF;
  UPDATE public.identity_verification_cases
  SET status = 'in_review',
      last_reviewed_by = v_reviewer,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('assigned_to', v_reviewer, 'assigned_at', now(), 'assigned_by', v_self)
  WHERE id = p_case_id;
  PERFORM public.identity_verification_log_event(p_case_id, 'assigned', NULL,
    CASE WHEN v_reviewer <> v_self THEN 'assigned_to:' || v_reviewer::text END);
  RETURN jsonb_build_object('case_id', p_case_id, 'status', 'in_review', 'assigned_to', v_reviewer);
END;
$$;
REVOKE ALL ON FUNCTION public.assign_identity_verification_case(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_identity_verification_case(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.release_identity_verification_case(p_case_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.identity_verification_lock_open_case(p_case_id);
  UPDATE public.identity_verification_cases
  SET status = 'submitted',
      metadata = (coalesce(metadata, '{}'::jsonb) - 'assigned_to' - 'assigned_at' - 'assigned_by')
  WHERE id = p_case_id;
  PERFORM public.identity_verification_log_event(p_case_id, 'released');
  RETURN jsonb_build_object('case_id', p_case_id, 'status', 'submitted');
END;
$$;
REVOKE ALL ON FUNCTION public.release_identity_verification_case(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_identity_verification_case(uuid) TO authenticated;

-- 5. Decide with a reason code. A rejection needs a reason code; the member sees the code and message.
DROP FUNCTION IF EXISTS public.decide_identity_verification_case(uuid, text, text);
CREATE OR REPLACE FUNCTION public.decide_identity_verification_case(
  p_case_id uuid, p_decision text, p_notes text DEFAULT NULL, p_reason_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case public.identity_verification_cases%ROWTYPE;
  v_decision text := lower(trim(coalesce(p_decision, '')));
  v_reason text := nullif(trim(coalesce(p_reason_code, '')), '');
  v_message text := nullif(trim(coalesce(p_notes, '')), '');
  v_duplicate uuid;
BEGIN
  IF v_decision NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'invalid_decision'; END IF;
  IF v_decision = 'rejected' AND (v_reason IS NULL OR NOT public.identity_verification_reason_code_valid(v_reason)) THEN
    RAISE EXCEPTION 'reason_code_required';
  END IF;
  v_case := public.identity_verification_lock_open_case(p_case_id);
  IF v_decision = 'approved' THEN
    v_duplicate := public.identity_verification_duplicate_of(p_case_id);
    IF v_duplicate IS NOT NULL THEN
      UPDATE public.identity_verification_cases
      SET discrepancy_flags = array_append(array_remove(coalesce(discrepancy_flags, '{}'), 'duplicate_identity'), 'duplicate_identity'),
          metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('duplicate_of_profile_id', v_duplicate, 'duplicate_flagged_at', now())
      WHERE id = p_case_id;
      PERFORM public.identity_verification_log_event(p_case_id, 'duplicate_flagged', 'duplicate_identity');
      RETURN jsonb_build_object('case_id', p_case_id, 'status', 'duplicate_identity', 'duplicate_of_profile_id', v_duplicate);
    END IF;
  END IF;
  UPDATE public.identity_verification_cases
  SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'last_decision', jsonb_build_object('kind', v_decision, 'reason_code', v_reason, 'message', v_message, 'at', now())
  )
  WHERE id = p_case_id;
  INSERT INTO public.identity_verification_reviews (case_id, reviewer_id, decision, notes)
  VALUES (p_case_id, public.current_profile_id(), v_decision::public.identity_verification_decision, v_message);
  PERFORM public.identity_verification_log_event(p_case_id, v_decision, v_reason, v_message);
  PERFORM public.civic_notify_profiles(
    ARRAY[v_case.profile_id],
    CASE WHEN v_decision = 'approved' THEN 'verification_approved' ELSE 'verification_rejected' END,
    CASE WHEN v_decision = 'approved' THEN 'Your identity is verified' ELSE 'Your verification needs another look' END,
    CASE WHEN v_decision = 'approved' THEN 'Reviewers approved your identity verification.' ELSE 'Reviewers could not approve your verification yet. Open profile settings to see what to redo.' END,
    'profile', v_case.profile_id, jsonb_build_object('reason_code', v_reason)
  );
  RETURN jsonb_build_object('case_id', p_case_id, 'status', v_decision);
END;
$$;
REVOKE ALL ON FUNCTION public.decide_identity_verification_case(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_identity_verification_case(uuid, text, text, text) TO authenticated;

-- 6. Ask the member for more information: the case goes back to draft so they can fix and resubmit.
CREATE OR REPLACE FUNCTION public.request_identity_verification_info(p_case_id uuid, p_reason_code text, p_message text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case public.identity_verification_cases%ROWTYPE;
  v_reason text := nullif(trim(coalesce(p_reason_code, '')), '');
  v_message text := nullif(trim(coalesce(p_message, '')), '');
  v_request jsonb;
BEGIN
  IF v_reason IS NULL OR NOT public.identity_verification_reason_code_valid(v_reason) THEN RAISE EXCEPTION 'reason_code_required'; END IF;
  IF v_message IS NULL OR char_length(v_message) < 5 THEN RAISE EXCEPTION 'message_required'; END IF;
  v_case := public.identity_verification_lock_open_case(p_case_id);
  v_request := jsonb_build_object('kind', 'info_requested', 'reason_code', v_reason, 'message', v_message, 'at', now());
  UPDATE public.identity_verification_cases
  SET status = 'draft',
      metadata = (coalesce(metadata, '{}'::jsonb) - 'assigned_to' - 'assigned_at' - 'assigned_by')
        || jsonb_build_object(
          'last_decision', v_request,
          'info_requests', coalesce(metadata -> 'info_requests', '[]'::jsonb) || jsonb_build_array(v_request)
        )
  WHERE id = p_case_id;
  PERFORM public.identity_verification_log_event(p_case_id, 'info_requested', v_reason, v_message);
  PERFORM public.civic_notify_profiles(
    ARRAY[v_case.profile_id], 'verification_info_requested', 'Your verification needs more information',
    'A reviewer asked for more information. Open profile settings to see what to add, then submit again.',
    'profile', v_case.profile_id, jsonb_build_object('reason_code', v_reason)
  );
  RETURN jsonb_build_object('case_id', p_case_id, 'status', 'draft');
END;
$$;
REVOKE ALL ON FUNCTION public.request_identity_verification_info(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_identity_verification_info(uuid, text, text) TO authenticated;

-- 7. Internal notes (not shown to the member).
CREATE OR REPLACE FUNCTION public.add_identity_verification_case_note(p_case_id uuid, p_note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF char_length(trim(coalesce(p_note, ''))) < 2 THEN RAISE EXCEPTION 'note_required'; END IF;
  PERFORM public.identity_verification_lock_open_case(p_case_id);
  PERFORM public.identity_verification_log_event(p_case_id, 'note', NULL, left(trim(p_note), 2000));
END;
$$;
REVOKE ALL ON FUNCTION public.add_identity_verification_case_note(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_identity_verification_case_note(uuid, text) TO authenticated;

-- 8. The reviewer queue: open cases, oldest first, with age and assignment.
CREATE OR REPLACE FUNCTION public.identity_verification_queue()
RETURNS TABLE (
  case_id uuid,
  profile_id uuid,
  username text,
  full_name text,
  country text,
  status text,
  submitted_at timestamptz,
  age_hours numeric,
  assigned_to uuid,
  assigned_username text,
  info_request_count integer,
  resubmission boolean,
  note_count integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_review_identity_verification_storage() THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT
    c.id, c.profile_id, p.username::text, p.full_name::text, p.country::text, c.status::text, c.submitted_at,
    round(extract(epoch FROM (now() - coalesce(c.submitted_at, c.created_at))) / 3600.0, 1),
    (c.metadata ->> 'assigned_to')::uuid,
    ap.username::text,
    coalesce(jsonb_array_length(c.metadata -> 'info_requests'), 0),
    EXISTS (SELECT 1 FROM public.identity_verification_case_events e WHERE e.case_id = c.id AND e.kind = 'resubmitted'),
    (SELECT count(*)::integer FROM public.identity_verification_case_events e WHERE e.case_id = c.id AND e.kind = 'note')
  FROM public.identity_verification_cases c
  JOIN public.profiles p ON p.id = c.profile_id
  LEFT JOIN public.profiles ap ON ap.id = (c.metadata ->> 'assigned_to')::uuid
  WHERE c.status IN ('submitted', 'in_review')
    AND NOT public.profiles_are_linked(c.profile_id, public.current_profile_id())
  ORDER BY coalesce(c.submitted_at, c.created_at) ASC;
END;
$$;
REVOKE ALL ON FUNCTION public.identity_verification_queue() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.identity_verification_queue() TO authenticated;

CREATE OR REPLACE FUNCTION public.identity_verification_case_history(p_case_id uuid)
RETURNS TABLE (id uuid, kind text, reason_code text, note text, actor_username text, created_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_review_identity_verification_storage() THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT e.id, e.kind, e.reason_code, e.note, p.username::text, e.created_at
  FROM public.identity_verification_case_events e
  JOIN public.identity_verification_cases c ON c.id = e.case_id
  LEFT JOIN public.profiles p ON p.id = e.actor_profile_id
  WHERE e.case_id = p_case_id
    AND NOT public.profiles_are_linked(c.profile_id, public.current_profile_id())
  ORDER BY e.created_at ASC;
END;
$$;
REVOKE ALL ON FUNCTION public.identity_verification_case_history(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.identity_verification_case_history(uuid) TO authenticated;

-- 9. Owner guard: a member may submit again after a rejection, revocation or information request.
CREATE OR REPLACE FUNCTION public.guard_identity_verification_case_owner_writes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_direct_client boolean := current_user IN ('authenticated', 'anon');
  v_own boolean;
  v_reviewer boolean;
  v_owner_editable public.identity_verification_case_status[] := ARRAY[
    'draft', 'submitted', 'rejected', 'revoked'
  ]::public.identity_verification_case_status[];
BEGIN
  IF NOT v_direct_client THEN
    RETURN NEW;
  END IF;
  v_own := public.is_own_or_linked_profile(coalesce(NEW.profile_id, OLD.profile_id));
  v_reviewer := NOT v_own AND public.can_review_identity_verification_storage();

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft'::public.identity_verification_case_status THEN
      RAISE EXCEPTION 'verification_case_owner_status_forbidden' USING ERRCODE = '42501';
    END IF;
    NEW.reviewed_at := NULL;
    NEW.resolved_at := NULL;
    NEW.last_reviewed_by := NULL;
    NEW.discrepancy_flags := '{}'::text[];
    RETURN NEW;
  END IF;

  -- Status moves only through the review functions, except the owner submitting their own case
  -- (first time, or again after a rejection, revocation or information request).
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT (v_own AND OLD.status IN ('draft', 'rejected', 'revoked')
              AND NEW.status = 'submitted'::public.identity_verification_case_status) THEN
    RAISE EXCEPTION 'verification_case_status_changes_through_review_only' USING ERRCODE = '42501';
  END IF;

  IF v_reviewer THEN
    RETURN NEW;
  END IF;

  IF NOT (OLD.status = ANY (v_owner_editable)) THEN
    RAISE EXCEPTION 'verification_case_locked_for_owner' USING ERRCODE = '42501';
  END IF;
  IF NEW.profile_id IS DISTINCT FROM OLD.profile_id
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
     OR NEW.resolved_at IS DISTINCT FROM OLD.resolved_at
     OR NEW.last_reviewed_by IS DISTINCT FROM OLD.last_reviewed_by
     OR NEW.discrepancy_flags IS DISTINCT FROM OLD.discrepancy_flags
     OR (NEW.metadata -> 'last_decision') IS DISTINCT FROM (OLD.metadata -> 'last_decision')
     OR (NEW.metadata -> 'info_requests') IS DISTINCT FROM (OLD.metadata -> 'info_requests')
     OR (NEW.metadata -> 'assigned_to') IS DISTINCT FROM (OLD.metadata -> 'assigned_to') THEN
    RAISE EXCEPTION 'verification_case_reviewer_fields_forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

-- 10. Record submissions in the history (first submission or resubmission).
CREATE OR REPLACE FUNCTION public.log_identity_verification_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'submitted' AND OLD.status IS DISTINCT FROM NEW.status AND OLD.status <> 'in_review' THEN
    INSERT INTO public.identity_verification_case_events (case_id, actor_profile_id, kind)
    VALUES (
      NEW.id, NEW.profile_id,
      CASE WHEN OLD.status IN ('rejected', 'revoked')
             OR EXISTS (SELECT 1 FROM public.identity_verification_case_events e WHERE e.case_id = NEW.id)
           THEN 'resubmitted' ELSE 'submitted' END
    );
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.log_identity_verification_submission() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS log_identity_verification_submission ON public.identity_verification_cases;
CREATE TRIGGER log_identity_verification_submission
  AFTER UPDATE OF status ON public.identity_verification_cases
  FOR EACH ROW EXECUTE FUNCTION public.log_identity_verification_submission();
