-- Owner-read hygiene for consultation ballots: profile_id is profiles.id.
DROP POLICY IF EXISTS "Civic ballots owner read status only" ON public.civic_ballots;
CREATE POLICY "Civic ballots owner read status only"
  ON public.civic_ballots FOR SELECT TO authenticated
  USING (profile_id = public.current_profile_id());
