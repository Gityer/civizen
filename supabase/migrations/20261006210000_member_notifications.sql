-- Notifications for everyday events, with per-member preferences.
--
-- Before: only agreements, reposts and matters wrote to user_notifications, so the bell stayed
-- empty when someone messaged, endorsed or replied to a member.
-- After: those events notify the member, who can turn each kind off. Devices that want push
-- delivery register here; a sender reads notification_push_devices with the service role.

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  messages boolean NOT NULL DEFAULT true,
  endorsements boolean NOT NULL DEFAULT true,
  comments boolean NOT NULL DEFAULT true,
  governance boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members manage their own notification preferences" ON public.notification_preferences;
CREATE POLICY "Members manage their own notification preferences"
  ON public.notification_preferences FOR ALL TO authenticated
  USING (profile_id = public.current_profile_id())
  WITH CHECK (profile_id = public.current_profile_id());

GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;

CREATE TABLE IF NOT EXISTS public.notification_push_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  token text NOT NULL UNIQUE CHECK (char_length(token) BETWEEN 8 AND 4096),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_push_devices_profile
  ON public.notification_push_devices (profile_id);

ALTER TABLE public.notification_push_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members see their own push devices" ON public.notification_push_devices;
CREATE POLICY "Members see their own push devices"
  ON public.notification_push_devices FOR SELECT TO authenticated
  USING (profile_id = public.current_profile_id());

DROP POLICY IF EXISTS "Members remove their own push devices" ON public.notification_push_devices;
CREATE POLICY "Members remove their own push devices"
  ON public.notification_push_devices FOR DELETE TO authenticated
  USING (profile_id = public.current_profile_id());

GRANT SELECT, DELETE ON public.notification_push_devices TO authenticated;

