-- Phase 7 step 7.2 (web): push subscriptions per device, a server-only dispatch configuration, and triggers that
-- hand every new notification and every new private message to the push-dispatch function through pg_net.
-- Message pushes carry no content: the function sends "New message" with the sender's name only.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_subscriptions_profile_idx ON public.push_subscriptions (profile_id);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS push_subscriptions_owner ON public.push_subscriptions;
CREATE POLICY push_subscriptions_owner ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (profile_id = public.current_profile_id())
  WITH CHECK (profile_id = public.current_profile_id());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;

-- Server-only: the dispatch URL, the shared secret the function expects, and the VAPID key pair.
CREATE TABLE IF NOT EXISTS public.push_dispatch_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  function_url text,
  dispatch_secret text,
  vapid_public_key text,
  vapid_private_key text,
  vapid_subject text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.push_dispatch_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.push_dispatch_config FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.push_vapid_public_key()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT vapid_public_key FROM public.push_dispatch_config WHERE id = true;
$$;
REVOKE ALL ON FUNCTION public.push_vapid_public_key() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.push_vapid_public_key() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.push_dispatch(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_secret text;
BEGIN
  SELECT function_url, dispatch_secret INTO v_url, v_secret FROM public.push_dispatch_config WHERE id = true;
  IF v_url IS NULL OR v_secret IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RETURN;
  END IF;
  BEGIN
    PERFORM net.http_post(
      url := v_url,
      body := payload,
      params := '{}'::jsonb,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
      timeout_milliseconds := 8000
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'push_dispatch: net.http_post failed (%): %', SQLSTATE, SQLERRM;
  END;
END;
$$;
REVOKE ALL ON FUNCTION public.push_dispatch(jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.push_on_user_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.push_dispatch(jsonb_build_object(
    'kind', 'notification',
    'notification_id', NEW.id,
    'recipients', jsonb_build_array(NEW.recipient_profile_id)
  ));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS push_on_user_notification ON public.user_notifications;
CREATE TRIGGER push_on_user_notification
  AFTER INSERT ON public.user_notifications
  FOR EACH ROW EXECUTE FUNCTION public.push_on_user_notification();

CREATE OR REPLACE FUNCTION public.push_on_private_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipients jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(m.profile_id), '[]'::jsonb) INTO v_recipients
  FROM public.private_conversation_members m
  WHERE m.conversation_id = NEW.conversation_id
    AND m.profile_id <> NEW.sender_id
    AND m.hidden_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = m.profile_id AND p.is_system_agent = true);
  IF jsonb_array_length(v_recipients) = 0 THEN
    RETURN NEW;
  END IF;
  PERFORM public.push_dispatch(jsonb_build_object(
    'kind', 'message',
    'message_id', NEW.id,
    'conversation_id', NEW.conversation_id,
    'sender_id', NEW.sender_id,
    'recipients', v_recipients
  ));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS push_on_private_message ON public.private_messages;
CREATE TRIGGER push_on_private_message
  AFTER INSERT ON public.private_messages
  FOR EACH ROW EXECUTE FUNCTION public.push_on_private_message();

NOTIFY pgrst, 'reload schema';
