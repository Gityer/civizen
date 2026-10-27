-- Enforcement steps for members (PM decision TD2, Trust & Safety baseline 3.2): moderators could hide content but
-- not act on a person, so repeated conduct could not be stopped. The ladder:
--   note → warning → content restriction (cannot post or comment; 7 days) → messaging restriction (cannot start
--   conversations; 7 days) → suspension (cannot sign in; 30 days)
-- Each step records a reason from the Community Guidelines (each reason code is a Guidelines item; "other" needs a
-- note), notifies the member, and can be appealed once to a different moderator. A step may go at most one rung
-- above the member's highest standing step, except, as TD2 adopted, for threats of violence (item 4), sexual content
-- involving minors (item 9, reason child_safety, added here) and private information (item 7), where moderators may
-- go straight to any step (owner decision 2026-10-27). A first step may be a note or a warning.
-- Restrictions end on their own at ends_at; an overturned appeal ends them at once. Suspension also sets
-- auth.users.banned_until (GoTrue refuses sign-in and token refresh) and ends open sessions. Removal (closing an
-- account, two moderators) is not part of this migration. Governance sanctions stay separate.

-- Guidelines item 9: child sexual abuse material and any sexualisation of minors, separate from adult sexual content
-- (item 5) so that only it, not all sexual content, lets a moderator skip rungs.
CREATE OR REPLACE FUNCTION public.moderation_reason_codes()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ARRAY['harassment', 'hate', 'violence', 'sexual', 'child_safety', 'spam', 'misinformation', 'privacy', 'illegal', 'other'];
$$;

CREATE TABLE IF NOT EXISTS public.member_enforcement_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  step text NOT NULL CHECK (step IN ('note', 'warning', 'content_restriction', 'messaging_restriction', 'suspension')),
  reason_code text NOT NULL,
  note text,
  moderator_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  lifted_at timestamptz,
  lifted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  appeal_text text,
  appealed_at timestamptz,
  appeal_reviewer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  appeal_decision text CHECK (appeal_decision IN ('upheld', 'overturned')),
  appeal_note text,
  appeal_decided_at timestamptz
);
CREATE INDEX IF NOT EXISTS member_enforcement_actions_profile_idx ON public.member_enforcement_actions (profile_id, created_at DESC);
ALTER TABLE public.member_enforcement_actions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.member_enforcement_actions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.member_enforcement_actions TO authenticated;
DROP POLICY IF EXISTS member_enforcement_actions_read ON public.member_enforcement_actions;
CREATE POLICY member_enforcement_actions_read ON public.member_enforcement_actions FOR SELECT TO authenticated
  USING (profile_id = public.current_profile_id() OR public.has_permission('content.moderate'::public.app_permission));