-- A token belongs to one device, so registering it again moves it to the signed-in member.
CREATE OR REPLACE FUNCTION public.register_push_device(p_platform text, p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile uuid := public.current_profile_id();
BEGIN
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.notification_push_devices (profile_id, platform, token)
  VALUES (v_profile, p_platform, p_token)
  ON CONFLICT (token) DO UPDATE
    SET profile_id = EXCLUDED.profile_id,
        platform = EXCLUDED.platform,
        last_seen_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.register_push_device(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_push_device(text, text) TO authenticated;

-- ---------------------------------------------------------------------------------------------
-- Writing notifications
-- ---------------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.member_display_name(p_profile_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(nullif(trim(p.full_name), ''), nullif(trim(p.username), ''), 'Someone')
  FROM public.profiles p
  WHERE p.id = p_profile_id;
$$;

-- p_category is the preference column that can silence this notification.
CREATE OR REPLACE FUNCTION public.notify_member(
  p_recipient uuid,
  p_actor uuid,
  p_category text,
  p_type text,
  p_title text,
  p_body text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefs public.notification_preferences;
  v_wanted boolean;
BEGIN
  IF p_recipient IS NULL OR p_recipient IS NOT DISTINCT FROM p_actor THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_recipient AND p.deleted_at IS NULL AND NOT coalesce(p.is_system_agent, false)
  ) THEN
    RETURN;
  END IF;

  IF p_actor IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.private_message_blocks b
    WHERE b.blocker_id = p_recipient AND b.blocked_id = p_actor
  ) THEN
    RETURN;
  END IF;

  SELECT * INTO v_prefs FROM public.notification_preferences WHERE profile_id = p_recipient;
  IF FOUND THEN
    v_wanted := CASE p_category
      WHEN 'messages' THEN v_prefs.messages
      WHEN 'endorsements' THEN v_prefs.endorsements
      WHEN 'comments' THEN v_prefs.comments
      WHEN 'governance' THEN v_prefs.governance
      ELSE true
    END;
    IF NOT v_wanted THEN
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.user_notifications (
    recipient_profile_id, notification_type, title, body, entity_type, entity_id, metadata
  ) VALUES (
    p_recipient, p_type, p_title, p_body, p_entity_type, p_entity_id,
    coalesce(p_metadata, '{}'::jsonb)
      || CASE WHEN p_actor IS NULL THEN '{}'::jsonb
         ELSE jsonb_build_object('actor_id', p_actor, 'actor_name', public.member_display_name(p_actor)) END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.notify_member(uuid, uuid, text, text, text, text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.member_display_name(uuid) FROM PUBLIC, anon, authenticated;

-- New direct message. One unread notification per conversation, so a burst of messages does not
-- fill the inbox; it is refreshed with the latest time instead.
CREATE OR REPLACE FUNCTION public.notify_private_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient uuid;
  v_name text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.private_conversations c WHERE c.id = NEW.conversation_id AND c.kind = 'direct'
  ) THEN
    RETURN NEW;
  END IF;

  v_name := public.member_display_name(NEW.sender_id);

  FOR v_recipient IN
    SELECT m.profile_id FROM public.private_conversation_members m
    WHERE m.conversation_id = NEW.conversation_id AND m.profile_id <> NEW.sender_id
  LOOP
    UPDATE public.user_notifications
    SET created_at = now()
    WHERE recipient_profile_id = v_recipient
      AND notification_type = 'private_message'
      AND entity_id = NEW.conversation_id
      AND read_at IS NULL;

    IF NOT FOUND THEN
      PERFORM public.notify_member(
        v_recipient, NEW.sender_id, 'messages', 'private_message',
        v_name || ' sent you a message', NULL, 'conversation', NEW.conversation_id
      );
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_private_message ON public.private_messages;
CREATE TRIGGER notify_private_message
  AFTER INSERT ON public.private_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_private_message();

CREATE OR REPLACE FUNCTION public.notify_endorsement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(NEW.is_hidden, false) THEN
    RETURN NEW;
  END IF;
  PERFORM public.notify_member(
    NEW.endorsed_id, NEW.endorser_id, 'endorsements', 'endorsement_received',
    public.member_display_name(NEW.endorser_id) || ' endorsed you',
    NULL, 'profile', NEW.endorsed_id,
    jsonb_build_object('pillar', NEW.pillar::text, 'stars', NEW.stars)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_endorsement ON public.endorsements;
CREATE TRIGGER notify_endorsement
  AFTER INSERT ON public.endorsements
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_endorsement();

CREATE OR REPLACE FUNCTION public.notify_post_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author uuid;
BEGIN
  SELECT p.author_id INTO v_author FROM public.posts p WHERE p.id = NEW.post_id;
  PERFORM public.notify_member(
    v_author, NEW.author_id, 'comments', 'post_comment',
    public.member_display_name(NEW.author_id) || ' commented on your post',
    left(NEW.content, 140), 'post', NEW.post_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_post_comment ON public.post_comments;
CREATE TRIGGER notify_post_comment
  AFTER INSERT ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_post_comment();

-- Governance: members who can vote hear about new open proposals, and the proposer hears the result.
CREATE OR REPLACE FUNCTION public.notify_governance_proposal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_voter uuid;
BEGIN
  IF NEW.status = 'open' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'open') THEN
    FOR v_voter IN
      SELECT p.id FROM public.profiles p
      WHERE p.is_governance_eligible AND p.deleted_at IS NULL AND p.id <> NEW.proposer_id
    LOOP
      PERFORM public.notify_member(
        v_voter, NEW.proposer_id, 'governance', 'governance_proposal_open',
        'New proposal: ' || left(NEW.title, 120), left(NULLIF(NEW.summary, ''), 200),
        'governance_proposal', NEW.id
      );
    END LOOP;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'open' AND NEW.status IN ('approved', 'rejected') THEN
    PERFORM public.notify_member(
      NEW.proposer_id, NULL, 'governance', 'governance_proposal_' || NEW.status::text,
      'Your proposal was ' || NEW.status::text || ': ' || left(NEW.title, 120), NULL,
      'governance_proposal', NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_governance_proposal ON public.governance_proposals;
CREATE TRIGGER notify_governance_proposal
  AFTER INSERT OR UPDATE OF status ON public.governance_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_governance_proposal();

REVOKE ALL ON FUNCTION public.notify_private_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_endorsement() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_post_comment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_governance_proposal() FROM PUBLIC, anon, authenticated;

-- A deleted account stops receiving pushes on its devices.
CREATE OR REPLACE FUNCTION public.forget_push_devices_on_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    DELETE FROM public.notification_push_devices WHERE profile_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS forget_push_devices_on_deletion ON public.profiles;
CREATE TRIGGER forget_push_devices_on_deletion
  AFTER UPDATE OF deleted_at ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.forget_push_devices_on_deletion();

REVOKE ALL ON FUNCTION public.forget_push_devices_on_deletion() FROM PUBLIC, anon, authenticated;
