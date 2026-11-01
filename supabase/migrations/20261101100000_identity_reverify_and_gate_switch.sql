-- Identity verification: a switch for the "verified before acting" requirement, and re-verification for members who
-- are already verified (Armen, 1 Nov 2026).
--
-- 1. The requirement (writes refused with verification_required, and the consultation ballot) only applies while the
--    platform flag identity_verification_required is on. It starts off: turning it on locks out every existing
--    member who has not verified yet, so that is a separate, deliberate step once reviewers are appointed.
-- 2. A verified member can start the live check again (re-verification). While it runs, and if a reviewer rejects
--    it, the member stays verified: a re-verification that is not passed never changes the current status. Approval
--    renews the verification.

-- ---------------------------------------------------------------------------------------------
-- 1. Platform flags and the requirement switch
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  note text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);
ALTER TABLE public.platform_flags ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_flags FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.platform_flags TO authenticated;
DROP POLICY IF EXISTS platform_flags_read ON public.platform_flags;
CREATE POLICY platform_flags_read ON public.platform_flags FOR SELECT TO authenticated USING (true);

INSERT INTO public.platform_flags (key, enabled, note)
VALUES ('identity_verification_required', false,
        'When on, posting, commenting, messaging people, supporting and voting need a verified identity.')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.identity_verification_required()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((SELECT enabled FROM public.platform_flags WHERE key = 'identity_verification_required'), false);
$$;
REVOKE ALL ON FUNCTION public.identity_verification_required() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.identity_verification_required() TO authenticated;

CREATE OR REPLACE FUNCTION public.require_verified_identity(p_action text)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := public.current_profile_id();
BEGIN
  IF NOT public.identity_verification_required() OR v_me IS NULL OR public.profile_identity_verified(v_me) THEN
    RETURN;
  END IF;
  RAISE EXCEPTION 'verification_required' USING ERRCODE = 'PT403', DETAIL = 'verification_required', HINT = p_action;
END;
$$;
REVOKE ALL ON FUNCTION public.require_verified_identity(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consultation_eligibility_reason(p_election_id uuid, p_profile_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reason text := public.consultation_eligibility_reason_core(p_election_id, p_profile_id);
BEGIN
  IF v_reason IS NULL AND p_profile_id IS NOT NULL AND public.profile_is_business_account(p_profile_id) THEN
    RETURN 'business_account';
  END IF;
  IF v_reason IS NULL AND p_profile_id IS NOT NULL AND public.identity_verification_required()
     AND NOT public.profile_identity_verified(p_profile_id) THEN
    RETURN 'verification_required';
  END IF;
  RETURN v_reason;
END;
$$;
REVOKE ALL ON FUNCTION public.consultation_eligibility_reason(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 2. Re-verification keeps the current status
-- ---------------------------------------------------------------------------------------------
-- The profile's is_verified is projected from the member's single case. A case marked as a re-verification
-- (metadata.reverification = true, set only when the member was verified when it started) keeps the member verified
-- whatever its status, so starting, waiting for or failing a re-verification never un-verifies anyone.
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
    projected_verified := active_case.status = 'approved'::public.identity_verification_case_status
      OR coalesce((active_case.metadata ->> 'reverification')::boolean, false);
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
-- L6: the verification projection is a trigger helper, not a client API.
REVOKE EXECUTE ON FUNCTION public.project_profile_verification_state(uuid) FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.start_live_verification();
CREATE OR REPLACE FUNCTION public.start_live_verification(p_reverify boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_me uuid := public.current_profile_id();
  v_case public.identity_verification_cases%ROWTYPE;
  v_code text := lpad((floor(random() * 1000))::integer::text, 3, '0') || '-' || lpad((floor(random() * 1000))::integer::text, 3, '0');
  v_moves text[] := ARRAY['left', 'right', 'up', 'down'];
  v_actions text[];
  v_challenge jsonb;
  v_verified boolean;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  v_verified := public.profile_identity_verified(v_me);
  IF v_verified AND NOT coalesce(p_reverify, false) THEN
    RETURN jsonb_build_object('status', 'verified');
  END IF;
  SELECT * INTO v_case FROM public.identity_verification_cases WHERE profile_id = v_me;
  IF FOUND AND v_case.status IN ('submitted', 'in_review') THEN
    RETURN jsonb_build_object('status', v_case.status, 'case_id', v_case.id, 'submitted_at', v_case.submitted_at,
                              'reverification', coalesce((v_case.metadata ->> 'reverification')::boolean, false));
  END IF;
  v_actions := ARRAY[v_moves[1 + floor(random() * 4)::integer], v_moves[1 + floor(random() * 4)::integer]];
  v_challenge := jsonb_build_object('code', v_code, 'moves', to_jsonb(v_actions), 'issued_at', now(), 'expires_at', now() + interval '10 minutes');
  -- reverification is set before the status leaves 'approved', so the projection never sees an un-verified moment
  IF NOT FOUND THEN
    INSERT INTO public.identity_verification_cases (profile_id, status, verification_method, metadata)
    VALUES (v_me, 'draft', 'in_house_live', jsonb_build_object('challenge', v_challenge, 'reverification', v_verified))
    RETURNING * INTO v_case;
  ELSE
    UPDATE public.identity_verification_cases
       SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('reverification', v_verified), updated_at = now()
     WHERE id = v_case.id;
    UPDATE public.identity_verification_cases
       SET status = 'draft', verification_method = 'in_house_live',
           metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('challenge', v_challenge,
             'reverification', v_verified, 'reverification_started_at', CASE WHEN v_verified THEN now() END),
           updated_at = now()
     WHERE id = v_case.id
    RETURNING * INTO v_case;
  END IF;
  RETURN jsonb_build_object('status', 'draft', 'case_id', v_case.id, 'challenge', v_challenge, 'reverification', v_verified);
END;
$$;
REVOKE ALL ON FUNCTION public.start_live_verification(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_live_verification(boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.my_verification_state()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'verified', public.profile_identity_verified(public.current_profile_id()),
    'required', public.identity_verification_required(),
    'status', c.status, 'submitted_at', c.submitted_at,
    'reverification', coalesce((c.metadata ->> 'reverification')::boolean, false),
    'last_decision', c.metadata -> 'last_decision', 'info_requests', c.metadata -> 'info_requests')
    FROM (SELECT 1) one
    LEFT JOIN public.identity_verification_cases c ON c.profile_id = public.current_profile_id();
$$;
REVOKE ALL ON FUNCTION public.my_verification_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_verification_state() TO authenticated;

NOTIFY pgrst, 'reload schema';
