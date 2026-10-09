-- Phase 3 batch A: identity and status layers done right.
-- 3.1 Citizenship automation: verified members become citizens after 30 days, or after 14 days once they
--     accepted the civic framework; statuses stay separate from roles; a daily job promotes and notifies.
-- 3.2 One eligibility service in the database: is_eligible(profile, scope) / my_eligibility(scope).
-- 3.3 Verification queue: assign, decide (with a duplicate-identity check on the ID document hash), revoke,
--     and an admin override that must carry a reason and is logged; direct review inserts are closed.
-- 3.6 Business accounts cannot cast ballots.

-- ---------------------------------------------------------------------------------------------
-- 3.1 Citizenship
-- ---------------------------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS civic_framework_accepted_at timestamptz;

CREATE OR REPLACE FUNCTION public.accept_civic_framework()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_at timestamptz;
BEGIN
  IF v_self IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  UPDATE public.profiles
  SET civic_framework_accepted_at = coalesce(civic_framework_accepted_at, now())
  WHERE id = v_self AND deleted_at IS NULL
  RETURNING civic_framework_accepted_at INTO v_at;
  RETURN v_at;
END;
$$;
REVOKE ALL ON FUNCTION public.accept_civic_framework() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_civic_framework() TO authenticated;

-- When a verified member qualifies for citizenship: 30 days after verification, or 14 days after it when
-- the civic framework was accepted. NULL when not verified or already a citizen.
CREATE OR REPLACE FUNCTION public.citizenship_due_at(p_profile_id uuid)
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p.deleted_at IS NOT NULL OR NOT coalesce(p.is_verified, false) OR p.citizenship_status = 'citizen' THEN NULL
    WHEN p.civic_framework_accepted_at IS NOT NULL THEN coalesce(p.citizenship_review_cleared_at, now()) + interval '14 days'
    ELSE coalesce(p.citizenship_review_cleared_at, now()) + interval '30 days'
  END
  FROM public.profiles p
  WHERE p.id = p_profile_id;
$$;
REVOKE ALL ON FUNCTION public.citizenship_due_at(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.citizenship_promotion_tick()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_count integer := 0;
  v_mode text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('citizenship_promotion_tick', 0));
  FOR r IN
    SELECT p.id, p.civic_framework_accepted_at, p.citizenship_review_cleared_at
    FROM public.profiles p
    WHERE p.deleted_at IS NULL
      AND coalesce(p.is_verified, false)
      AND p.citizenship_status = 'verified_member'
      AND public.citizenship_due_at(p.id) <= now()
    FOR UPDATE SKIP LOCKED
  LOOP
    v_mode := CASE
      WHEN r.civic_framework_accepted_at IS NOT NULL
           AND coalesce(r.citizenship_review_cleared_at, now()) + interval '30 days' > now() THEN 'manual'
      ELSE 'auto'
    END;
    UPDATE public.profiles
    SET citizenship_status = 'citizen',
        citizenship_accepted_at = now(),
        citizenship_acceptance_mode = v_mode
    WHERE id = r.id;
    PERFORM public.civic_notify_profiles(
      ARRAY[r.id], 'citizenship_granted', 'You are now a Civizen citizen',
      'Your verified membership has matured into citizenship.', 'profile', r.id, jsonb_build_object('mode', v_mode)
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.citizenship_promotion_tick() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('citizenship_promotion_tick');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    PERFORM cron.schedule('citizenship_promotion_tick', '10 3 * * *', $cron$SELECT public.citizenship_promotion_tick();$cron$);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

CREATE OR REPLACE FUNCTION public.my_civic_status()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'citizenship_status', p.citizenship_status,
    'is_verified', coalesce(p.is_verified, false),
    'verified_since', p.citizenship_review_cleared_at,
    'civic_framework_accepted_at', p.civic_framework_accepted_at,
    'citizenship_due_at', public.citizenship_due_at(p.id),
    'citizenship_accepted_at', p.citizenship_accepted_at,
    'citizenship_acceptance_mode', p.citizenship_acceptance_mode,
    'is_active_citizen', coalesce(p.is_active_citizen, false)
  )
  FROM public.profiles p
  WHERE p.id = public.current_profile_id();
