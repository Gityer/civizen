-- "Hide this post" on the Home feed: a private, per-member list. Only the member sees or changes it.
CREATE TABLE IF NOT EXISTS public.post_hides (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, post_id)
);

ALTER TABLE public.post_hides ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.post_hides FROM anon;
GRANT SELECT, INSERT, DELETE ON public.post_hides TO authenticated;

DROP POLICY IF EXISTS "Members read own post hides" ON public.post_hides;
CREATE POLICY "Members read own post hides" ON public.post_hides
  FOR SELECT TO authenticated USING (profile_id = public.current_profile_id());

DROP POLICY IF EXISTS "Members add own post hides" ON public.post_hides;
CREATE POLICY "Members add own post hides" ON public.post_hides
  FOR INSERT TO authenticated WITH CHECK (profile_id = public.current_profile_id());

DROP POLICY IF EXISTS "Members remove own post hides" ON public.post_hides;
CREATE POLICY "Members remove own post hides" ON public.post_hides
  FOR DELETE TO authenticated USING (profile_id = public.current_profile_id());
