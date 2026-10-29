-- Rate limits per account (PM decision TD4, Trust & Safety baseline 3.5): one account could post, comment, message,
-- open conversations and report without any limit. Starting values from TD4, kept in a table so they can be reviewed
-- after 30 days of data without a code change:
--   reports 20/day · posts 10/hour · comments 60/hour (posts, Matters, Solutions) · new conversations 20/day ·
--   messages 200/hour.
-- Each counted action is logged in rate_limit_events (independent of the content rows, so deleting a post does not
-- give the quota back). A blocked insert raises SQLSTATE PT429 (PostgREST answers HTTP 429) with the action in DETAIL
-- and the time it is allowed again in HINT, so the app can say so plainly instead of dropping the action.
-- Only requests made as a member are counted: server jobs, edge functions with the service role and seeds have no
-- current profile and are never limited. Sign-ups per address (5/hour) are GoTrue configuration, not a migration.

CREATE TABLE IF NOT EXISTS public.rate_limits (
  action text PRIMARY KEY,
  max_count integer NOT NULL CHECK (max_count > 0),
  per_window interval NOT NULL CHECK (per_window > interval '0'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limits FROM PUBLIC, anon, authenticated;

INSERT INTO public.rate_limits (action, max_count, per_window) VALUES
  ('report', 20, interval '1 day'),
  ('post', 10, interval '1 hour'),
  ('comment', 60, interval '1 hour'),
  ('conversation', 20, interval '1 day'),
  ('message', 200, interval '1 hour')
ON CONFLICT (action) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id bigserial PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_limit_events_profile_action_idx ON public.rate_limit_events (profile_id, action, created_at);
ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limit_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.rate_limit_events_id_seq FROM PUBLIC, anon, authenticated;

-- Counts one action for the current member, or raises PT429 when the window is full.
CREATE OR REPLACE FUNCTION public.enforce_rate_limit(p_action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_limit public.rate_limits%ROWTYPE;
  v_count integer;
  v_oldest timestamptz;
BEGIN
  IF v_profile IS NULL THEN
    RETURN;
  END IF;
  SELECT * INTO v_limit FROM public.rate_limits WHERE action = p_action;
  IF NOT FOUND THEN
    RETURN;
  END IF;
  -- one counter per member and action at a time, so parallel requests cannot both take the last slot
  PERFORM pg_advisory_xact_lock(hashtextextended(v_profile::text || ':' || p_action, 0));
  SELECT count(*), min(created_at) INTO v_count, v_oldest
    FROM public.rate_limit_events
   WHERE profile_id = v_profile AND action = p_action AND created_at > now() - v_limit.per_window;
  IF v_count >= v_limit.max_count THEN
    RAISE EXCEPTION 'rate_limited'
      USING ERRCODE = 'PT429',
            DETAIL = p_action,
            HINT = to_char((v_oldest + v_limit.per_window) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  END IF;
  INSERT INTO public.rate_limit_events (profile_id, action) VALUES (v_profile, p_action);
  DELETE FROM public.rate_limit_events
   WHERE profile_id = v_profile AND action = p_action AND created_at < now() - v_limit.per_window - interval '1 day';
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_rate_limit(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.rate_limit_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.enforce_rate_limit(TG_ARGV[0]);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.rate_limit_before_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS rate_limit_posts ON public.posts;
CREATE TRIGGER rate_limit_posts BEFORE INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.rate_limit_before_insert('post');

DROP TRIGGER IF EXISTS rate_limit_post_comments ON public.post_comments;
CREATE TRIGGER rate_limit_post_comments BEFORE INSERT ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.rate_limit_before_insert('comment');

DROP TRIGGER IF EXISTS rate_limit_matter_comments ON public.matter_comments;
CREATE TRIGGER rate_limit_matter_comments BEFORE INSERT ON public.matter_comments
  FOR EACH ROW EXECUTE FUNCTION public.rate_limit_before_insert('comment');

DROP TRIGGER IF EXISTS rate_limit_solution_comments ON public.solution_comments;
CREATE TRIGGER rate_limit_solution_comments BEFORE INSERT ON public.solution_comments
  FOR EACH ROW EXECUTE FUNCTION public.rate_limit_before_insert('comment');

-- The get-or-create functions insert a deterministic id with ON CONFLICT DO NOTHING on every call, and a BEFORE
-- INSERT trigger fires before the conflict is known: only an id that does not exist yet is a new conversation.
CREATE OR REPLACE FUNCTION public.rate_limit_new_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.private_conversations WHERE id = NEW.id) THEN
    PERFORM public.enforce_rate_limit('conversation');
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.rate_limit_new_conversation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS rate_limit_private_conversations ON public.private_conversations;
CREATE TRIGGER rate_limit_private_conversations BEFORE INSERT ON public.private_conversations
  FOR EACH ROW EXECUTE FUNCTION public.rate_limit_new_conversation();

DROP TRIGGER IF EXISTS rate_limit_private_messages ON public.private_messages;
CREATE TRIGGER rate_limit_private_messages BEFORE INSERT ON public.private_messages
  FOR EACH ROW EXECUTE FUNCTION public.rate_limit_before_insert('message');

-- the legacy public messages table is not used by the app any more, but members can still write to it
DROP TRIGGER IF EXISTS rate_limit_messages ON public.messages;
CREATE TRIGGER rate_limit_messages BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.rate_limit_before_insert('message');

DROP TRIGGER IF EXISTS rate_limit_reports ON public.reports;
CREATE TRIGGER rate_limit_reports BEFORE INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.rate_limit_before_insert('report');
