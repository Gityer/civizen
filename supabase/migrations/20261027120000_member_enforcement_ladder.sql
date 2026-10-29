-- Enforcement steps for members (PM decision TD2, Trust & Safety baseline 3.2): moderators could hide content but
-- not act on a person, so repeated conduct could not be stopped. The ladder:
--   note → warning → content restriction (cannot post or comment; 7 days) → messaging restriction (cannot start
--   conversations; 7 days) → suspension (read and appeal only; 30 days)
-- Each step records a reason from the Community Guidelines (each reason code is a Guidelines item; "other" needs a
-- note), notifies the member, and can be appealed once to a different moderator. A step may go at most one rung
-- above the member's highest standing step, except, as TD2 adopted, for threats of violence (item 4), sexual content
-- involving minors (item 9, reason child_safety, added here) and private information (item 7), where moderators may
-- go straight to any step (owner decision 2026-10-27). A first step may be a note or a warning.
-- Restrictions end on their own at ends_at; an overturned appeal ends them at once. A suspended member stays signed in
-- so they can read and appeal (owner decision 2026-10-27), and every other write they make is refused: a statement
-- guard on every public table, and a row guard on profiles that lets only the sign-in bookkeeping change.
-- Removal, the last rung, closes the account: one moderator proposes it and a different one confirms it (the founder
-- alone while there are fewer than two moderators, the fallback stage of TD1). From confirmation the account is read
-- and appeal only, like a suspension; it is closed through the member's own deletion path (delete_my_account) when
-- an appeal is upheld, or 30 days after confirmation when no appeal is open. Staff and office holders cannot be
-- removed this way. Governance sanctions stay separate.

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
  step text NOT NULL CHECK (step IN ('note', 'warning', 'content_restriction', 'messaging_restriction', 'suspension', 'removal')),
  reason_code text NOT NULL,
  note text,
  moderator_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  -- removal takes effect only when a second moderator confirms it; every other step is confirmed when it is applied
  confirmed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  confirmed_at timestamptz,
  closed_at timestamptz,
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
    WHEN 'messaging_restriction' THEN 3 WHEN 'suspension' THEN 4 WHEN 'removal' THEN 5 END;
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
   WHERE a.profile_id = p_profile AND a.step = p_step AND a.lifted_at IS NULL AND a.closed_at IS NULL
     AND a.confirmed_at IS NOT NULL AND a.ends_at > now();
$$;
REVOKE ALL ON FUNCTION public.enforcement_active_until(uuid, text) FROM PUBLIC, anon, authenticated;

-- Refuses a write by a member under a restriction: SQLSTATE PT403 (PostgREST answers HTTP 403) with the restriction in
-- DETAIL and its end in HINT. A suspension refuses every write (the guards below), whatever the step checked.
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
  -- the closing of a removed account runs as the member (enforcement_close_account) and must not be refused
  IF v_profile IS NULL OR current_setting('civizen.enforcement_closing', true) = 'on' THEN
    RETURN;
  END IF;
  v_until := public.enforcement_active_until(v_profile, 'removal');
  IF v_until IS NOT NULL THEN
    v_kind := 'removal';
  ELSE
    v_until := public.enforcement_active_until(v_profile, 'suspension');
    IF v_until IS NOT NULL THEN
      v_kind := 'suspension';
    ELSE
      v_until := public.enforcement_active_until(v_profile, p_restriction);
    END IF;
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

-- ---- suspension: read and appeal only ------------------------------------------------------------------------------
-- Tables a suspended member may still write, because reading the app writes them or because they carry the appeal:
-- view counters, error reports, notification read marks, push subscriptions, and the two appeal records.
CREATE OR REPLACE FUNCTION public.enforcement_guard_exempt_tables()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ARRAY['participation_page_views', 'post_views', 'client_error_reports', 'user_notifications', 'push_subscriptions',
               'member_enforcement_actions', 'moderation_actions', 'profiles'];
$$;

CREATE OR REPLACE FUNCTION public.enforcement_suspension_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.enforce_member_restriction('suspension');
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.enforcement_suspension_guard() FROM PUBLIC, anon, authenticated;

-- profiles: the app writes last_active_at on every load, and a member must still be able to accept new Terms and
-- choose a language; any other change by a suspended member is refused.
CREATE OR REPLACE FUNCTION public.enforcement_profiles_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed text[] := ARRAY['last_active_at', 'updated_at', 'terms_version', 'terms_accepted_at', 'terms_acceptance_method', 'language_code'];
BEGIN
  IF TG_OP = 'UPDATE' AND (to_jsonb(NEW) - v_allowed) = (to_jsonb(OLD) - v_allowed) THEN
    RETURN NEW;
  END IF;
  PERFORM public.enforce_member_restriction('suspension');
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
REVOKE ALL ON FUNCTION public.enforcement_profiles_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforcement_profiles_guard ON public.profiles;
CREATE TRIGGER enforcement_profiles_guard BEFORE INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforcement_profiles_guard();

