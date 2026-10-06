-- Public consultation counts split by account verification.
-- Anyone with a free account can vote in an ordinary consultation, so duplicate accounts are
-- possible. Showing verified and not-yet-verified ballots separately keeps the headline honest
-- and lets a stricter reading be taken from the verified count. Aggregate only, no choices.

CREATE OR REPLACE FUNCTION public.civic_election_verification_split(p_election_id uuid)
RETURNS TABLE (
  verified_count bigint,
  unverified_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    count(*) FILTER (WHERE coalesce(p.is_verified, false))::bigint AS verified_count,
    count(*) FILTER (WHERE NOT coalesce(p.is_verified, false))::bigint AS unverified_count
  FROM public.civic_ballots b
  JOIN public.civic_elections e ON e.id = b.election_id
  JOIN public.profiles p ON p.id = b.profile_id
  WHERE b.election_id = p_election_id
    AND b.is_countable
    AND NOT coalesce(b.is_duress, false)
    AND coalesce(e.metadata->>'sample_batch', '') = ''
    AND coalesce(e.metadata->>'catalog', 'live') <> 'demo'
    AND p.deleted_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.civic_election_verification_split(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.civic_election_verification_split(uuid) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
