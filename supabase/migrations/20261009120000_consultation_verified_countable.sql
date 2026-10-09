-- Decision D2 (2026-10-09): everyone may vote in an ordinary consultation, but only ballots from
-- verified identities are countable. Ballots from unverified accounts are kept as advisory: the
-- voter sees their own choice and receipt, the public split shows them separately, and they are
-- promoted to countable the moment the voter's identity verification is approved.
-- Proposal rules: the author's own support does not count toward the threshold, and a member
-- publishes a proposal only with a verified identity.

-- ---------------------------------------------------------------------------------------------
-- 1. Consultation ballots: countable only for verified voters (trigger on civic_ballots)
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consultation_ballot_apply_verified_countable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verified boolean;
BEGIN
  -- Only consultation ballots that are being recorded as countable are subject to the rule.
  IF coalesce((NEW.metadata->>'consultation')::boolean, false) IS NOT TRUE OR NOT NEW.is_countable THEN
    RETURN NEW;
  END IF;
  SELECT coalesce(p.is_verified, false) INTO v_verified
  FROM public.profiles p
  WHERE p.id = NEW.profile_id;
  IF coalesce(v_verified, false) THEN
    NEW.metadata := NEW.metadata - 'advisory';
    RETURN NEW;
  END IF;
  NEW.is_countable := false;
  NEW.metadata := coalesce(NEW.metadata, '{}'::jsonb) || jsonb_build_object('advisory', true);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS consultation_ballot_verified_countable ON public.civic_ballots;
CREATE TRIGGER consultation_ballot_verified_countable
  BEFORE INSERT OR UPDATE ON public.civic_ballots
  FOR EACH ROW
  EXECUTE FUNCTION public.consultation_ballot_apply_verified_countable();

-- Existing consultation ballots from unverified voters become advisory.
UPDATE public.civic_ballots b
SET is_countable = false,
    metadata = coalesce(b.metadata, '{}'::jsonb) || '{"advisory": true}'::jsonb
FROM public.profiles p
WHERE p.id = b.profile_id
  AND coalesce((b.metadata->>'consultation')::boolean, false)
  AND b.is_countable
  AND NOT coalesce(p.is_verified, false);

-- ---------------------------------------------------------------------------------------------
-- 2. Own ballot: advisory ballots stay visible to their voter
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_consultation_ballot(p_election_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'option_key', (SELECT k FROM public.civic_choice_keys(public.civic_unseal_choice(b.election_id, b.encrypted_payload)) k LIMIT 1),
    'option_keys', coalesce((SELECT jsonb_agg(k) FROM public.civic_choice_keys(public.civic_unseal_choice(b.election_id, b.encrypted_payload)) k), '[]'::jsonb),
    'receipt', b.ballot_commitment,
    'cast_at', b.cast_at,
    'advisory', NOT b.is_countable
  )
  FROM public.civic_ballots b
  WHERE b.election_id = p_election_id
    AND b.profile_id = public.current_profile_id()
    AND (b.is_countable OR coalesce((b.metadata->>'advisory')::boolean, false))
    AND NOT coalesce((b.metadata->>'withdrawn')::boolean, false)
    AND NOT coalesce(b.is_duress, false)
    AND b.encrypted_payload IS NOT NULL
  ORDER BY b.cast_at DESC
  LIMIT 1;
$$;

-- Eligibility tells the client up front whether this voter's ballot will be advisory.
CREATE OR REPLACE FUNCTION public.my_consultation_eligibility(p_election_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'eligible', r.reason IS NULL,
    'reason', r.reason,
    'advisory', r.reason IS NULL AND NOT coalesce((SELECT p.is_verified FROM public.profiles p WHERE p.id = public.current_profile_id()), false)
  )
  FROM (SELECT public.consultation_eligibility_reason(p_election_id, public.current_profile_id()) AS reason) r;
$$;