-- Every other table in public gets the statement guard (supabase/tests/member_enforcement_ladder_test.sql fails when
-- a new table is missing it).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relispartition
       AND NOT (c.relname = ANY (public.enforcement_guard_exempt_tables()))
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS enforcement_suspension_guard ON public.%I', r.relname);
    EXECUTE format('CREATE TRIGGER enforcement_suspension_guard BEFORE INSERT OR UPDATE OR DELETE ON public.%I '
                   'FOR EACH STATEMENT EXECUTE FUNCTION public.enforcement_suspension_guard()', r.relname);
  END LOOP;
END $$;

-- ---- removal helpers ------------------------------------------------------------------------------------------------
-- People who can moderate: not founder authority (the founder is the fallback while there are fewer than two) and not
-- system accounts (the AI agents hold the system role and never count as a moderator).
CREATE OR REPLACE FUNCTION public.moderation_moderator_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
    FROM public.profiles p
   WHERE p.deleted_at IS NULL
     AND NOT p.is_system_agent AND p.role <> 'system'::public.app_role
     AND NOT public.profile_has_founder_authority(p.id)
     AND 'content.moderate'::public.app_permission = ANY (
           public.app_role_permissions(p.role)
           || coalesce(p.granted_permissions, '{}'::public.app_permission[])
           || coalesce(p.custom_permissions, '{}'::public.app_permission[]))
     AND NOT ('content.moderate'::public.app_permission = ANY (coalesce(p.denied_permissions, '{}'::public.app_permission[])));
$$;
REVOKE ALL ON FUNCTION public.moderation_moderator_count() FROM PUBLIC, anon, authenticated;

