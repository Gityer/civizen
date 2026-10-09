-- Phase 0 trust hardening (S4): profile rows were readable by anyone on the internet (date of birth,
-- place of birth, phone, official id and the generated identity number included).
--
-- Guest surfaces (job board, consultation directory and tallies, Stories list, directory search) read
-- through SECURITY DEFINER functions, so they keep working. Direct table reads now need a signed-in
-- member. Anonymous visitors never write profiles directly (the sign-up trigger runs as the auth admin).

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by signed-in members" ON public.profiles;
CREATE POLICY "Profiles are viewable by signed-in members" ON public.profiles
  FOR SELECT TO authenticated USING (true);

REVOKE ALL ON public.profiles FROM anon;