-- ---------------------------------------------------------------------------------------------
-- 3. Withdraw: advisory ballots can be withdrawn like countable ones
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.withdraw_consultation_ballot(p_election_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_election public.civic_elections%ROWTYPE;
  v_ballot public.civic_ballots%ROWTYPE;
  v_live boolean;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF p_election_id IS NULL THEN
    RAISE EXCEPTION 'election_required';
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
    RAISE EXCEPTION 'consultation_withdraw_ordinary_only';
  END IF;

  SELECT * INTO v_ballot
  FROM public.civic_ballots
  WHERE election_id = p_election_id AND profile_id = v_self
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ballot_not_found';
  END IF;

  v_live := (v_ballot.is_countable OR coalesce((v_ballot.metadata->>'advisory')::boolean, false))
            AND NOT coalesce((v_ballot.metadata->>'withdrawn')::boolean, false)
            AND NOT coalesce(v_ballot.is_duress, false)
            AND v_ballot.encrypted_payload IS NOT NULL;
  IF NOT v_live THEN
    UPDATE public.civic_consultation_public_presence
    SET visible = false, withdrawn_at = coalesce(withdrawn_at, now()), updated_at = now()
    WHERE election_id = p_election_id AND profile_id = v_self AND visible = true;
    RETURN false;
  END IF;

  UPDATE public.civic_ballots
  SET
    is_countable = false,
    cast_at = now(),
    encrypted_payload = NULL,
    metadata = jsonb_build_object('consultation', true, 'withdrawn', true, 'withdrawn_at', now())
  WHERE id = v_ballot.id;

  DELETE FROM public.civic_ballot_selections WHERE ballot_id = v_ballot.id;

  UPDATE public.civic_vote_sessions
  SET status = 'voided', metadata = jsonb_build_object('consultation', true, 'withdrawn', true, 'withdrawn_at', now())
  WHERE id = v_ballot.session_id;

  UPDATE public.civic_consultation_public_presence
  SET visible = false, withdrawn_at = now(), updated_at = now()
  WHERE election_id = p_election_id AND profile_id = v_self AND visible = true;

  PERFORM public.civic_append_election_event(
    p_election_id, 'consultation_withdrawn', jsonb_build_object('receipt', v_ballot.ballot_commitment)
  );
  RETURN true;
END;
$$;

-- ---------------------------------------------------------------------------------------------
-- 4. Public split: countable ballots versus advisory ballots
-- ---------------------------------------------------------------------------------------------
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
    count(*) FILTER (WHERE b.is_countable)::bigint AS verified_count,
    count(*) FILTER (WHERE NOT b.is_countable)::bigint AS unverified_count
  FROM public.civic_ballots b
  JOIN public.civic_elections e ON e.id = b.election_id
  JOIN public.profiles p ON p.id = b.profile_id
  WHERE b.election_id = p_election_id
    AND (b.is_countable OR coalesce((b.metadata->>'advisory')::boolean, false))
    AND NOT coalesce((b.metadata->>'withdrawn')::boolean, false)
    AND b.encrypted_payload IS NOT NULL
    AND NOT coalesce(b.is_duress, false)
    AND coalesce(e.metadata->>'sample_batch', '') = ''
    AND coalesce(e.metadata->>'catalog', 'live') <> 'demo'
    AND p.deleted_at IS NULL;
$$;

-- ---------------------------------------------------------------------------------------------
-- 5. Verification approval promotes advisory ballots on open consultations
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.project_profile_verification_state(target_profile_id uuid)
RETURNS void AS $$
DECLARE
  active_case public.identity_verification_cases%ROWTYPE;
  projected_verified boolean := false;
BEGIN
  IF target_profile_id IS NULL THEN
    RETURN;
  END IF;

  SELECT *
  INTO active_case
  FROM public.identity_verification_cases
  WHERE profile_id = target_profile_id
  LIMIT 1;

  IF active_case.id IS NOT NULL THEN
    projected_verified := active_case.status = 'approved'::public.identity_verification_case_status;
  END IF;

  UPDATE public.profiles
  SET
    is_verified = projected_verified,
    citizenship_review_cleared_at = CASE
      WHEN projected_verified THEN coalesce(citizenship_review_cleared_at, active_case.reviewed_at, active_case.resolved_at, now())
      ELSE citizenship_review_cleared_at
    END
  WHERE id = target_profile_id;

  IF projected_verified THEN
    -- Advisory ballots on consultations that are still open now count (trigger re-checks the profile).
    UPDATE public.civic_ballots b
    SET is_countable = true,
        metadata = (b.metadata - 'advisory') || '{"promoted": true}'::jsonb
    FROM public.civic_elections e
    WHERE e.id = b.election_id
      AND b.profile_id = target_profile_id
      AND coalesce((b.metadata->>'advisory')::boolean, false)
      AND NOT coalesce((b.metadata->>'withdrawn')::boolean, false)
      AND b.encrypted_payload IS NOT NULL
      AND e.status = 'open'
      AND now() <= e.voting_closes_at;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------------------------
-- 6. Proposal support: the author's own support never counts toward the threshold
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.voting_proposal_support_summary(p_proposal_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'count', (SELECT count(*) FROM public.civic_voting_proposal_support s
              WHERE s.proposal_id = p_proposal_id AND s.profile_id IS DISTINCT FROM p.created_by_profile_id),
    'threshold', public.voting_proposal_support_threshold(p_proposal_id),
    'open_for_support', coalesce((p.metadata->>'open_for_support')::boolean, false),
    'supported', EXISTS (
      SELECT 1 FROM public.civic_voting_proposal_support s
      WHERE s.proposal_id = p_proposal_id AND s.profile_id = public.current_profile_id()
    ),
    'is_author', p.created_by_profile_id = public.current_profile_id(),
    'ready', (SELECT count(*) FROM public.civic_voting_proposal_support s
              WHERE s.proposal_id = p_proposal_id AND s.profile_id IS DISTINCT FROM p.created_by_profile_id)
             >= public.voting_proposal_support_threshold(p_proposal_id)
  )
  FROM public.civic_voting_proposals p
  WHERE p.id = p_proposal_id;
$$;

CREATE OR REPLACE FUNCTION public.toggle_voting_proposal_support(p_proposal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_prop public.civic_voting_proposals%ROWTYPE;
BEGIN
  IF v_self IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_self AND p.deleted_at IS NOT NULL) THEN
    RAISE EXCEPTION 'profile_unavailable';
  END IF;
  IF public.profile_has_governance_block(v_self, 'proposal_create'::public.governance_block_scope) THEN
    RAISE EXCEPTION 'voter_blocked';
  END IF;
  SELECT * INTO v_prop FROM public.civic_voting_proposals WHERE id = p_proposal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'proposal_not_found'; END IF;
  IF v_prop.status <> 'draft' THEN RAISE EXCEPTION 'proposal_not_draft'; END IF;
  IF v_prop.created_by_profile_id = v_self THEN RAISE EXCEPTION 'author_cannot_support'; END IF;
  IF NOT coalesce((v_prop.metadata->>'open_for_support')::boolean, false) THEN
    RAISE EXCEPTION 'proposal_not_open_for_support';
  END IF;

  IF EXISTS (SELECT 1 FROM public.civic_voting_proposal_support WHERE proposal_id = p_proposal_id AND profile_id = v_self) THEN
    DELETE FROM public.civic_voting_proposal_support WHERE proposal_id = p_proposal_id AND profile_id = v_self;
  ELSE
    INSERT INTO public.civic_voting_proposal_support (proposal_id, profile_id) VALUES (p_proposal_id, v_self);
  END IF;

  RETURN public.voting_proposal_support_summary(p_proposal_id);
END;
$$;

-- ---------------------------------------------------------------------------------------------
-- 7. Publish: a member needs a verified identity and a threshold reached without their own support
-- ---------------------------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regprocedure('public.publish_voting_proposal_core(uuid)') IS NULL THEN
    ALTER FUNCTION public.publish_voting_proposal(uuid) RENAME TO publish_voting_proposal_core;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.publish_voting_proposal_core(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.publish_voting_proposal(p_proposal_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_prop public.civic_voting_proposals%ROWTYPE;
  v_ready boolean;
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

  RETURN public.publish_voting_proposal_core(p_proposal_id);
END;
$$;
REVOKE ALL ON FUNCTION public.publish_voting_proposal(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_voting_proposal(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
