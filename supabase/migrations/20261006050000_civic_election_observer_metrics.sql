-- Observer console metrics: aggregate process counts for one election.
-- No voter identities, no ballot choices. Replaces the hard-coded demo numbers the
-- Observer page showed until now. Returns NULL for an unknown election.

CREATE OR REPLACE FUNCTION public.civic_election_observer_metrics(p_election_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM public.civic_elections e WHERE e.id = p_election_id) THEN NULL
    ELSE jsonb_build_object(
      'eligible_roster_count', (
        SELECT count(*) FROM public.civic_voter_eligibility v
        WHERE v.election_id = p_election_id AND v.is_eligible
      ),
      'ballots_countable', (
        SELECT count(*) FROM public.civic_ballots b
        WHERE b.election_id = p_election_id AND b.is_countable AND NOT coalesce(b.is_duress, false)
      ),
      'ballots_withdrawn', (
        SELECT count(*) FROM public.civic_ballots b
        WHERE b.election_id = p_election_id AND NOT b.is_countable
      ),
      'sessions_by_status', (
        SELECT coalesce(jsonb_object_agg(s.session_status, s.n), '{}'::jsonb)
        FROM (
          SELECT vs.status::text AS session_status, count(*) AS n
          FROM public.civic_vote_sessions vs
          WHERE vs.election_id = p_election_id
          GROUP BY vs.status
        ) s
      ),
      'average_attempts_cast', (
        SELECT avg(vs.attempt_number) FROM public.civic_vote_sessions vs
        WHERE vs.election_id = p_election_id AND vs.status = 'cast'
      ),
      'gate_checks', (
        SELECT coalesce(
          jsonb_agg(jsonb_build_object('kind', g.kind, 'result', g.result, 'count', g.n) ORDER BY g.kind, g.result),
          '[]'::jsonb
        )
        FROM (
          SELECT vc.check_kind::text AS kind, vc.result::text AS result, count(*) AS n
          FROM public.civic_verification_checks vc
          JOIN public.civic_vote_sessions vs ON vs.id = vc.session_id
          WHERE vs.election_id = p_election_id
          GROUP BY vc.check_kind, vc.result
        ) g
      ),
      'risk_findings_by_severity', (
        SELECT coalesce(jsonb_object_agg(r.severity_key, r.n), '{}'::jsonb)
        FROM (
          SELECT rf.severity::text AS severity_key, count(*) AS n
          FROM public.civic_risk_findings rf
          WHERE rf.election_id = p_election_id
          GROUP BY rf.severity
        ) r
      ),
      'canvass_samples', (
        SELECT count(*) FROM public.civic_canvass_samples c WHERE c.election_id = p_election_id
      ),
      'canvass_reviewed', (
        SELECT count(*) FROM public.civic_canvass_samples c
        WHERE c.election_id = p_election_id AND c.reviewed_at IS NOT NULL
      ),
      'events_recorded', (
        SELECT count(*) FROM public.civic_voting_events ev WHERE ev.election_id = p_election_id
      ),
      'is_sample', (
        SELECT coalesce(e.metadata->>'sample_batch', '') <> ''
        FROM public.civic_elections e WHERE e.id = p_election_id
      )
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.civic_election_observer_metrics(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.civic_election_observer_metrics(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.civic_election_observer_metrics(uuid) IS
  'Aggregate observer metrics for one civic election (roster, ballots, sessions, gates, risk, canvass, events). Never returns identities or choices.';

NOTIFY pgrst, 'reload schema';
