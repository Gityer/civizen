-- v2 plan step A7 (decision 2026-10-12, jobs j3f0b1b55, ja567db46, jfb057339, jf374edf6): close the insider and
-- privacy bypasses the Security & Privacy Officer, the Trust & Safety Lead and Civizen QA found before the
-- "safe to invite" gate. Each section names its finding.

-- ---- M1 / T2: tables that never had row-level security ------------------------------------------------
-- No client reads or writes them directly; every use goes through SECURITY DEFINER functions or the service role.
DO $$
DECLARE v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'activation_demographic_feed_worker_escalation_policies',
    'activation_demographic_feed_worker_escalation_policy_events',
    'activation_demographic_feed_worker_schedule_automation_runs',
    'agreement_reference_counters',
    'governance_emergency_access_ops_policies',
    'governance_emergency_access_ops_policy_events',
    'governance_emergency_access_request_events',
    'governance_public_audit_verifier_federation_exchange_attestatio',
    'gpav_fed_exchange_receipt_automation_runs',
    'gpav_fed_exchange_receipt_policies',
    'gpav_fed_exchange_receipt_policy_events',
    'identity_verification_providers',
    'matter_escalation_policy_defaults'
  ] LOOP
    IF to_regclass('public.' || v_table) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', v_table);
    END IF;
  END LOOP;
END $$;

-- The agreement reference counter is used through these two functions; they now run as their owner.
ALTER FUNCTION public.agreement_next_reference() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.agreement_assign_reference(text) SECURITY DEFINER SET search_path = public;

