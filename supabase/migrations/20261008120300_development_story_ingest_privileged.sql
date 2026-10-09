-- Phase 0 trust hardening (S6): ingest_development_story was executable by every signed-in member and
-- upserts by source key, so any member could publish or overwrite the public Home "Stories" entries.
-- The development log is written only by the project's scripts (service role) and staff.

REVOKE ALL ON FUNCTION public.ingest_development_story(text, text, text, text, text, text, text[], text, text, timestamptz, text, text, text, text, text, text, text, text, integer, numeric, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_development_story(text, text, text, text, text, text, text[], text, text, timestamptz, text, text, text, text, text, text, text, text, integer, numeric, jsonb) TO service_role;

-- The original ten-argument overload (20260425130000) is superseded; keep it from members as well.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'ingest_development_story' AND p.pronargs = 10
  ) THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.ingest_development_story(text, text, text, text, text, text, text[], text, text, timestamptz) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.ingest_development_story(text, text, text, text, text, text, text[], text, text, timestamptz) TO service_role';
  END IF;
END $$;

-- Staff may still record a story from the app; ordinary members may not insert rows directly either.
DROP POLICY IF EXISTS "Authors can insert their own development stories" ON public.development_stories;
CREATE POLICY "Staff can insert development stories" ON public.development_stories
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      public.has_permission('role.assign'::public.app_permission)
      OR public.has_permission('settings.manage'::public.app_permission)
    )
  );
