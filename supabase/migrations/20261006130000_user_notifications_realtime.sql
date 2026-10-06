-- Stream new notifications to the recipient's open app (bell badge). Row level security still applies
-- to realtime: a member only receives changes to their own user_notifications rows.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_notifications'
    ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_notifications_recipient_unread
  ON public.user_notifications (recipient_profile_id, created_at DESC)
  WHERE read_at IS NULL;
