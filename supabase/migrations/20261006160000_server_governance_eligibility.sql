-- Governance eligibility is computed on the server.
--
-- Before: the app computed the endorsement score, wrote its own snapshot row and set
-- profiles.is_governance_eligible itself, so a modified client could make anyone eligible.
-- After: governance_score_for() computes the score with the same rules as src/lib/scoring.ts,
-- refresh_governance_eligibility() records the result, and the vote trigger checks the live score
-- and active sanctions at vote time. Members can no longer write their own snapshot or flag.

-- Same rules as calculateCivizenScore + normalizeGovernanceScoreForRole:
-- each pillar scores (average stars / 5) * 100 rounded to 0.1, the overall score is the mean of
-- pillars that have endorsements rounded to 0.1, and founders never fall below the minimum (70).
CREATE OR REPLACE FUNCTION public.governance_score_for(p_profile_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH pillar_scores AS (
    SELECT round(avg(e.stars)::numeric / 5 * 100, 1) AS score
    FROM public.endorsements e
    WHERE e.endorsed_id = p_profile_id AND NOT coalesce(e.is_hidden, false)
    GROUP BY e.pillar
  ),
  overall AS (
    SELECT coalesce(round(avg(score), 1), 0) AS score FROM pillar_scores
  )
  SELECT CASE
    WHEN (SELECT p.role::text FROM public.profiles p WHERE p.id = p_profile_id) = 'founder'
      THEN greatest(overall.score, 70)
    ELSE overall.score
  END
  FROM overall;
$$;

CREATE OR REPLACE FUNCTION public.governance_sanction_blocks(p_profile_id uuid, p_scope text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.governance_sanctions s
    WHERE s.profile_id = p_profile_id
      AND s.is_active
      AND s.starts_at <= now()
      AND (s.ends_at IS NULL OR s.ends_at > now())
      AND (
        s.blocks_governance_all
        OR (p_scope = 'vote' AND s.blocks_voting)
        OR (p_scope = 'proposal_create' AND s.blocks_proposal_creation)
      )
  );
$$;

-- Recomputes and stores eligibility. With no argument it refreshes the caller; staff with
-- role.assign or settings.manage may refresh anyone.
CREATE OR REPLACE FUNCTION public.refresh_governance_eligibility(p_profile_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target uuid;
  v_profile record;
  v_score numeric;
  v_reasons text[] := '{}';
  v_eligible boolean;
  v_now timestamptz := now();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;

  IF p_profile_id IS NULL THEN
    v_target := public.current_profile_id();
  ELSE
    v_target := p_profile_id;
    IF v_target IS DISTINCT FROM public.current_profile_id()
      AND NOT (public.has_permission('role.assign'::public.app_permission)
        OR public.has_permission('settings.manage'::public.app_permission)) THEN
      RAISE EXCEPTION 'Not allowed to refresh another member' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT id, role, is_verified, is_active_citizen, citizenship_status, is_governance_eligible, governance_eligible_at
  INTO v_profile
  FROM public.profiles
  WHERE id = v_target AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
  END IF;

  v_score := public.governance_score_for(v_target);

  IF NOT coalesce(v_profile.is_verified, false) THEN
    v_reasons := array_append(v_reasons, 'verified_required');
  END IF;
  IF v_score < 70 THEN
    v_reasons := array_append(v_reasons, 'minimum_score_required');
  END IF;
  v_eligible := cardinality(v_reasons) = 0;

  INSERT INTO public.governance_eligibility_snapshots AS s (
    profile_id, citizenship_status, is_verified, is_active_citizen, civizen_score, governance_score,
    influence_weight, eligible, reason_codes, calculated_at, calculation_version, source
  ) VALUES (
    v_target, v_profile.citizenship_status, coalesce(v_profile.is_verified, false),
    coalesce(v_profile.is_active_citizen, false), v_score, v_score,
    CASE WHEN v_eligible THEN 1 ELSE 0 END, v_eligible, v_reasons, v_now, 'server-v1', 'server'
  )
  ON CONFLICT (profile_id) DO UPDATE SET
    citizenship_status = EXCLUDED.citizenship_status,
    is_verified = EXCLUDED.is_verified,
    is_active_citizen = EXCLUDED.is_active_citizen,
    civizen_score = EXCLUDED.civizen_score,
    governance_score = EXCLUDED.governance_score,
    influence_weight = EXCLUDED.influence_weight,
    eligible = EXCLUDED.eligible,
    reason_codes = EXCLUDED.reason_codes,
    calculated_at = EXCLUDED.calculated_at,
    calculation_version = EXCLUDED.calculation_version,
    source = EXCLUDED.source;

  IF v_profile.is_governance_eligible IS DISTINCT FROM v_eligible
    OR (v_eligible AND v_profile.governance_eligible_at IS NULL) THEN
    UPDATE public.profiles
    SET is_governance_eligible = v_eligible,
        governance_eligible_at = CASE WHEN v_eligible THEN coalesce(governance_eligible_at, v_now) ELSE NULL END
    WHERE id = v_target;
  END IF;

  RETURN jsonb_build_object(
    'profile_id', v_target,
    'governance_score', v_score,
    'eligible', v_eligible,
    'reasons', to_jsonb(v_reasons),
    'calculated_at', v_now
  );
END;
$$;

REVOKE ALL ON FUNCTION public.governance_score_for(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.governance_sanction_blocks(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.refresh_governance_eligibility(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.governance_score_for(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.governance_sanction_blocks(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_governance_eligibility(uuid) TO authenticated;

-- Snapshots are written by refresh_governance_eligibility() or staff, never by the member.
DROP POLICY IF EXISTS "Governance eligibility snapshots are insertable by owner or adm" ON public.governance_eligibility_snapshots;
DROP POLICY IF EXISTS "Governance eligibility snapshots are updatable by owner or admi" ON public.governance_eligibility_snapshots;
DROP POLICY IF EXISTS "Staff can insert governance eligibility snapshots" ON public.governance_eligibility_snapshots;
DROP POLICY IF EXISTS "Staff can update governance eligibility snapshots" ON public.governance_eligibility_snapshots;
CREATE POLICY "Staff can insert governance eligibility snapshots"
  ON public.governance_eligibility_snapshots FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('role.assign'::public.app_permission)
    OR public.has_permission('settings.manage'::public.app_permission));
CREATE POLICY "Staff can update governance eligibility snapshots"
  ON public.governance_eligibility_snapshots FOR UPDATE TO authenticated
  USING (public.has_permission('role.assign'::public.app_permission)
    OR public.has_permission('settings.manage'::public.app_permission))
  WITH CHECK (public.has_permission('role.assign'::public.app_permission)
    OR public.has_permission('settings.manage'::public.app_permission));

-- Votes: the live score and sanctions decide, not a stored flag.
CREATE OR REPLACE FUNCTION public.enforce_governance_vote_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal record;
  v_voter record;
  v_score numeric;
BEGIN
  -- SECURITY DEFINER changes current_user, so read the API role from the request instead.
  IF coalesce(auth.role(), '') NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  -- RLS only lets API callers vote as themselves, so a vote for someone else comes from server code
  -- running inside the request (Nela's automatic participation when a proposal is created).
  IF NEW.voter_id IS DISTINCT FROM public.current_profile_id() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
    AND (NEW.proposal_id IS DISTINCT FROM OLD.proposal_id OR NEW.voter_id IS DISTINCT FROM OLD.voter_id) THEN
    RAISE EXCEPTION 'governance_vote_identity_immutable' USING ERRCODE = '42501';
  END IF;

  SELECT status, opens_at, closes_at INTO v_proposal
  FROM public.governance_proposals
  WHERE id = NEW.proposal_id;

  IF NOT FOUND
    OR v_proposal.status <> 'open'
    OR now() < v_proposal.opens_at
    OR now() > v_proposal.closes_at THEN
    RAISE EXCEPTION 'governance_vote_window_closed' USING ERRCODE = '42501';
  END IF;

  SELECT is_verified, citizenship_status, is_active_citizen INTO v_voter
  FROM public.profiles
  WHERE id = NEW.voter_id AND deleted_at IS NULL;

  IF NOT FOUND OR NOT coalesce(v_voter.is_verified, false) THEN
    RAISE EXCEPTION 'governance_vote_not_eligible' USING ERRCODE = '42501';
  END IF;

  v_score := public.governance_score_for(NEW.voter_id);
  IF v_score < 70 THEN
    RAISE EXCEPTION 'governance_vote_not_eligible' USING ERRCODE = '42501';
  END IF;

  IF public.governance_sanction_blocks(NEW.voter_id, 'vote') THEN
    RAISE EXCEPTION 'governance_vote_blocked_by_sanction' USING ERRCODE = '42501';
  END IF;

  NEW.weight := 1;
  NEW.snapshot := coalesce(NEW.snapshot, '{}'::jsonb) || jsonb_build_object(
    'is_verified', v_voter.is_verified,
    'citizenship_status', v_voter.citizenship_status,
    'is_active_citizen', v_voter.is_active_citizen,
    'governance_score', v_score,
    'is_governance_eligible', true,
    'server_checked_at', now()
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_governance_vote_rules() FROM PUBLIC, anon, authenticated;
