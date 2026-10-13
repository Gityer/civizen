-- v2 plan step B4: the first ten minutes. One call tells Home which first steps the signed-in member has taken, so
-- the Getting started card can show what is left (read a lesson, vote, raise or join a Matter, verify, add a photo
-- or a short bio) and disappear once everything is done.

CREATE OR REPLACE FUNCTION public.my_getting_started()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := public.current_profile_id();
  v_profile public.profiles%ROWTYPE;
BEGIN
  IF v_me IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_me;
  RETURN jsonb_build_object(
    'lesson', EXISTS (
      SELECT 1 FROM public.study_progress s
       WHERE s.profile_id = v_me AND s.completed_at IS NOT NULL AND s.document_key LIKE 'path:%'
    ),
    'voted', EXISTS (SELECT 1 FROM public.civic_ballots b WHERE b.profile_id = v_me),
    'vote_counts', EXISTS (SELECT 1 FROM public.civic_ballots b WHERE b.profile_id = v_me AND b.is_countable),
    'matter', EXISTS (SELECT 1 FROM public.matters m WHERE m.created_by_profile_id = v_me)
           OR EXISTS (SELECT 1 FROM public.matter_comments c WHERE c.author_profile_id = v_me),
    'verification_started', coalesce(v_profile.is_verified, false) OR EXISTS (
      SELECT 1 FROM public.identity_verification_cases c
       WHERE c.profile_id = v_me AND c.status IN ('submitted', 'in_review', 'approved')
    ),
    'verified', coalesce(v_profile.is_verified, false),
    'profile', nullif(btrim(coalesce(v_profile.avatar_url, '')), '') IS NOT NULL
            OR nullif(btrim(coalesce(v_profile.bio, '')), '') IS NOT NULL,
    'open_election_id', (
      SELECT e.id FROM public.civic_elections e
       WHERE e.status = 'open' AND e.voting_closes_at > now()
       ORDER BY e.voting_closes_at
       LIMIT 1
    )
  );
END;
$$;
REVOKE ALL ON FUNCTION public.my_getting_started() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_getting_started() TO authenticated;
