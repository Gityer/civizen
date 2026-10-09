-- Phase 0 trust hardening (S8), part 2: the row-level security policies on realtime.messages that make
-- the call inboxes private. realtime.messages is owned by supabase_realtime_admin; on the hosted database
-- the postgres role is a member of that role, so this applies like any other migration. The local CLI
-- stack reserves that membership for superusers, so scripts/local-supabase/replay-migrations.sh runs
-- files named *_realtime_policies.sql as supabase_admin (see docs/04-operations/dev/local-supabase.md).

DROP POLICY IF EXISTS "Members receive their own call inbox" ON realtime.messages;
CREATE POLICY "Members receive their own call inbox" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    extension = 'broadcast'
    AND public.call_inbox_owner(realtime.topic()) = public.current_profile_id()
  );

DROP POLICY IF EXISTS "Members signal call inboxes of people they talk to" ON realtime.messages;
CREATE POLICY "Members signal call inboxes of people they talk to" ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    extension = 'broadcast'
    AND public.can_signal_call_inbox(realtime.topic())
  );
