-- Trust & Safety baseline 2026-10-13, findings T8, T9 and T10 (docs/04-operations/trust-and-safety/trust-and-safety-baseline-2026-10-13.md).
-- T8  A moderator could claim or dismiss reports about their own content or profile, saw their own reports in the queue,
--     and report.review holders could update reports directly, bypassing the functions.
-- T9  Chat reports were inserted straight into reports with an excerpt the client supplied, so the excerpt could be made up,
--     and there was no de-duplication or self-check.
-- T10 Owners could overwrite verification files after submitting. Files can still be deleted by their owner (account
--     deletion and the right to erasure need it); a deleted file leaves the case without evidence, which a reviewer rejects.

-- ---- T8: conflicts of interest -----------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.moderation_is_conflicted(p_kind text, p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_me uuid := public.current_profile_id(); v_author uuid;
BEGIN
  IF v_me IS NULL THEN RETURN false; END IF;
  -- an unknown kind raises (fails closed) instead of skipping the author check
  v_author := public.moderation_target_author(p_kind, p_id);
  RETURN v_author = v_me
      OR EXISTS (SELECT 1 FROM public.reports r
                  WHERE coalesce(r.target_kind, 'user') = p_kind AND coalesce(r.target_id, r.reported_user_id) = p_id
                    AND r.status IN ('pending', 'reviewed')
                    AND (r.reporter_id = v_me OR r.reported_user_id = v_me));
END;
$$;
REVOKE ALL ON FUNCTION public.moderation_is_conflicted(text, uuid) FROM PUBLIC, anon, authenticated;

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
  UPDATE public.reports SET claimed_by = v_me, claimed_at = now(), status = 'reviewed'
   WHERE coalesce(target_kind, 'user') = p_target_kind AND coalesce(target_id, reported_user_id) = p_target_id
     AND status IN ('pending', 'reviewed');
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
  UPDATE public.reports
     SET status = 'dismissed', decision = 'dismissed', decided_by = v_me, resolved_at = now(),
         admin_notes = coalesce(nullif(btrim(p_note), ''), admin_notes)
   WHERE coalesce(target_kind, 'user') = p_target_kind AND coalesce(target_id, reported_user_id) = p_target_id
     AND status IN ('pending', 'reviewed');
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

-- The queue leaves out items the moderator wrote, is the subject of, or reported; another moderator takes them.
CREATE OR REPLACE FUNCTION public.moderation_queue()
RETURNS TABLE(target_kind text, target_id uuid, author_profile_id uuid, author_username text, excerpt text, report_count integer,
              reason_codes text[], first_reported_at timestamp with time zone, last_reported_at timestamp with time zone,
              claimed_by uuid, claimed_by_username text, report_ids uuid[])
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
       AND coalesce(r.report_context->>'source', '') NOT IN ('private_message', 'private_contact')
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
     AND NOT public.moderation_is_conflicted(o.kind, o.tid)
   GROUP BY o.kind, o.tid
   ORDER BY count(*) DESC, min(o.created_at);
END;
$$;

-- Reports change only through the functions: no direct inserts, updates or deletes by clients.
DROP POLICY IF EXISTS "Staff can update reports" ON public.reports;
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.reports FROM anon, authenticated;

-- Message and contact reports are reviewed in Settings > Messaging through this function.
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
END;
$$;
REVOKE ALL ON FUNCTION public.moderation_review_message_report(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderation_review_message_report(uuid, text, text) TO authenticated;

-- ---- T9: chat reports go through the server ----------------------------------------------------------------------------
-- The server checks membership and the message, takes the excerpt from the stored message when it is readable, and marks
-- an excerpt of an end-to-end encrypted message as supplied by the reporter (the server cannot read it).
CREATE OR REPLACE FUNCTION public.report_private_conversation(p_conversation_id uuid, p_message_id uuid, p_reason text, p_excerpt text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := public.current_profile_id();
  v_reason text := btrim(coalesce(p_reason, ''));
  v_reported uuid; v_msg public.private_messages%ROWTYPE; v_existing uuid; v_id uuid;
  v_excerpt text; v_excerpt_source text; v_context jsonb;
BEGIN
  IF v_me IS NULL OR NOT public.has_permission('report.create'::public.app_permission) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF length(v_reason) < 6 OR length(v_reason) > 2000 THEN
    RAISE EXCEPTION 'invalid_reason' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.private_conversation_members WHERE conversation_id = p_conversation_id AND profile_id = v_me) THEN
    RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501';
  END IF;

  IF p_message_id IS NOT NULL THEN
    SELECT * INTO v_msg FROM public.private_messages WHERE id = p_message_id AND conversation_id = p_conversation_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'message_not_found' USING ERRCODE = '22023'; END IF;
    IF v_msg.sender_id = v_me THEN RAISE EXCEPTION 'own_message' USING ERRCODE = '22023'; END IF;
    v_reported := v_msg.sender_id;
    IF v_msg.message_kind = 'plaintext' AND v_msg.content IS NOT NULL THEN
      v_excerpt := left(v_msg.content, 300); v_excerpt_source := 'server';
    ELSIF nullif(btrim(coalesce(p_excerpt, '')), '') IS NOT NULL THEN
      v_excerpt := left(btrim(p_excerpt), 300); v_excerpt_source := 'reporter';
    END IF;
  ELSE
    -- a contact report names one person: only a direct conversation with exactly one other member qualifies;
    -- in any other conversation the member reports a specific message instead
    IF NOT EXISTS (SELECT 1 FROM public.private_conversations WHERE id = p_conversation_id AND kind = 'direct')
       OR (SELECT count(*) FROM public.private_conversation_members WHERE conversation_id = p_conversation_id AND profile_id <> v_me) <> 1 THEN
      RAISE EXCEPTION 'report_a_message_instead' USING ERRCODE = '22023';
    END IF;
    SELECT m.profile_id INTO v_reported FROM public.private_conversation_members m
     WHERE m.conversation_id = p_conversation_id AND m.profile_id <> v_me;
  END IF;

  -- one open report per member and message (or contact)
  SELECT r.id INTO v_existing FROM public.reports r
   WHERE r.reporter_id = v_me AND r.status IN ('pending', 'reviewed')
     AND r.report_context->>'conversation_id' = p_conversation_id::text
     AND coalesce(r.report_context->>'message_id', '') = coalesce(p_message_id::text, '')
   LIMIT 1;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  v_context := jsonb_strip_nulls(jsonb_build_object(
    'source', CASE WHEN p_message_id IS NULL THEN 'private_contact' ELSE 'private_message' END,
    'conversation_id', p_conversation_id,
    'message_id', p_message_id,
    'message_created_at', v_msg.created_at,
    'message_sender_id', v_msg.sender_id,
    'message_excerpt', v_excerpt,
    'excerpt_source', v_excerpt_source));
  INSERT INTO public.reports (reporter_id, reported_user_id, reason, status, report_context)
  VALUES (v_me, v_reported, v_reason, 'pending', v_context)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.report_private_conversation(uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_private_conversation(uuid, uuid, text, text) TO authenticated;

-- ---- T10: submitted evidence cannot be overwritten ---------------------------------------------------------------------
-- Files sit at <profile_id>/<case_id>/<name>. The owner may add or replace them only while that case is a draft
-- (or has no case row yet).
CREATE OR REPLACE FUNCTION public.identity_verification_folder_writable(p_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_case text := split_part(p_name, '/', 2); v_status text;
BEGIN
  IF v_case !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RETURN true; END IF;
  SELECT status::text INTO v_status FROM public.identity_verification_cases WHERE id = v_case::uuid;
  RETURN v_status IS NULL OR v_status = 'draft';
END;
$$;
REVOKE ALL ON FUNCTION public.identity_verification_folder_writable(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.identity_verification_folder_writable(text) TO authenticated;

DROP POLICY IF EXISTS "Identity verification files insert own" ON storage.objects;
CREATE POLICY "Identity verification files insert own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'identity-verification'
  AND split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND split_part(name, '/', 1) = (public.current_profile_id())::text
  AND split_part(name, '/', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND public.identity_verification_folder_writable(name)
);

DROP POLICY IF EXISTS "Identity verification files update own" ON storage.objects;
CREATE POLICY "Identity verification files update own" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'identity-verification'
  AND split_part(name, '/', 1) = (public.current_profile_id())::text
  AND split_part(name, '/', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND public.identity_verification_folder_writable(name)
)
WITH CHECK (
  bucket_id = 'identity-verification'
  AND split_part(name, '/', 1) = (public.current_profile_id())::text
  AND split_part(name, '/', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND public.identity_verification_folder_writable(name)
);
