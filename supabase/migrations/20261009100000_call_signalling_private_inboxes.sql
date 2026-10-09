-- Phase 0 trust hardening (S8): call invites, offers, answers and ICE candidates were broadcast on one
-- public Realtime channel that any client holding the anon key could join, and were filtered only in
-- the browser. Signals now travel on private per-member inbox topics ("call-inbox:<profile id>")
-- authorised by row-level security on realtime.messages:
--   - a member receives only their own inbox;
--   - a member may send to another member's inbox only when the two share a private conversation.
-- This file provides the helper functions; 20261009100100_call_signalling_realtime_policies.sql adds
-- the policies (separate because realtime.messages has a reserved owner on local stacks).

CREATE OR REPLACE FUNCTION public.call_inbox_owner(p_topic text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_topic LIKE 'call-inbox:%'
         AND split_part(p_topic, ':', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN split_part(p_topic, ':', 2)::uuid
    ELSE NULL
  END;
$$;

COMMENT ON FUNCTION public.call_inbox_owner(text) IS
  'Profile id addressed by a call-inbox Realtime topic, or NULL for any other topic.';

CREATE OR REPLACE FUNCTION public.can_signal_call_inbox(p_topic text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.private_conversation_members AS mine
    JOIN public.private_conversation_members AS theirs
      ON theirs.conversation_id = mine.conversation_id
    WHERE mine.profile_id = public.current_profile_id()
      AND theirs.profile_id = public.call_inbox_owner(p_topic)
      AND theirs.profile_id <> mine.profile_id
  );
$$;

COMMENT ON FUNCTION public.can_signal_call_inbox(text) IS
  'True when the signed-in member shares a private conversation with the member whose call inbox the topic names.';

GRANT EXECUTE ON FUNCTION public.call_inbox_owner(text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.can_signal_call_inbox(text) TO authenticated, service_role;
