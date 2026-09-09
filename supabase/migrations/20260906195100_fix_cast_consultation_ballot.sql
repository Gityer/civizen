-- Fix cast_consultation_ballot session column names (started_at, not opened_at).

CREATE OR REPLACE FUNCTION public.cast_consultation_ballot(
  p_election_id uuid,
  p_option_key text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_election public.civic_elections%ROWTYPE;
  v_candidate_id uuid;
  v_contest_id uuid;
  v_session_id uuid;
  v_ballot_id uuid;
  v_option text := lower(trim(coalesce(p_option_key, '')));
  v_is_abstain boolean;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF v_option NOT IN ('support', 'oppose', 'abstain') THEN
    RAISE EXCEPTION 'invalid_option';
  END IF;

  SELECT * INTO v_election FROM public.civic_elections WHERE id = p_election_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'election_not_found';
  END IF;
  IF coalesce(v_election.metadata->>'sample_batch', '') <> '' THEN
    RAISE EXCEPTION 'demo_not_votable';
  END IF;
  IF v_election.status <> 'open' OR now() < v_election.voting_opens_at OR now() > v_election.voting_closes_at THEN
    RAISE EXCEPTION 'election_not_open';
  END IF;
  IF v_election.security_class <> 'ordinary' THEN
    RAISE EXCEPTION 'consultation_cast_ordinary_only';
  END IF;

  SELECT c.id, c.contest_id INTO v_candidate_id, v_contest_id
  FROM public.civic_candidates c
  JOIN public.civic_contests ct ON ct.id = c.contest_id
  WHERE ct.election_id = p_election_id
    AND lower(c.option_key) = v_option
  LIMIT 1;

  IF v_candidate_id IS NULL THEN
    RAISE EXCEPTION 'option_not_found';
  END IF;

  v_is_abstain := (v_option = 'abstain');

  SELECT id INTO v_ballot_id
  FROM public.civic_ballots
  WHERE election_id = p_election_id AND profile_id = v_self
  LIMIT 1;

  IF v_ballot_id IS NULL THEN
    INSERT INTO public.civic_vote_sessions (
      election_id, profile_id, status, scheduled_for, started_at, completed_at, attempt_number, metadata
    ) VALUES (
      p_election_id, v_self, 'cast', now(), now(), now(), 1,
      jsonb_build_object('consultation', true, 'option_key', v_option)
    )
    RETURNING id INTO v_session_id;

    INSERT INTO public.civic_ballots (
      election_id, session_id, profile_id, ballot_commitment, is_countable, is_duress, cast_at, metadata
    ) VALUES (
      p_election_id,
      v_session_id,
      v_self,
      encode(sha256(convert_to(v_self::text || p_election_id::text || v_option || clock_timestamp()::text, 'UTF8')), 'hex'),
      true,
      false,
      now(),
      jsonb_build_object('consultation', true, 'option_key', v_option)
    )
    RETURNING id INTO v_ballot_id;

    INSERT INTO public.civic_ballot_selections (
      ballot_id, contest_id, candidate_id, is_abstain, rank
    ) VALUES (
      v_ballot_id, v_contest_id, v_candidate_id, v_is_abstain, 1
    );
  ELSE
    UPDATE public.civic_ballots
    SET
      cast_at = now(),
      is_countable = true,
      is_duress = false,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('consultation', true, 'option_key', v_option, 'changed', true)
    WHERE id = v_ballot_id;

    UPDATE public.civic_ballot_selections
    SET candidate_id = v_candidate_id, is_abstain = v_is_abstain, rank = 1
    WHERE ballot_id = v_ballot_id AND contest_id = v_contest_id;

    IF NOT FOUND THEN
      INSERT INTO public.civic_ballot_selections (
        ballot_id, contest_id, candidate_id, is_abstain, rank
      ) VALUES (
        v_ballot_id, v_contest_id, v_candidate_id, v_is_abstain, 1
      );
    END IF;
  END IF;

  RETURN v_ballot_id;
END;
$$;