$$;
REVOKE ALL ON FUNCTION public.my_civic_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_civic_status() TO authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3.6 Business accounts are organizations' sign-ins, not people: they do not vote
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.profile_is_business_account(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.linked_accounts la
    WHERE la.linked_profile_id = p_profile_id AND la.relationship_type = 'business'
  );
$$;
REVOKE ALL ON FUNCTION public.profile_is_business_account(uuid) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3.2 Eligibility service
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_eligible(p_profile_id uuid, p_scope text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_p public.profiles%ROWTYPE;
  v_reasons text[] := '{}';
  v_scope text := lower(trim(coalesce(p_scope, '')));
BEGIN
  IF v_scope NOT IN ('participate', 'vote_countable', 'propose', 'publish', 'governance') THEN
    RAISE EXCEPTION 'unknown_scope';
  END IF;
  IF p_profile_id IS NULL THEN
    RETURN jsonb_build_object('eligible', false, 'reasons', jsonb_build_array('not_authenticated'), 'scope', v_scope);
  END IF;
  SELECT * INTO v_p FROM public.profiles WHERE id = p_profile_id;
  IF NOT FOUND OR v_p.deleted_at IS NOT NULL THEN
    RETURN jsonb_build_object('eligible', false, 'reasons', jsonb_build_array('profile_unavailable'), 'scope', v_scope);
  END IF;
  IF public.profile_is_business_account(p_profile_id) THEN
    v_reasons := array_append(v_reasons, 'business_account');
  END IF;
  IF v_scope IN ('participate', 'vote_countable', 'governance')
     AND public.profile_has_governance_block(p_profile_id, 'vote'::public.governance_block_scope) THEN
    v_reasons := array_append(v_reasons, 'voter_blocked');
  END IF;
  IF v_scope IN ('propose', 'publish')
     AND public.profile_has_governance_block(p_profile_id, 'proposal_create'::public.governance_block_scope) THEN
    v_reasons := array_append(v_reasons, 'voter_blocked');
  END IF;
  IF v_scope IN ('vote_countable', 'publish', 'governance') AND NOT coalesce(v_p.is_verified, false) THEN
    v_reasons := array_append(v_reasons, 'verification_required');
  END IF;
  IF v_scope = 'governance' AND v_p.citizenship_status <> 'citizen' THEN
    v_reasons := array_append(v_reasons, 'citizenship_required');
  END IF;
  RETURN jsonb_build_object('eligible', cardinality(v_reasons) = 0, 'reasons', to_jsonb(v_reasons), 'scope', v_scope);
END;
$$;
REVOKE ALL ON FUNCTION public.is_eligible(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.my_eligibility(p_scope text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_eligible(public.current_profile_id(), p_scope);
$$;
REVOKE ALL ON FUNCTION public.my_eligibility(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_eligibility(text) TO anon, authenticated;

-- Consultations: a business account cannot cast a ballot (the rest of the rules are unchanged).
DO $$
BEGIN
  IF to_regprocedure('public.consultation_eligibility_reason_core(uuid, uuid)') IS NULL THEN
    ALTER FUNCTION public.consultation_eligibility_reason(uuid, uuid) RENAME TO consultation_eligibility_reason_core;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.consultation_eligibility_reason_core(uuid, uuid) FROM PUBLIC, anon, authenticated;

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
  RETURN v_reason;
END;
$$;
REVOKE ALL ON FUNCTION public.consultation_eligibility_reason(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3.3 Verification queue
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.identity_verification_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified boolean NOT NULL,
  reason text NOT NULL CHECK (char_length(trim(reason)) >= 5),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.identity_verification_overrides ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.identity_verification_overrides FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS identity_verification_overrides_reviewers ON public.identity_verification_overrides;
CREATE POLICY identity_verification_overrides_reviewers ON public.identity_verification_overrides
  FOR SELECT TO authenticated USING (public.can_review_identity_verification_storage());
GRANT SELECT ON TABLE public.identity_verification_overrides TO authenticated;

-- Another approved case, for another living profile, that shares an ID-document hash with this case.
CREATE OR REPLACE FUNCTION public.identity_verification_duplicate_of(p_case_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT other.profile_id
  FROM public.identity_verification_cases c
  JOIN public.identity_verification_artifacts mine ON mine.case_id = c.id AND mine.artifact_kind::text = 'supporting_document'
  JOIN public.identity_verification_artifacts theirs ON theirs.artifact_hash = mine.artifact_hash AND theirs.case_id <> c.id
    AND theirs.artifact_kind::text = 'supporting_document'
  JOIN public.identity_verification_cases other ON other.id = theirs.case_id AND other.profile_id <> c.profile_id
    AND other.status = 'approved'
  JOIN public.profiles op ON op.id = other.profile_id AND op.deleted_at IS NULL
  WHERE c.id = p_case_id AND nullif(mine.artifact_hash, '') IS NOT NULL
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.identity_verification_duplicate_of(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.assign_identity_verification_case(p_case_id uuid, p_reviewer_profile_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_reviewer uuid := coalesce(p_reviewer_profile_id, public.current_profile_id());
  v_case public.identity_verification_cases%ROWTYPE;
BEGIN
  IF v_self IS NULL OR NOT public.can_review_identity_verification_storage() THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT * INTO v_case FROM public.identity_verification_cases WHERE id = p_case_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'case_not_found'; END IF;
  IF v_case.status NOT IN ('submitted', 'in_review') THEN RAISE EXCEPTION 'case_not_reviewable'; END IF;
  UPDATE public.identity_verification_cases
  SET status = 'in_review',
      last_reviewed_by = v_reviewer,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('assigned_to', v_reviewer, 'assigned_at', now(), 'assigned_by', v_self)
  WHERE id = p_case_id;
  RETURN jsonb_build_object('case_id', p_case_id, 'status', 'in_review', 'assigned_to', v_reviewer);
END;
$$;
REVOKE ALL ON FUNCTION public.assign_identity_verification_case(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_identity_verification_case(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.decide_identity_verification_case(p_case_id uuid, p_decision text, p_notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_case public.identity_verification_cases%ROWTYPE;
  v_decision text := lower(trim(coalesce(p_decision, '')));
  v_duplicate uuid;
BEGIN
  IF v_self IS NULL OR NOT public.can_review_identity_verification_storage() THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF v_decision NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'invalid_decision'; END IF;
  SELECT * INTO v_case FROM public.identity_verification_cases WHERE id = p_case_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'case_not_found'; END IF;
  IF v_case.status NOT IN ('submitted', 'in_review') THEN RAISE EXCEPTION 'case_not_reviewable'; END IF;
  IF v_case.profile_id = v_self THEN RAISE EXCEPTION 'cannot_review_own_case'; END IF;
  IF v_decision = 'approved' THEN
    v_duplicate := public.identity_verification_duplicate_of(p_case_id);
    IF v_duplicate IS NOT NULL THEN
      UPDATE public.identity_verification_cases
      SET discrepancy_flags = array_append(array_remove(coalesce(discrepancy_flags, '{}'), 'duplicate_identity'), 'duplicate_identity'),
          metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('duplicate_of_profile_id', v_duplicate, 'duplicate_flagged_at', now())
      WHERE id = p_case_id;
      -- Returned, not raised, so the flag above is kept; the client reports it as a refusal.
      RETURN jsonb_build_object('case_id', p_case_id, 'status', 'duplicate_identity', 'duplicate_of_profile_id', v_duplicate);
    END IF;
  END IF;
  -- The review row drives the case status and the profile projection (existing trigger).
  INSERT INTO public.identity_verification_reviews (case_id, reviewer_id, decision, notes)
  VALUES (p_case_id, v_self, v_decision::public.identity_verification_decision, nullif(trim(coalesce(p_notes, '')), ''));
  PERFORM public.civic_notify_profiles(
    ARRAY[v_case.profile_id],
    CASE WHEN v_decision = 'approved' THEN 'verification_approved' ELSE 'verification_rejected' END,
    CASE WHEN v_decision = 'approved' THEN 'Your identity is verified' ELSE 'Your verification needs another look' END,
    CASE WHEN v_decision = 'approved' THEN 'Reviewers approved your identity verification.' ELSE 'Reviewers could not approve your verification yet. Open profile settings to see what to redo.' END,
    'profile', v_case.profile_id, '{}'::jsonb
  );
  RETURN jsonb_build_object('case_id', p_case_id, 'status', v_decision);
END;
$$;
REVOKE ALL ON FUNCTION public.decide_identity_verification_case(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_identity_verification_case(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_identity_verification(p_profile_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_case public.identity_verification_cases%ROWTYPE;
BEGIN
  IF v_self IS NULL OR NOT public.can_review_identity_verification_storage() THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF char_length(trim(coalesce(p_reason, ''))) < 5 THEN RAISE EXCEPTION 'reason_required'; END IF;
  SELECT * INTO v_case FROM public.identity_verification_cases WHERE profile_id = p_profile_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'case_not_found'; END IF;
  IF v_case.status <> 'approved' THEN RAISE EXCEPTION 'case_not_approved'; END IF;
  INSERT INTO public.identity_verification_reviews (case_id, reviewer_id, decision, notes)
  VALUES (v_case.id, v_self, 'revoked', trim(p_reason));
  PERFORM public.civic_notify_profiles(
    ARRAY[p_profile_id], 'verification_revoked', 'Your identity verification was revoked',
    'A reviewer revoked your verification. Open profile settings to see the reason and verify again.', 'profile', p_profile_id, '{}'::jsonb
  );
  RETURN jsonb_build_object('case_id', v_case.id, 'status', 'revoked');
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_identity_verification(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_identity_verification(uuid, text) TO authenticated;

-- Emergency override from Users admin: always with a reason, always logged, through the same review path.
CREATE OR REPLACE FUNCTION public.set_profile_verified_override(p_profile_id uuid, p_verified boolean, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_case_id uuid;
  v_duplicate uuid;
BEGIN
  IF v_self IS NULL OR NOT public.can_review_identity_verification_storage() THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF char_length(trim(coalesce(p_reason, ''))) < 5 THEN RAISE EXCEPTION 'reason_required'; END IF;
  IF p_profile_id = v_self THEN RAISE EXCEPTION 'cannot_review_own_case'; END IF;
  INSERT INTO public.identity_verification_cases (profile_id, status, verification_method, submitted_at, notes)
  VALUES (p_profile_id, 'in_review', 'admin_review', now(), trim(p_reason))
  ON CONFLICT (profile_id) DO UPDATE
    SET status = CASE WHEN identity_verification_cases.status = 'approved' THEN identity_verification_cases.status ELSE 'in_review' END,
        notes = trim(p_reason)
  RETURNING id INTO v_case_id;
  IF p_verified THEN
    v_duplicate := public.identity_verification_duplicate_of(v_case_id);
    IF v_duplicate IS NOT NULL THEN RAISE EXCEPTION 'duplicate_identity'; END IF;
  END IF;
  INSERT INTO public.identity_verification_overrides (profile_id, actor_profile_id, verified, reason)
  VALUES (p_profile_id, v_self, p_verified, trim(p_reason));
  INSERT INTO public.identity_verification_reviews (case_id, reviewer_id, decision, notes)
  VALUES (v_case_id, v_self, (CASE WHEN p_verified THEN 'approved' ELSE 'revoked' END)::public.identity_verification_decision, 'Admin override: ' || trim(p_reason));
  RETURN jsonb_build_object('case_id', v_case_id, 'verified', p_verified);
END;
$$;
REVOKE ALL ON FUNCTION public.set_profile_verified_override(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_profile_verified_override(uuid, boolean, text) TO authenticated;

-- Decisions go through the functions above (duplicate check, notes, notifications); no direct review rows.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.identity_verification_reviews FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
