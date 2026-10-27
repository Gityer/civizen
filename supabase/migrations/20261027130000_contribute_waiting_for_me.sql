-- Contribute hub (plan step D4): what is waiting for the signed-in member, and how much there is in each lane, in
-- one call instead of one call per proposal and per election.
--   actions_due          open Matter actions assigned to the member (or to an organisation they manage) on live Matters
--   proposals_to_support drafts open for support that the member did not write and has not supported
--   ballots_open         consultations open now that the member may vote in and has not voted in
--   challenges           community challenges taking part now (active, not demo)
--   knowledge            shared knowledge spaces (not demo)
-- Counts only; no rows, no choices, no other member's data.

CREATE OR REPLACE FUNCTION public.contribute_waiting_for_me()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := public.current_profile_id();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'actions_due', (
      SELECT count(*) FROM public.matter_action_requirements a
        JOIN public.matters m ON m.id = a.matter_id
       WHERE a.status IN ('pending', 'overdue')
         AND m.lifecycle_status IN ('submitted', 'active')
         AND a.assigned_kind <> 'ai_agent'
         AND public.current_profile_represents_actor(a.assigned_kind, a.assigned_profile_id)),
    'proposals_to_support', (
      SELECT count(*) FROM public.civic_voting_proposals p
       WHERE p.status = 'draft'
         AND coalesce((p.metadata ->> 'open_for_support')::boolean, false)
         AND p.created_by_profile_id IS DISTINCT FROM v_me
         AND NOT EXISTS (SELECT 1 FROM public.civic_voting_proposal_support s
                          WHERE s.proposal_id = p.id AND s.profile_id = v_me)),
    'ballots_open', (
      SELECT count(*) FROM public.civic_elections e
       WHERE e.status = 'open'
         AND now() BETWEEN e.voting_opens_at AND e.voting_closes_at
         AND e.metadata ->> 'sample_batch' IS NULL
         AND coalesce(e.metadata ->> 'catalog', '') <> 'demo'
         AND NOT EXISTS (SELECT 1 FROM public.civic_ballots b
                          WHERE b.election_id = e.id AND b.profile_id = v_me
                            AND NOT coalesce((b.metadata ->> 'withdrawn')::boolean, false))
         AND public.consultation_eligibility_reason(e.id, v_me) IS NULL),
    'challenges', (
      SELECT count(*) FROM public.community_challenges c
       WHERE c.status = 'active' AND NOT c.is_demo),
    'knowledge', (
      SELECT count(*) FROM public.knowledge_spaces k
       WHERE k.status = 'shared' AND NOT k.is_demo)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.contribute_waiting_for_me() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contribute_waiting_for_me() TO authenticated;
