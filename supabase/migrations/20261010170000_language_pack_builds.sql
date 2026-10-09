-- Phase 8 step 8.2 follow-up: a language pack is built in resumable batches (the edge runtime limits one request to
-- about a minute, and a full catalog is 6,600 strings). Progress lives here; the finished pack moves to language_packs.
CREATE TABLE IF NOT EXISTS public.language_pack_builds (
  language text PRIMARY KEY,
  base_version text NOT NULL,
  translated jsonb NOT NULL DEFAULT '{}'::jsonb,
  done_count integer NOT NULL DEFAULT 0,
  total_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.language_pack_builds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.language_pack_builds FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
