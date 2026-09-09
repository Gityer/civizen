-- Consultation public participation (aggregates + optional directory).
-- Preserves one effective ballot and private individual choices.
-- Does NOT publish United World or expose emails / IDs / ballot options.

CREATE TABLE IF NOT EXISTS public.civic_consultation_public_presence (
  election_id uuid NOT NULL REFERENCES public.civic_elections(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visible boolean NOT NULL DEFAULT false,
  consented_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (election_id, profile_id)
);

COMMENT ON TABLE public.civic_consultation_public_presence IS
  'Optional public participant directory consent per consultation election. Default off. Listing shows consented display name + country only — never ballot choice, email, or internal IDs. Withdrawal hides from future directory reads immediately.';

CREATE INDEX IF NOT EXISTS civic_consultation_public_presence_visible_idx
  ON public.civic_consultation_public_presence (election_id)
  WHERE visible = true;

DO $$
BEGIN
  CREATE TRIGGER update_civic_consultation_public_presence_updated_at
    BEFORE UPDATE ON public.civic_consultation_public_presence
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.civic_consultation_public_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own consultation public presence select" ON public.civic_consultation_public_presence;
CREATE POLICY "Own consultation public presence select"
  ON public.civic_consultation_public_presence FOR SELECT TO authenticated
  USING (profile_id = public.current_profile_id());

DROP POLICY IF EXISTS "Own consultation public presence insert" ON public.civic_consultation_public_presence;
CREATE POLICY "Own consultation public presence insert"
  ON public.civic_consultation_public_presence FOR INSERT TO authenticated
  WITH CHECK (profile_id = public.current_profile_id());

DROP POLICY IF EXISTS "Own consultation public presence update" ON public.civic_consultation_public_presence;
CREATE POLICY "Own consultation public presence update"
  ON public.civic_consultation_public_presence FOR UPDATE TO authenticated
  USING (profile_id = public.current_profile_id())
  WITH CHECK (profile_id = public.current_profile_id());

GRANT SELECT, INSERT, UPDATE ON public.civic_consultation_public_presence TO authenticated;
REVOKE ALL ON public.civic_consultation_public_presence FROM anon;

-- Thresholds aligned with wellbeing aggregate privacy (minCohort 25, smallCellMin 5).
CREATE OR REPLACE FUNCTION public.civic_election_country_stats(p_election_id uuid)
RETURNS TABLE (
  country_code text,
  participant_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_with_country bigint;
  v_min_cohort int := 25;
  v_small_cell int := 5;
BEGIN
  IF p_election_id IS NULL THEN
    RETURN;
  END IF;

  SELECT count(*) INTO v_with_country
  FROM public.civic_ballots b
  JOIN public.civic_elections e ON e.id = b.election_id
  JOIN public.profiles p ON p.id = b.profile_id
  WHERE b.election_id = p_election_id
    AND b.is_countable
    AND NOT coalesce(b.is_duress, false)
    AND coalesce(e.metadata->>'sample_batch', '') = ''
    AND coalesce(e.metadata->>'catalog', 'live') <> 'demo'
    AND p.deleted_at IS NULL
    AND nullif(upper(trim(coalesce(p.country_code, ''))), '') IS NOT NULL
    AND upper(trim(p.country_code)) NOT IN ('GLOBAL', 'WW', 'XZ', 'UN');

  IF v_with_country < v_min_cohort THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    upper(trim(p.country_code)) AS country_code,
    count(*)::bigint AS participant_count
  FROM public.civic_ballots b
  JOIN public.civic_elections e ON e.id = b.election_id
  JOIN public.profiles p ON p.id = b.profile_id
  WHERE b.election_id = p_election_id
    AND b.is_countable
    AND NOT coalesce(b.is_duress, false)
    AND coalesce(e.metadata->>'sample_batch', '') = ''
    AND coalesce(e.metadata->>'catalog', 'live') <> 'demo'
    AND p.deleted_at IS NULL
    AND nullif(upper(trim(coalesce(p.country_code, ''))), '') IS NOT NULL
    AND upper(trim(p.country_code)) NOT IN ('GLOBAL', 'WW', 'XZ', 'UN')
  GROUP BY upper(trim(p.country_code))
  HAVING count(*) >= v_small_cell
  ORDER BY count(*) DESC, upper(trim(p.country_code)) ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.civic_election_public_directory(p_election_id uuid)
RETURNS TABLE (
  display_name text,
  country_code text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.matter_profile_display_name(pr.profile_id) AS display_name,
    CASE
      WHEN nullif(upper(trim(coalesce(p.country_code, ''))), '') IS NULL THEN NULL
      WHEN upper(trim(p.country_code)) IN ('GLOBAL', 'WW', 'XZ', 'UN') THEN NULL
      ELSE upper(trim(p.country_code))
    END AS country_code
  FROM public.civic_consultation_public_presence pr
  JOIN public.civic_ballots b
    ON b.election_id = pr.election_id
   AND b.profile_id = pr.profile_id
  JOIN public.profiles p ON p.id = pr.profile_id
  JOIN public.civic_elections e ON e.id = pr.election_id
  WHERE pr.election_id = p_election_id
    AND pr.visible = true
    AND b.is_countable
    AND NOT coalesce(b.is_duress, false)
    AND coalesce(e.metadata->>'sample_batch', '') = ''
    AND coalesce(e.metadata->>'catalog', 'live') <> 'demo'
    AND p.deleted_at IS NULL
  ORDER BY pr.consented_at ASC NULLS LAST, pr.created_at ASC
  LIMIT 200;
$$;

CREATE OR REPLACE FUNCTION public.my_consultation_public_presence(p_election_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((
    SELECT visible
    FROM public.civic_consultation_public_presence
    WHERE election_id = p_election_id
      AND profile_id = public.current_profile_id()
  ), false);
$$;

CREATE OR REPLACE FUNCTION public.set_consultation_public_presence(
  p_election_id uuid,
  p_visible boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_has_ballot boolean;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF p_election_id IS NULL THEN
    RAISE EXCEPTION 'election_required';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.civic_ballots b
    JOIN public.civic_elections e ON e.id = b.election_id
    WHERE b.election_id = p_election_id
      AND b.profile_id = v_self
      AND b.is_countable
      AND NOT coalesce(b.is_duress, false)
      AND coalesce(e.metadata->>'sample_batch', '') = ''
  ) INTO v_has_ballot;

  IF p_visible AND NOT v_has_ballot THEN
    RAISE EXCEPTION 'ballot_required_for_directory';
  END IF;

  INSERT INTO public.civic_consultation_public_presence (
    election_id, profile_id, visible, consented_at, withdrawn_at
  ) VALUES (
    p_election_id,
    v_self,
    coalesce(p_visible, false),
    CASE WHEN coalesce(p_visible, false) THEN now() ELSE NULL END,
    CASE WHEN coalesce(p_visible, false) THEN NULL ELSE now() END
  )
  ON CONFLICT (election_id, profile_id) DO UPDATE
  SET
    visible = coalesce(p_visible, false),
    consented_at = CASE
      WHEN coalesce(p_visible, false) THEN coalesce(civic_consultation_public_presence.consented_at, now())
      ELSE civic_consultation_public_presence.consented_at
    END,
    withdrawn_at = CASE
      WHEN coalesce(p_visible, false) THEN NULL
      ELSE now()
    END,
    updated_at = now();

  RETURN coalesce(p_visible, false);
END;
$$;

-- Owner-read hygiene: profile_id is profiles.id, not auth.uid().
DROP POLICY IF EXISTS "Voters can read own civic_ballots" ON public.civic_ballots;
DROP POLICY IF EXISTS "Voters read own ballots" ON public.civic_ballots;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'civic_ballots'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Voters can read own civic_ballots"
        ON public.civic_ballots FOR SELECT TO authenticated
        USING (profile_id = public.current_profile_id())
    $pol$;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

REVOKE ALL ON FUNCTION public.civic_election_country_stats(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.civic_election_public_directory(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_consultation_public_presence(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_consultation_public_presence(uuid, boolean) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.civic_election_country_stats(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.civic_election_public_directory(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_consultation_public_presence(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_consultation_public_presence(uuid, boolean) TO authenticated;