-- Closes a removed member's account through the member's own deletion path, run as the member: open ballots are
-- withdrawn, the profile is anonymised, verification material and the sign-in identity are removed. The restriction
-- guards stand aside while it runs.
CREATE OR REPLACE FUNCTION public.enforcement_close_account(p_action_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row public.member_enforcement_actions%ROWTYPE;
  v_user uuid;
  v_claims text := current_setting('request.jwt.claims', true);
  v_sub text := current_setting('request.jwt.claim.sub', true);
BEGIN
  SELECT * INTO v_row FROM public.member_enforcement_actions WHERE id = p_action_id FOR UPDATE;
  IF NOT FOUND OR v_row.step <> 'removal' OR v_row.confirmed_at IS NULL OR v_row.lifted_at IS NOT NULL OR v_row.closed_at IS NOT NULL THEN
    RETURN;
  END IF;
  SELECT user_id INTO v_user FROM public.profiles WHERE id = v_row.profile_id AND deleted_at IS NULL;
  IF v_user IS NOT NULL THEN
    PERFORM set_config('civizen.enforcement_closing', 'on', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
    PERFORM set_config('request.jwt.claim.sub', v_user::text, true);
    PERFORM public.delete_my_account('delete');
    PERFORM set_config('request.jwt.claims', coalesce(v_claims, ''), true);
    PERFORM set_config('request.jwt.claim.sub', coalesce(v_sub, ''), true);
    PERFORM set_config('civizen.enforcement_closing', '', true);
    UPDATE public.profiles SET deletion_reason = 'moderation_removal' WHERE id = v_row.profile_id;
  END IF;
  UPDATE public.member_enforcement_actions SET closed_at = now() WHERE id = p_action_id;
END;
$$;
REVOKE ALL ON FUNCTION public.enforcement_close_account(uuid) FROM PUBLIC, anon, authenticated;

-- Removals whose 30 days have passed without an open appeal are closed (scheduled daily below).
CREATE OR REPLACE FUNCTION public.enforcement_close_due_removals()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid; v_count integer := 0;
BEGIN
  FOR v_id IN
    SELECT id FROM public.member_enforcement_actions
     WHERE step = 'removal' AND confirmed_at IS NOT NULL AND lifted_at IS NULL AND closed_at IS NULL
       AND ends_at <= now()
       AND (appealed_at IS NULL OR appeal_decision = 'upheld')
  LOOP
    PERFORM public.enforcement_close_account(v_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.enforcement_close_due_removals() FROM PUBLIC, anon, authenticated;

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
  v_target public.profiles%ROWTYPE;
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
  SELECT * INTO v_target FROM public.profiles WHERE id = p_profile AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'member_not_found' USING ERRCODE = '22023';
  END IF;
  IF p_profile = v_me THEN
    RAISE EXCEPTION 'cannot_moderate_self' USING ERRCODE = '42501';
  END IF;
  IF p_step = 'removal' THEN
    -- the same accounts the member could not close themselves: staff roles and office holders lose those first
    IF v_target.is_system_agent OR v_target.role IN ('founder', 'admin', 'system', 'moderator', 'market_manager')
       OR EXISTS (SELECT 1 FROM public.constitutional_offices WHERE profile_id = p_profile AND is_active) THEN
      RAISE EXCEPTION 'cannot_remove_staff' USING ERRCODE = '42501';
    END IF;
    IF EXISTS (SELECT 1 FROM public.member_enforcement_actions
                WHERE profile_id = p_profile AND step = 'removal' AND lifted_at IS NULL AND closed_at IS NULL) THEN
      RAISE EXCEPTION 'removal_already_open' USING ERRCODE = '22023';
    END IF;
  END IF;
  -- highest step that still stands (confirmed, not overturned, not lifted; warnings and notes stand)
  SELECT max(public.enforcement_step_rank(step)) INTO v_standing
    FROM public.member_enforcement_actions
   WHERE profile_id = p_profile AND confirmed_at IS NOT NULL AND lifted_at IS NULL
     AND appeal_decision IS DISTINCT FROM 'overturned';
  -- a first step may be a note or a warning; after that, one rung above the highest standing step
  IF v_rank > greatest(coalesce(v_standing, 0), 0) + 1 AND p_reason_code NOT IN ('violence', 'child_safety', 'privacy') THEN
    RAISE EXCEPTION 'step_too_high' USING ERRCODE = '22023';
  END IF;
  v_ends := CASE p_step
    WHEN 'content_restriction' THEN now() + interval '7 days'
    WHEN 'messaging_restriction' THEN now() + interval '7 days'
    WHEN 'suspension' THEN now() + interval '30 days' END;
  INSERT INTO public.member_enforcement_actions (profile_id, step, reason_code, note, moderator_profile_id, ends_at, confirmed_by, confirmed_at)
  VALUES (p_profile, p_step, p_reason_code, nullif(btrim(p_note), ''), v_me, v_ends,
          CASE WHEN p_step <> 'removal' THEN v_me END, CASE WHEN p_step <> 'removal' THEN now() END)
  RETURNING id INTO v_id;
  -- a removal reaches the member only once confirmed
  IF p_step <> 'removal' THEN
    INSERT INTO public.user_notifications (recipient_profile_id, notification_type, title, body, entity_type, entity_id, metadata)
    VALUES (p_profile, 'moderation_enforcement', 'A moderation decision about your account',
            'Open Moderation to see the step, the reason and how long it lasts. You can appeal once; a different moderator will review it.',
            'member_enforcement_action', v_id, jsonb_build_object('step', p_step));
  END IF;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.moderation_enforce(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderation_enforce(uuid, text, text, text) TO authenticated;

-- A different moderator confirms a proposed removal; the founder alone may confirm while there are fewer than two
-- moderators (TD1 fallback). From confirmation the account is read and appeal only and closes in 30 days.
CREATE OR REPLACE FUNCTION public.moderation_enforcement_confirm(p_action_id uuid)
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
  IF NOT FOUND OR v_row.step <> 'removal' OR v_row.confirmed_at IS NOT NULL OR v_row.lifted_at IS NOT NULL THEN
    RAISE EXCEPTION 'nothing_to_confirm' USING ERRCODE = '22023';
  END IF;
  IF v_row.profile_id = v_me THEN
    RAISE EXCEPTION 'cannot_moderate_self' USING ERRCODE = '42501';
  END IF;
  IF v_row.moderator_profile_id = v_me
     AND NOT (public.profile_has_founder_authority(v_me) AND public.moderation_moderator_count() < 2) THEN
    RAISE EXCEPTION 'removal_needs_second_moderator' USING ERRCODE = '42501';
  END IF;
  UPDATE public.member_enforcement_actions
     SET confirmed_by = v_me, confirmed_at = now(), ends_at = now() + interval '30 days'
   WHERE id = p_action_id;
  INSERT INTO public.user_notifications (recipient_profile_id, notification_type, title, body, entity_type, entity_id, metadata)
  VALUES (v_row.profile_id, 'moderation_removal', 'Your account will be closed',
          'Two moderators decided to close your account in 30 days. Until then you can read and appeal once in Moderation; a moderator who did not take part decides.',
          'member_enforcement_action', p_action_id, jsonb_build_object('step', 'removal'));
END;
$$;
REVOKE ALL ON FUNCTION public.moderation_enforcement_confirm(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderation_enforcement_confirm(uuid) TO authenticated;

-- A moderator withdraws a removal proposal that nobody has confirmed (a confirmed one goes through the appeal).
CREATE OR REPLACE FUNCTION public.moderation_enforcement_withdraw(p_action_id uuid)
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
  IF NOT FOUND OR v_row.step <> 'removal' OR v_row.confirmed_at IS NOT NULL OR v_row.lifted_at IS NOT NULL THEN
    RAISE EXCEPTION 'nothing_to_confirm' USING ERRCODE = '22023';
  END IF;
  UPDATE public.member_enforcement_actions SET lifted_at = now(), lifted_by = v_me WHERE id = p_action_id;
END;
$$;
REVOKE ALL ON FUNCTION public.moderation_enforcement_withdraw(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderation_enforcement_withdraw(uuid) TO authenticated;

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
  IF NOT FOUND OR v_row.profile_id IS DISTINCT FROM v_me OR v_row.confirmed_at IS NULL THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF v_row.appealed_at IS NOT NULL THEN RAISE EXCEPTION 'already_appealed' USING ERRCODE = '22023'; END IF;
  IF v_row.lifted_at IS NOT NULL OR v_row.closed_at IS NOT NULL THEN RAISE EXCEPTION 'already_restored' USING ERRCODE = '22023'; END IF;
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
  -- neither the moderator who decided nor, for a removal, the one who confirmed it
  IF v_row.moderator_profile_id = v_me OR (v_row.step = 'removal' AND v_row.confirmed_by = v_me) THEN
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
  INSERT INTO public.user_notifications (recipient_profile_id, notification_type, title, body, entity_type, entity_id, metadata)
  VALUES (v_row.profile_id,
          CASE WHEN p_overturn THEN 'moderation_enforcement_overturned' ELSE 'moderation_enforcement_upheld' END,
          CASE WHEN p_overturn THEN 'Your appeal was accepted' ELSE 'Your appeal was reviewed' END,
          CASE WHEN p_overturn THEN 'The decision about your account was withdrawn.' ELSE 'A second moderator kept the decision about your account.' END,
          'member_enforcement_action', p_action_id, jsonb_build_object('step', v_row.step));
  -- an upheld removal closes the account now
  IF NOT p_overturn AND v_row.step = 'removal' THEN
    PERFORM public.enforcement_close_account(p_action_id);
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.moderation_enforcement_decide_appeal(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderation_enforcement_decide_appeal(uuid, boolean, text) TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('enforcement_close_due_removals');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    PERFORM cron.schedule('enforcement_close_due_removals', '17 5 * * *', $cron$SELECT public.enforcement_close_due_removals();$cron$);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ---- lists ---------------------------------------------------------------------------------------------------------
-- 'mine': the member's own confirmed steps; 'appeals': open appeals (moderators); 'member': one member's history
-- (moderators); 'removals': removal proposals waiting for a second moderator (moderators).
CREATE OR REPLACE FUNCTION public.moderation_enforcement_list(p_scope text DEFAULT 'mine', p_profile uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid, profile_id uuid, username text, step text, reason_code text, note text, moderator_profile_id uuid,
  created_at timestamptz, ends_at timestamptz, lifted_at timestamptz, appeal_text text, appealed_at timestamptz,
  appeal_decision text, appeal_note text, appeal_decided_at timestamptz, confirmed_by uuid, confirmed_at timestamptz,
  closed_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_me uuid := public.current_profile_id();
BEGIN
  IF p_scope IN ('appeals', 'member', 'removals') AND NOT public.has_permission('content.moderate'::public.app_permission) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT a.id, a.profile_id, p.username, a.step, a.reason_code, a.note,
         CASE WHEN p_scope <> 'mine' THEN a.moderator_profile_id END,
         a.created_at, a.ends_at, a.lifted_at, a.appeal_text, a.appealed_at, a.appeal_decision, a.appeal_note,
         a.appeal_decided_at, CASE WHEN p_scope <> 'mine' THEN a.confirmed_by END, a.confirmed_at, a.closed_at
    FROM public.member_enforcement_actions a
    LEFT JOIN public.profiles p ON p.id = a.profile_id
   WHERE (p_scope = 'mine' AND a.profile_id = v_me AND a.confirmed_at IS NOT NULL)
      OR (p_scope = 'appeals' AND a.appealed_at IS NOT NULL AND a.appeal_decided_at IS NULL)
      OR (p_scope = 'member' AND a.profile_id = p_profile)
      OR (p_scope = 'removals' AND a.step = 'removal' AND a.confirmed_at IS NULL AND a.lifted_at IS NULL)
   ORDER BY a.created_at DESC
   LIMIT 200;
END;
$$;
REVOKE ALL ON FUNCTION public.moderation_enforcement_list(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderation_enforcement_list(text, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
