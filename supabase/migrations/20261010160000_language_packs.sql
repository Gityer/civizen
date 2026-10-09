-- Phase 8 step 8.2: machine-translated language packs are built once on the server and cached here, so a browser
-- downloads one pack instead of translating 6,600 strings itself. Packs are public reading material; only the
-- service role writes them.

CREATE TABLE IF NOT EXISTS public.language_packs (
  language text PRIMARY KEY,
  base_version text NOT NULL,
  pack jsonb NOT NULL,
  string_count integer NOT NULL DEFAULT 0,
  built_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.language_packs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS language_packs_public_read ON public.language_packs;
CREATE POLICY language_packs_public_read ON public.language_packs FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.language_packs TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