CREATE OR REPLACE FUNCTION public.enforcement_step_rank(p_step text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_step
    WHEN 'note' THEN 0 WHEN 'warning' THEN 1 WHEN 'content_restriction' THEN 2
    WHEN 'messaging_restriction' THEN 3 WHEN 'suspension' THEN 4 END;
$$;

-- The step's end, or NULL while it stands. A note or warning has no end; a lifted step ended when it was lifted.
CREATE OR REPLACE FUNCTION public.enforcement_active_until(p_profile uuid, p_step text)
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT max(a.ends_at)
    FROM public.member_enforcement_actions a
   WHERE a.profile_id = p_profile AND a.step = p_step AND a.lifted_at IS NULL AND a.ends_at > now();
$$;
REVOKE ALL ON FUNCTION public.enforcement_active_until(uuid, text) FROM PUBLIC, anon, authenticated;

-- Refuses a write by a member under a restriction: SQLSTATE PT403 (PostgREST answers HTTP 403) with the restriction in
-- DETAIL and its end in HINT. A suspension also blocks writes made with a token issued before it.
CREATE OR REPLACE FUNCTION public.enforce_member_restriction(p_restriction text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_until timestamptz;
  v_kind text := p_restriction;
BEGIN
  IF v_profile IS NULL THEN
    RETURN;
  END IF;
  v_until := public.enforcement_active_until(v_profile, 'suspension');
  IF v_until IS NOT NULL THEN
    v_kind := 'suspension';
  ELSE
    v_until := public.enforcement_active_until(v_profile, p_restriction);
  END IF;
  IF v_until IS NOT NULL THEN
    RAISE EXCEPTION 'restricted'
      USING ERRCODE = 'PT403',
            DETAIL = v_kind,
            HINT = to_char(v_until AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_member_restriction(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforcement_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.enforce_member_restriction(TG_ARGV[0]);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforcement_before_insert() FROM PUBLIC, anon, authenticated;

-- get-or-create inserts a deterministic id on every call: only a conversation that does not exist yet is "started"
CREATE OR REPLACE FUNCTION public.enforcement_new_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.private_conversations WHERE id = NEW.id) THEN
    PERFORM public.enforce_member_restriction('messaging_restriction');
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforcement_new_conversation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforcement_posts ON public.posts;
CREATE TRIGGER enforcement_posts BEFORE INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.enforcement_before_insert('content_restriction');
DROP TRIGGER IF EXISTS enforcement_post_comments ON public.post_comments;
CREATE TRIGGER enforcement_post_comments BEFORE INSERT ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.enforcement_before_insert('content_restriction');
DROP TRIGGER IF EXISTS enforcement_matter_comments ON public.matter_comments;
CREATE TRIGGER enforcement_matter_comments BEFORE INSERT ON public.matter_comments
  FOR EACH ROW EXECUTE FUNCTION public.enforcement_before_insert('content_restriction');
DROP TRIGGER IF EXISTS enforcement_solution_comments ON public.solution_comments;
CREATE TRIGGER enforcement_solution_comments BEFORE INSERT ON public.solution_comments
  FOR EACH ROW EXECUTE FUNCTION public.enforcement_before_insert('content_restriction');
DROP TRIGGER IF EXISTS enforcement_matters ON public.matters;
CREATE TRIGGER enforcement_matters BEFORE INSERT ON public.matters
  FOR EACH ROW EXECUTE FUNCTION public.enforcement_before_insert('content_restriction');
DROP TRIGGER IF EXISTS enforcement_private_conversations ON public.private_conversations;
CREATE TRIGGER enforcement_private_conversations BEFORE INSERT ON public.private_conversations
  FOR EACH ROW EXECUTE FUNCTION public.enforcement_new_conversation();
-- a suspended member cannot send in existing conversations either; a messaging restriction leaves them open
DROP TRIGGER IF EXISTS enforcement_private_messages ON public.private_messages;
CREATE TRIGGER enforcement_private_messages BEFORE INSERT ON public.private_messages
  FOR EACH ROW EXECUTE FUNCTION public.enforcement_before_insert('suspension');

-- Keeps the sign-in ban in step with the member's standing suspensions.
CREATE OR REPLACE FUNCTION public.enforcement_sync_sign_in(p_profile uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user uuid;
  v_until timestamptz := public.enforcement_active_until(p_profile, 'suspension');
BEGIN
  SELECT user_id INTO v_user FROM public.profiles WHERE id = p_profile;
  IF v_user IS NULL THEN
    RETURN;
  END IF;
  UPDATE auth.users SET banned_until = v_until WHERE id = v_user;
  IF v_until IS NOT NULL THEN
    DELETE FROM auth.sessions WHERE user_id = v_user;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.enforcement_sync_sign_in(uuid) FROM PUBLIC, anon, authenticated;

-- ---- moderators: apply a step --------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.moderation_enforce(p_profile uuid, p_step text, p_reason_code text, p_note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := public.current_profile_id();
  v_rank integer := public.enforcement_step_rank(p_step);
  v_standing integer;
  v_ends timestamptz;
  v_id uuid;
BEGIN
  IF NOT public.has_permission('content.moderate'::public.app_permission) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF v_rank IS NULL THEN
    RAISE EXCEPTION 'unknown_step' USING ERRCODE = '22023';
  END IF;
  IF NOT (p_reason_code = ANY (public.moderation_reason_codes())) THEN
    RAISE EXCEPTION 'unknown_reason' USING ERRCODE = '22023';
  END IF;
  IF p_reason_code = 'other' AND nullif(btrim(p_note), '') IS NULL THEN
    RAISE EXCEPTION 'note_required' USING ERRCODE = '22023';
  END IF;
  IF p_profile IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_profile AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'member_not_found' USING ERRCODE = '22023';
  END IF;
  IF p_profile = v_me THEN
    RAISE EXCEPTION 'cannot_moderate_self' USING ERRCODE = '42501';
  END IF;
  -- highest step that still stands (not overturned, not lifted; warnings and notes stand)
  SELECT max(public.enforcement_step_rank(step)) INTO v_standing
    FROM public.member_enforcement_actions
   WHERE profile_id = p_profile AND lifted_at IS NULL AND appeal_decision IS DISTINCT FROM 'overturned';
  -- a first step may be a note or a warning; after that, one rung above the highest standing step
  IF v_rank > greatest(coalesce(v_standing, 0), 0) + 1 AND p_reason_code NOT IN ('violence', 'child_safety', 'privacy') THEN
    RAISE EXCEPTION 'step_too_high' USING ERRCODE = '22023';
  END IF;
  v_ends := CASE p_step
    WHEN 'content_restriction' THEN now() + interval '7 days'
    WHEN 'messaging_restriction' THEN now() + interval '7 days'
    WHEN 'suspension' THEN now() + interval '30 days' END;
  INSERT INTO public.member_enforcement_actions (profile_id, step, reason_code, note, moderator_profile_id, ends_at)
  VALUES (p_profile, p_step, p_reason_code, nullif(btrim(p_note), ''), v_me, v_ends)
  RETURNING id INTO v_id;
  IF p_step = 'suspension' THEN
    PERFORM public.enforcement_sync_sign_in(p_profile);
  END IF;
  INSERT INTO public.user_notifications (recipient_profile_id, notification_type, title, body, entity_type, entity_id, metadata)
  VALUES (p_profile, 'moderation_enforcement', 'A moderation decision about your account',
          'Open Moderation to see the step, the reason and how long it lasts. You can appeal once; a different moderator will review it.',
          'member_enforcement_action', v_id, jsonb_build_object('step', p_step));
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.moderation_enforce(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderation_enforce(uuid, text, text, text) TO authenticated;

-- ---- member: appeal once; a different moderator decides ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.moderation_enforcement_appeal(p_action_id uuid, p_text text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_me uuid := public.current_profile_id(); v_row public.member_enforcement_actions%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.member_enforcement_actions WHERE id = p_action_id FOR UPDATE;
  IF NOT FOUND OR v_row.profile_id IS DISTINCT FROM v_me THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF v_row.appealed_at IS NOT NULL THEN RAISE EXCEPTION 'already_appealed' USING ERRCODE = '22023'; END IF;
  IF v_row.lifted_at IS NOT NULL THEN RAISE EXCEPTION 'already_restored' USING ERRCODE = '22023'; END IF;
  IF nullif(btrim(p_text), '') IS NULL THEN RAISE EXCEPTION 'appeal_text_required' USING ERRCODE = '22023'; END IF;
  UPDATE public.member_enforcement_actions SET appeal_text = left(btrim(p_text), 2000), appealed_at = now() WHERE id = p_action_id;
END;
$$;
REVOKE ALL ON FUNCTION public.moderation_enforcement_appeal(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderation_enforcement_appeal(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.moderation_enforcement_decide_appeal(p_action_id uuid, p_overturn boolean, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_me uuid := public.current_profile_id(); v_row public.member_enforcement_actions%ROWTYPE;
BEGIN
  IF NOT public.has_permission('content.moderate'::public.app_permission) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_row FROM public.member_enforcement_actions WHERE id = p_action_id FOR UPDATE;
  IF NOT FOUND OR v_row.appealed_at IS NULL OR v_row.appeal_decided_at IS NOT NULL THEN
    RAISE EXCEPTION 'no_open_appeal' USING ERRCODE = '22023';
  END IF;
  IF v_row.moderator_profile_id = v_me THEN
    RAISE EXCEPTION 'appeal_needs_another_moderator' USING ERRCODE = '42501';
  END IF;
  IF v_row.profile_id = v_me THEN
    RAISE EXCEPTION 'cannot_decide_own_appeal' USING ERRCODE = '42501';
  END IF;
  UPDATE public.member_enforcement_actions
     SET appeal_reviewer_id = v_me, appeal_decision = CASE WHEN p_overturn THEN 'overturned' ELSE 'upheld' END,
         appeal_note = nullif(btrim(p_note), ''), appeal_decided_at = now(),
         lifted_at = CASE WHEN p_overturn THEN now() END, lifted_by = CASE WHEN p_overturn THEN v_me END
   WHERE id = p_action_id;
  IF p_overturn AND v_row.step = 'suspension' THEN
    PERFORM public.enforcement_sync_sign_in(v_row.profile_id);
  END IF;
  INSERT INTO public.user_notifications (recipient_profile_id, notification_type, title, body, entity_type, entity_id, metadata)
  VALUES (v_row.profile_id,
          CASE WHEN p_overturn THEN 'moderation_enforcement_overturned' ELSE 'moderation_enforcement_upheld' END,
          CASE WHEN p_overturn THEN 'Your appeal was accepted' ELSE 'Your appeal was reviewed' END,
          CASE WHEN p_overturn THEN 'The decision about your account was withdrawn.' ELSE 'A second moderator kept the decision about your account.' END,
          'member_enforcement_action', p_action_id, jsonb_build_object('step', v_row.step));
END;
$$;
REVOKE ALL ON FUNCTION public.moderation_enforcement_decide_appeal(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderation_enforcement_decide_appeal(uuid, boolean, text) TO authenticated;

-- ---- lists ---------------------------------------------------------------------------------------------------------
-- 'mine': the member's own steps; 'appeals': open appeals (moderators); 'member': one member's history (moderators).
CREATE OR REPLACE FUNCTION public.moderation_enforcement_list(p_scope text DEFAULT 'mine', p_profile uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid, profile_id uuid, username text, step text, reason_code text, note text, moderator_profile_id uuid,
  created_at timestamptz, ends_at timestamptz, lifted_at timestamptz, appeal_text text, appealed_at timestamptz,
  appeal_decision text, appeal_note text, appeal_decided_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_me uuid := public.current_profile_id();
BEGIN
  IF p_scope IN ('appeals', 'member') AND NOT public.has_permission('content.moderate'::public.app_permission) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT a.id, a.profile_id, p.username, a.step, a.reason_code, a.note,
         CASE WHEN p_scope <> 'mine' THEN a.moderator_profile_id END,
         a.created_at, a.ends_at, a.lifted_at, a.appeal_text, a.appealed_at, a.appeal_decision, a.appeal_note,
         a.appeal_decided_at
    FROM public.member_enforcement_actions a
    LEFT JOIN public.profiles p ON p.id = a.profile_id
   WHERE (p_scope = 'mine' AND a.profile_id = v_me)
      OR (p_scope = 'appeals' AND a.appealed_at IS NOT NULL AND a.appeal_decided_at IS NULL)
      OR (p_scope = 'member' AND a.profile_id = p_profile)
   ORDER BY a.created_at DESC
   LIMIT 200;
END;
$$;
REVOKE ALL ON FUNCTION public.moderation_enforcement_list(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderation_enforcement_list(text, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