-- Audit-event appenders are called by triggers and other server functions only, never by clients.
REVOKE EXECUTE ON FUNCTION public.append_governance_emergency_access_request_event(uuid, text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.append_governance_emergency_access_ops_policy_event(text, text, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
DO $$
BEGIN
  IF to_regprocedure('public.append_gpav_fed_exchange_receipt_policy_event(text, text, text, jsonb)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.append_gpav_fed_exchange_receipt_policy_event(text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

-- ---- T3: emergency access requests change only through the request, review and claim functions ---------
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.governance_emergency_access_requests FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.governance_emergency_access_requests FROM anon;
DROP POLICY IF EXISTS "Emergency access requests review by managers" ON public.governance_emergency_access_requests;
DROP POLICY IF EXISTS "Emergency access requests insert by staff" ON public.governance_emergency_access_requests;

CREATE OR REPLACE FUNCTION public.claim_governance_emergency_access_request_for_impersonation(target_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  request_record public.governance_emergency_access_requests%ROWTYPE;
  claimant_profile_id uuid := public.current_profile_id();
BEGIN
  IF claimant_profile_id IS NULL THEN
    RAISE EXCEPTION 'Current profile is required';
  END IF;
  IF NOT public.has_permission('settings.manage'::public.app_permission) THEN
    RAISE EXCEPTION 'Current profile is not authorized to claim emergency access impersonation requests';
  END IF;
  IF target_request_id IS NULL THEN
    RAISE EXCEPTION 'Target request id is required';
  END IF;
  SELECT * INTO request_record FROM public.governance_emergency_access_requests AS request WHERE request.id = target_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Emergency access request does not exist';
  END IF;
  -- Only the person who asked for the access may use it (T3).
  IF request_record.requested_by IS DISTINCT FROM claimant_profile_id THEN
    RAISE EXCEPTION 'Only the requester can claim this emergency access request' USING ERRCODE = '42501';
  END IF;
  IF request_record.request_status <> 'approved' THEN
    RAISE EXCEPTION 'Emergency access request is not approved';
  END IF;
  IF request_record.consumed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Emergency access request has already been consumed';
  END IF;
  IF request_record.approved_expires_at IS NOT NULL AND request_record.approved_expires_at <= now() THEN
    UPDATE public.governance_emergency_access_requests
    SET request_status = 'expired',
        review_notes = coalesce(review_notes, '')
          || CASE WHEN review_notes IS NULL OR length(trim(review_notes)) = 0 THEN '' ELSE E'\n' END
          || 'Auto-expired before claim',
        updated_at = now()
    WHERE id = request_record.id;
    RAISE EXCEPTION 'Emergency access request has expired';
  END IF;
  UPDATE public.governance_emergency_access_requests AS request
  SET consumed_at = now(), consumed_by = claimant_profile_id, updated_by = claimant_profile_id
  WHERE request.id = request_record.id;
  RETURN request_record.target_profile_id;
END;
$function$;

-- ---- T1: identity verification case status changes only through the review functions -------------------
CREATE OR REPLACE FUNCTION public.profiles_are_linked(p_a uuid, p_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_a = p_b OR EXISTS (
    SELECT 1 FROM public.linked_accounts la
     WHERE (la.owner_profile_id = p_a AND la.linked_profile_id = p_b)
        OR (la.owner_profile_id = p_b AND la.linked_profile_id = p_a)
  );
$$;
REVOKE ALL ON FUNCTION public.profiles_are_linked(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- What the direct-write guard may ask: is this profile the caller's own or one of the caller's linked accounts.
CREATE OR REPLACE FUNCTION public.is_own_or_linked_profile(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_profile_id() IS NOT NULL AND public.profiles_are_linked(public.current_profile_id(), p_profile_id);
$$;
REVOKE ALL ON FUNCTION public.is_own_or_linked_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_own_or_linked_profile(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_identity_verification_case_owner_writes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_direct_client boolean := current_user IN ('authenticated', 'anon');
  v_self uuid;
  v_own boolean;
  v_reviewer boolean;
BEGIN
  IF NOT v_direct_client THEN
    RETURN NEW;
  END IF;
  v_self := public.current_profile_id();
  v_own := public.is_own_or_linked_profile(coalesce(NEW.profile_id, OLD.profile_id));
  v_reviewer := NOT v_own
    AND NOT public.current_profile_has_governance_block('verification_review'::public.governance_block_scope)
    AND (
      public.has_permission('role.assign'::public.app_permission)
      OR public.has_permission('settings.manage'::public.app_permission)
      OR public.current_profile_in_governance_domain(ARRAY['identity_verification'])
    );

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft'::public.identity_verification_case_status THEN
      RAISE EXCEPTION 'verification_case_owner_status_forbidden' USING ERRCODE = '42501';
    END IF;
    NEW.reviewed_at := NULL;
    NEW.resolved_at := NULL;
    NEW.last_reviewed_by := NULL;
    NEW.discrepancy_flags := '{}'::text[];
    RETURN NEW;
  END IF;

  -- Status moves only through decide/assign/revoke for everyone, reviewers included (T1). The one direct move is
  -- the owner submitting their own draft.
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT (v_own AND OLD.status = 'draft'::public.identity_verification_case_status
              AND NEW.status = 'submitted'::public.identity_verification_case_status) THEN
    RAISE EXCEPTION 'verification_case_status_changes_through_review_only' USING ERRCODE = '42501';
  END IF;

  IF v_reviewer THEN
    RETURN NEW;
  END IF;

  IF OLD.status NOT IN ('draft'::public.identity_verification_case_status, 'submitted'::public.identity_verification_case_status) THEN
    RAISE EXCEPTION 'verification_case_locked_for_owner' USING ERRCODE = '42501';
  END IF;
  IF NEW.profile_id IS DISTINCT FROM OLD.profile_id
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
     OR NEW.resolved_at IS DISTINCT FROM OLD.resolved_at
     OR NEW.last_reviewed_by IS DISTINCT FROM OLD.last_reviewed_by
     OR NEW.discrepancy_flags IS DISTINCT FROM OLD.discrepancy_flags THEN
    RAISE EXCEPTION 'verification_case_reviewer_fields_forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.assign_identity_verification_case(p_case_id uuid, p_reviewer_profile_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_self uuid := public.current_profile_id();
  v_reviewer uuid := coalesce(p_reviewer_profile_id, public.current_profile_id());
  v_case public.identity_verification_cases%ROWTYPE;
BEGIN
  IF v_self IS NULL OR NOT public.can_review_identity_verification_storage() THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT * INTO v_case FROM public.identity_verification_cases WHERE id = p_case_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'case_not_found'; END IF;
  IF v_case.status NOT IN ('submitted', 'in_review') THEN RAISE EXCEPTION 'case_not_reviewable'; END IF;
  IF public.profiles_are_linked(v_case.profile_id, v_reviewer) OR public.profiles_are_linked(v_case.profile_id, v_self) THEN
    RAISE EXCEPTION 'cannot_review_own_case' USING ERRCODE = '42501';
  END IF;
  UPDATE public.identity_verification_cases
  SET status = 'in_review',
      last_reviewed_by = v_reviewer,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('assigned_to', v_reviewer, 'assigned_at', now(), 'assigned_by', v_self)
  WHERE id = p_case_id;
  RETURN jsonb_build_object('case_id', p_case_id, 'status', 'in_review', 'assigned_to', v_reviewer);
END;
$function$;

CREATE OR REPLACE FUNCTION public.decide_identity_verification_case(p_case_id uuid, p_decision text, p_notes text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  IF public.profiles_are_linked(v_case.profile_id, v_self) THEN RAISE EXCEPTION 'cannot_review_own_case'; END IF;
  IF v_decision = 'approved' THEN
    v_duplicate := public.identity_verification_duplicate_of(p_case_id);
    IF v_duplicate IS NOT NULL THEN
      UPDATE public.identity_verification_cases
      SET discrepancy_flags = array_append(array_remove(coalesce(discrepancy_flags, '{}'), 'duplicate_identity'), 'duplicate_identity'),
          metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('duplicate_of_profile_id', v_duplicate, 'duplicate_flagged_at', now())
      WHERE id = p_case_id;
      RETURN jsonb_build_object('case_id', p_case_id, 'status', 'duplicate_identity', 'duplicate_of_profile_id', v_duplicate);
    END IF;
  END IF;
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
$function$;

-- M5: reviews are written by decide_identity_verification_case only (clients already lack INSERT; make it explicit).
REVOKE INSERT, UPDATE, DELETE ON TABLE public.identity_verification_reviews FROM PUBLIC, anon, authenticated;

-- L6: the verification projection is a trigger helper, not a client API.
REVOKE EXECUTE ON FUNCTION public.project_profile_verification_state(uuid) FROM PUBLIC, anon, authenticated;

-- ---- H2: a verified member cannot move their birth date or country to pass eligibility ------------------
CREATE OR REPLACE FUNCTION public.guard_verified_identity_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF public.has_permission('role.assign'::public.app_permission) OR public.has_permission('settings.manage'::public.app_permission) THEN
    RETURN NEW;
  END IF;
  IF coalesce(OLD.is_verified, false)
     AND (NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth
          OR NEW.country_code IS DISTINCT FROM OLD.country_code
          OR NEW.country IS DISTINCT FROM OLD.country) THEN
    RAISE EXCEPTION 'verified_identity_fields_locked'
      USING ERRCODE = '42501',
            HINT = 'Birth date and country are locked after identity verification; ask a reviewer to correct them.';
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS aab_guard_verified_identity_fields ON public.profiles;
CREATE TRIGGER aab_guard_verified_identity_fields BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_verified_identity_fields();

-- ---- H1: no per-option counts while voting is open --------------------------------------------------------
-- Live per-option tallies next to the public receipt events let anyone match a receipt to a choice. Option counts
-- are published once voting has closed; until then only the participation total is public.
CREATE OR REPLACE FUNCTION public.civic_election_results_published(p_election_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((SELECT e.status IN ('closed', 'certified') OR now() > e.voting_closes_at FROM public.civic_elections e WHERE e.id = p_election_id), false);
$$;
GRANT EXECUTE ON FUNCTION public.civic_election_results_published(uuid) TO anon, authenticated;

DO $$
BEGIN
  IF to_regprocedure('public.civic_election_option_tallies_raw(uuid)') IS NULL THEN
    ALTER FUNCTION public.civic_election_public_tallies(uuid) RENAME TO civic_election_option_tallies_raw;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.civic_election_option_tallies_raw(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.civic_election_public_tallies(p_election_id uuid)
RETURNS TABLE(candidate_id uuid, option_key text, display_name text, vote_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT r.candidate_id, r.option_key, r.display_name,
         CASE WHEN public.civic_election_results_published(p_election_id) THEN r.vote_count END
    FROM public.civic_election_option_tallies_raw(p_election_id) r;
$$;
GRANT EXECUTE ON FUNCTION public.civic_election_public_tallies(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.civic_election_participation(p_election_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::bigint
    FROM public.civic_ballots b
    JOIN public.civic_elections e ON e.id = b.election_id
   WHERE b.election_id = p_election_id
     AND b.is_countable
     AND NOT coalesce(b.is_duress, false)
     AND coalesce(e.metadata->>'sample_batch', '') = ''
     AND coalesce(e.metadata->>'catalog', 'live') <> 'demo';
$$;
GRANT EXECUTE ON FUNCTION public.civic_election_participation(uuid) TO anon, authenticated;

-- Server-side outcome and close keep reading the real counts; the outcome is not a client API.
DO $$
DECLARE v_def text;
BEGIN
  FOREACH v_def IN ARRAY ARRAY[
    pg_get_functiondef('public.civic_election_outcome'::regproc),
    pg_get_functiondef('public.civic_close_due_elections'::regproc)
  ] LOOP
    EXECUTE replace(v_def, 'public.civic_election_public_tallies(', 'public.civic_election_option_tallies_raw(');
  END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION public.civic_election_outcome(uuid) FROM PUBLIC, anon, authenticated;

-- A ballot's signed intent ties the voter to the receipt; only the voter reads it. Proposal intents stay readable.
DROP POLICY IF EXISTS "Governance action intents are readable by authenticated users" ON public.governance_action_intents;
CREATE POLICY "Governance action intents are readable by authenticated users" ON public.governance_action_intents
  FOR SELECT TO authenticated
  USING (action_scope <> 'consultation_ballot' OR actor_id = public.current_profile_id());
REVOKE ALL ON TABLE public.governance_action_intents FROM anon;
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.governance_action_intents FROM authenticated;

-- ---- M3: legacy proposal votes are private and only cast while the proposal is open -----------------------
DROP POLICY IF EXISTS "Governance votes are readable by authenticated users" ON public.governance_proposal_votes;
DROP POLICY IF EXISTS "Governance votes are readable by their voter or staff" ON public.governance_proposal_votes;
CREATE POLICY "Governance votes are readable by their voter or staff" ON public.governance_proposal_votes
  FOR SELECT TO authenticated
  USING (voter_id = public.current_profile_id()
         OR public.has_permission('role.assign'::public.app_permission)
         OR public.has_permission('settings.manage'::public.app_permission));
DROP POLICY IF EXISTS "Governance votes are insertable by voter" ON public.governance_proposal_votes;
CREATE POLICY "Governance votes are insertable by voter" ON public.governance_proposal_votes
  FOR INSERT TO authenticated
  WITH CHECK (voter_id = public.current_profile_id()
              AND NOT public.current_profile_has_governance_block('vote'::public.governance_block_scope)
              AND EXISTS (SELECT 1 FROM public.governance_proposals p
                           WHERE p.id = proposal_id AND p.status = 'open'
                             AND (p.opens_at IS NULL OR p.opens_at <= now())
                             AND (p.closes_at IS NULL OR p.closes_at > now())));
DROP POLICY IF EXISTS "Governance votes are updatable by voter" ON public.governance_proposal_votes;
CREATE POLICY "Governance votes are updatable by voter" ON public.governance_proposal_votes
  FOR UPDATE TO authenticated
  USING (voter_id = public.current_profile_id() AND NOT public.current_profile_has_governance_block('vote'::public.governance_block_scope))
  WITH CHECK (voter_id = public.current_profile_id()
              AND NOT public.current_profile_has_governance_block('vote'::public.governance_block_scope)
              AND EXISTS (SELECT 1 FROM public.governance_proposals p
                           WHERE p.id = proposal_id AND p.status = 'open'
                             AND (p.opens_at IS NULL OR p.opens_at <= now())
                             AND (p.closes_at IS NULL OR p.closes_at > now())));
REVOKE ALL ON TABLE public.governance_proposal_votes FROM anon;

-- ---- M4: a proposer cannot rewrite thresholds, timing or status --------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_governance_proposal_proposer_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF public.has_permission('role.assign'::public.app_permission) OR public.has_permission('settings.manage'::public.app_permission) THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.decision_class IS DISTINCT FROM OLD.decision_class
     OR NEW.proposal_type IS DISTINCT FROM OLD.proposal_type
     OR NEW.approval_threshold IS DISTINCT FROM OLD.approval_threshold
     OR NEW.required_quorum IS DISTINCT FROM OLD.required_quorum
     OR NEW.opens_at IS DISTINCT FROM OLD.opens_at
     OR NEW.closes_at IS DISTINCT FROM OLD.closes_at
     OR NEW.proposer_id IS DISTINCT FROM OLD.proposer_id
     OR NEW.eligible_voter_count_snapshot IS DISTINCT FROM OLD.eligible_voter_count_snapshot
     OR NEW.bootstrap_mode IS DISTINCT FROM OLD.bootstrap_mode
     OR NEW.resolved_at IS DISTINCT FROM OLD.resolved_at
     OR NEW.final_decision_summary IS DISTINCT FROM OLD.final_decision_summary
     OR NEW.metadata IS DISTINCT FROM OLD.metadata THEN
    RAISE EXCEPTION 'governance_proposal_fields_locked_for_proposer' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS aaa_guard_governance_proposal_proposer_updates ON public.governance_proposals;
CREATE TRIGGER aaa_guard_governance_proposal_proposer_updates BEFORE UPDATE ON public.governance_proposals
  FOR EACH ROW EXECUTE FUNCTION public.guard_governance_proposal_proposer_updates();
REVOKE ALL ON TABLE public.governance_proposals FROM anon;

-- ---- L2: civic device registrations belong to the profile, not the auth user ------------------------------
DROP POLICY IF EXISTS "Civic device registrations owner access" ON public.civic_device_registrations;
CREATE POLICY "Civic device registrations owner access" ON public.civic_device_registrations
  FOR ALL TO authenticated
  USING (profile_id = public.current_profile_id())
  WITH CHECK (profile_id = public.current_profile_id());

-- ---- M2: guests see usernames, never real names; deleted accounts are "Former member" -----------------------
CREATE OR REPLACE FUNCTION public.public_display_name(p_profile_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_profile_id IS NULL THEN NULL
    WHEN p.id IS NULL OR p.deleted_at IS NOT NULL THEN 'Former member'
    WHEN nullif(btrim(coalesce(p.username, '')), '') IS NULL THEN 'Member'
    ELSE '@' || p.username
  END
  FROM (SELECT p_profile_id AS pid) x
  LEFT JOIN public.profiles p ON p.id = x.pid;
$$;
REVOKE ALL ON FUNCTION public.public_display_name(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.public_matter_card(p_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', m.id,
    'title', m.title,
    'description', left(coalesce(m.description, ''), 4000),
    'matter_type', m.matter_type,
    'lifecycle_status', m.lifecycle_status,
    'area_node_id', m.area_node_id,
    'scope_kind', m.scope_kind,
    'scope_country_code', m.scope_country_code,
    'scope_region_code', m.scope_region_code,
    'scope_locality_code', m.scope_locality_code,
    'created_at', m.created_at,
    'updated_at', m.updated_at,
    'initiator_display_name', public.public_display_name(m.initiator_profile_id),
    'addressee_display_name', public.public_display_name(m.addressee_profile_id),
    'comment_count', (
      SELECT count(*) FROM public.matter_comments c
       WHERE c.matter_id = m.id AND c.moderation_hidden_at IS NULL AND coalesce(c.visibility, 'public') = 'public'
    )
  )
  FROM public.matters m
  WHERE m.id = p_id AND m.visibility = 'public' AND m.lifecycle_status IN ('submitted', 'active', 'closed');
$$;

CREATE OR REPLACE FUNCTION public.public_matter(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_card jsonb := public.public_matter_card(p_id);
BEGIN
  IF v_card IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN v_card || jsonb_build_object(
    'comments', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'id', c.id,
               'parent_id', c.parent_id,
               'body', c.body,
               'created_at', c.created_at,
               'author_display_name', CASE
                 WHEN c.is_ai_agent THEN public.matter_actor_display_name('ai_agent', NULL, c.agent_id)
                 ELSE public.public_display_name(c.author_profile_id)
               END
             ) ORDER BY c.created_at)
        FROM (
          SELECT * FROM public.matter_comments c0
           WHERE c0.matter_id = p_id AND c0.moderation_hidden_at IS NULL AND coalesce(c0.visibility, 'public') = 'public'
           ORDER BY c0.created_at
           LIMIT 200
        ) c
    ), '[]'::jsonb)
  );
END;
$$;

-- ---- jf374edf6: finding people by phone number is opt-in, capped and honours the full-name switch ---------
CREATE OR REPLACE FUNCTION public.set_my_privacy_settings(p_settings jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_self uuid := public.current_profile_id();
  v_clean jsonb := '{}'::jsonb;
  v_key text;
BEGIN
  IF v_self IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  FOREACH v_key IN ARRAY ARRAY['show_country', 'show_city', 'show_score', 'show_endorsements', 'show_full_name', 'discoverable_by_phone'] LOOP
    IF jsonb_typeof(coalesce(p_settings, '{}'::jsonb)->v_key) = 'boolean' THEN
      v_clean := v_clean || jsonb_build_object(v_key, (p_settings->>v_key)::boolean);
    END IF;
  END LOOP;
  UPDATE public.profiles SET privacy_settings = coalesce(privacy_settings, '{}'::jsonb) || v_clean WHERE id = v_self
  RETURNING privacy_settings INTO v_clean;
  RETURN v_clean;
END;
$function$;

CREATE TABLE IF NOT EXISTS public.phone_lookup_usage (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day date NOT NULL,
  numbers integer NOT NULL DEFAULT 0,
  PRIMARY KEY (profile_id, day)
);
ALTER TABLE public.phone_lookup_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.phone_lookup_usage FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.lookup_civizen_contacts_by_phone(p_phones text[])
RETURNS TABLE(phone_digits text, profile_id uuid, username text, full_name text, avatar_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_self uuid := public.current_profile_id();
  phones text[];
  v_used integer;
BEGIN
  IF auth.uid() IS NULL OR v_self IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  SELECT ARRAY(
    SELECT DISTINCT regexp_replace(candidate, '[^0-9]', '', 'g')
      FROM unnest(coalesce(p_phones, ARRAY[]::text[])) AS candidate
     WHERE length(regexp_replace(candidate, '[^0-9]', '', 'g')) BETWEEN 7 AND 15
     LIMIT 50
  ) INTO phones;
  IF phones IS NULL OR cardinality(phones) = 0 THEN
    RETURN;
  END IF;
  -- at most 200 numbers per member per day, so number ranges cannot be swept
  INSERT INTO public.phone_lookup_usage (profile_id, day, numbers) VALUES (v_self, current_date, cardinality(phones))
  ON CONFLICT ON CONSTRAINT phone_lookup_usage_pkey DO UPDATE SET numbers = public.phone_lookup_usage.numbers + EXCLUDED.numbers
  RETURNING phone_lookup_usage.numbers INTO v_used;
  IF v_used > 200 THEN
    RAISE EXCEPTION 'phone_lookup_daily_limit' USING ERRCODE = '54000';
  END IF;
  RETURN QUERY
  SELECT
    regexp_replace(coalesce(pr.phone_e164, pr.phone_number, ''), '[^0-9]', '', 'g') AS phone_digits,
    pr.id,
    pr.username,
    CASE WHEN coalesce((pr.privacy_settings->>'show_full_name')::boolean, true) THEN pr.full_name END,
    pr.avatar_url
  FROM public.profiles pr
  WHERE pr.deleted_at IS NULL
    AND coalesce(pr.is_system_agent, false) = false
    AND pr.user_id IS DISTINCT FROM auth.uid()
    AND coalesce((pr.privacy_settings->>'discoverable_by_phone')::boolean, false)
    AND regexp_replace(coalesce(pr.phone_e164, pr.phone_number, ''), '[^0-9]', '', 'g') = ANY (phones);
END;
$function$;
REVOKE ALL ON FUNCTION public.lookup_civizen_contacts_by_phone(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_civizen_contacts_by_phone(text[]) TO authenticated;

NOTIFY pgrst, 'reload schema';
