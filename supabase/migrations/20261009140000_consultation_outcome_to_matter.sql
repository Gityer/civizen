-- Phase 2 step 2.2: the outcome of a consultation returns to the Matter it came from.
-- When an election closes, every proposal published from a Matter writes a system event with the
-- final outcome and tally, records a Decision on the Matter, and opens an outcome follow-up for the
-- Matter's responsible party (reusing the Phase 3 outcome follow-up flow). Publishing a proposal
-- from a Matter that is not public makes the Matter public, because the consultation is.

CREATE OR REPLACE FUNCTION public.civic_consultation_outcome_statement(p_outcome jsonb, p_tally jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN jsonb_typeof(p_outcome->'passed') = 'boolean' AND (p_outcome->>'passed')::boolean THEN
      format('Passed: %s%% support among Support and Oppose ballots (threshold %s%%, %s countable ballots).',
        coalesce(p_outcome->>'support_share_percent', '0'), coalesce(p_outcome->>'pass_threshold_percent', '50'),
        coalesce(p_outcome->>'total_countable', '0'))
    WHEN jsonb_typeof(p_outcome->'passed') = 'boolean' AND coalesce((p_outcome->>'quorum_met')::boolean, true) = false THEN
      format('Quorum not met: %s of %s countable ballots needed.',
        coalesce(p_outcome->>'total_countable', '0'), coalesce(p_outcome->>'quorum', '?'))
    WHEN jsonb_typeof(p_outcome->'passed') = 'boolean' THEN
      format('Not passed: %s%% support among Support and Oppose ballots (threshold %s%%, %s countable ballots).',
        coalesce(p_outcome->>'support_share_percent', '0'), coalesce(p_outcome->>'pass_threshold_percent', '50'),
        coalesce(p_outcome->>'total_countable', '0'))
    WHEN nullif(p_outcome->>'leading_option_key', '') IS NOT NULL THEN
      format('Most chosen: %s (%s countable ballots).',
        coalesce((SELECT t->>'display_name' FROM jsonb_array_elements(coalesce(p_tally, '[]'::jsonb)) t
                  WHERE t->>'option_key' = p_outcome->>'leading_option_key' LIMIT 1), p_outcome->>'leading_option_key'),
        coalesce(p_outcome->>'total_countable', '0'))
    ELSE 'No countable ballots.'
  END;
$$;

CREATE OR REPLACE FUNCTION public.civic_consultation_outcome_to_matter(p_election_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_election public.civic_elections%ROWTYPE;
  v_prop public.civic_voting_proposals%ROWTYPE;
  v_matter public.matters%ROWTYPE;
  v_outcome jsonb;
  v_tally jsonb;
  v_statement text;
  v_status text;
  v_count integer := 0;
  v_followup uuid;
  v_action uuid;
BEGIN
  SELECT * INTO v_election FROM public.civic_elections WHERE id = p_election_id;
  IF NOT FOUND OR v_election.status <> 'closed' THEN
    RETURN 0;
  END IF;
  IF coalesce(v_election.metadata->>'sample_batch', '') <> '' OR coalesce(v_election.metadata->>'catalog', 'live') = 'demo' THEN
    RETURN 0;
  END IF;
  v_outcome := coalesce(v_election.metadata->'final_outcome', '{}'::jsonb);
  v_tally := coalesce(v_election.metadata->'final_tally', '[]'::jsonb);
  v_statement := public.civic_consultation_outcome_statement(v_outcome, v_tally);
  v_status := CASE
    WHEN jsonb_typeof(v_outcome->'passed') = 'boolean' THEN CASE WHEN (v_outcome->>'passed')::boolean THEN 'accepted' ELSE 'rejected' END
    WHEN nullif(v_outcome->>'leading_option_key', '') IS NOT NULL THEN 'accepted'
    ELSE 'rejected'
  END;

  FOR v_prop IN SELECT * FROM public.civic_voting_proposals p WHERE p.election_id = p_election_id LOOP
    SELECT * INTO v_matter FROM public.matters WHERE id = v_prop.matter_id;
    IF NOT FOUND THEN CONTINUE; END IF;
    -- Once per election and Matter.
    IF EXISTS (
      SELECT 1 FROM public.matter_events e
      WHERE e.matter_id = v_matter.id AND e.event_type = 'consultation_closed'
        AND e.payload->>'election_id' = p_election_id::text
    ) THEN CONTINUE; END IF;

    PERFORM public.matter_log_event(
      v_matter.id, 'consultation_closed',
      'Consultation closed: ' || v_election.title || '. ' || v_statement,
      'system', NULL, true,
      jsonb_build_object('election_id', p_election_id, 'proposal_id', v_prop.id, 'final_outcome', v_outcome, 'final_tally', v_tally)
    );

    INSERT INTO public.matter_decisions (
      matter_id, title, statement, rationale, status, proposed_by_kind, proposed_by_profile_id, decided_at
    ) VALUES (
      v_matter.id, left('Consultation result: ' || v_election.title, 160), v_statement,
      'Recorded automatically from the closed consultation.', v_status, 'person', v_prop.created_by_profile_id, now()
    );

    IF v_matter.lifecycle_status <> 'closed' THEN
      INSERT INTO public.matter_outcome_followups (
        matter_id, review_due_at, outcome_question, reviewer_kind, reviewer_profile_id, status, created_by_profile_id
      ) VALUES (
        v_matter.id, now(), 'What follows from the consultation result? ' || v_statement,
        CASE WHEN v_matter.responsible_kind IN ('person', 'organization', 'group') THEN v_matter.responsible_kind ELSE 'person' END,
        v_matter.responsible_profile_id, 'pending', v_prop.created_by_profile_id
      )
      RETURNING id INTO v_followup;
      v_action := public.matter_assign_action(
        v_matter.id, 'outcome_followup', v_matter.responsible_kind, v_matter.responsible_profile_id,
        NULL, 'outcome_followup', 'remind', 'outcome', v_followup
      );
      UPDATE public.matter_outcome_followups SET action_id = v_action WHERE id = v_followup;
    END IF;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.civic_consultation_outcome_to_matter(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.civic_election_closed_to_matter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.civic_consultation_outcome_to_matter(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS civic_election_closed_to_matter ON public.civic_elections;
CREATE TRIGGER civic_election_closed_to_matter
  AFTER UPDATE OF status ON public.civic_elections
  FOR EACH ROW
  WHEN (NEW.status = 'closed' AND OLD.status IS DISTINCT FROM 'closed')
  EXECUTE FUNCTION public.civic_election_closed_to_matter();

-- Consultations that closed before this migration.
SELECT public.civic_consultation_outcome_to_matter(e.id)
FROM public.civic_elections e
WHERE e.status = 'closed'
  AND e.metadata ? 'final_outcome'
  AND EXISTS (SELECT 1 FROM public.civic_voting_proposals p WHERE p.election_id = e.id);

-- ---------------------------------------------------------------------------------------------
-- Publishing makes the Matter public
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_voting_proposal(p_proposal_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_prop public.civic_voting_proposals%ROWTYPE;
  v_matter public.matters%ROWTYPE;
  v_ready boolean;
  v_election_id uuid;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  SELECT * INTO v_prop FROM public.civic_voting_proposals WHERE id = p_proposal_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'proposal_not_found';
  END IF;

  IF NOT public.civic_can_manage_voting_proposals(v_self) THEN
    IF v_prop.created_by_profile_id <> v_self THEN
      RAISE EXCEPTION 'not_authorized_to_publish';
    END IF;
    IF NOT coalesce((SELECT p.is_verified FROM public.profiles p WHERE p.id = v_self), false) THEN
      RAISE EXCEPTION 'verification_required';
    END IF;
    v_ready := (SELECT count(*) FROM public.civic_voting_proposal_support s
                WHERE s.proposal_id = p_proposal_id AND s.profile_id IS DISTINCT FROM v_prop.created_by_profile_id)
               >= public.voting_proposal_support_threshold(p_proposal_id);
    IF NOT v_ready THEN
      RAISE EXCEPTION 'not_authorized_to_publish';
    END IF;
  END IF;

  v_election_id := public.publish_voting_proposal_core(p_proposal_id);

  SELECT * INTO v_matter FROM public.matters WHERE id = v_prop.matter_id;
  IF FOUND AND v_matter.visibility <> 'public' THEN
    UPDATE public.matters SET visibility = 'public', updated_at = now() WHERE id = v_matter.id;
    PERFORM public.matter_log_event(
      v_matter.id, 'made_public_for_consultation',
      'Made public: a consultation was published from this Matter.',
      'system', NULL, true,
      jsonb_build_object('proposal_id', p_proposal_id, 'election_id', v_election_id, 'previous_visibility', v_matter.visibility)
    );
  END IF;
  RETURN v_election_id;
END;
$$;
REVOKE ALL ON FUNCTION public.publish_voting_proposal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_voting_proposal(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
