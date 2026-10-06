-- Security hardening, phase 0 of the October 2026 review.
--
-- 1. Members could edit their own role, permission arrays and verification/citizenship columns on
--    `profiles` (the UPDATE policy has no column limits), which made any member an admin.
-- 2. Members could insert a `linked_accounts` row pointing at someone else's profile and then get a
--    sign-in token for it from `linked-account-switch`. Links now need both sides signed in.
-- 3. Governance vote weight, eligibility and the voting window were set by the client.
-- 4. Thirteen tables had no row level security while `anon`/`authenticated` held table grants.
-- 5. Internal functions (matter engine, cron ticks, service callbacks) stayed executable by `anon`
--    after their PUBLIC grant was revoked, because Supabase grants `anon` EXECUTE by default.
--
-- Database functions that run as their owner (SECURITY DEFINER) and the service role are not affected
-- by the new guards: they check `current_user`, which is only `authenticated`/`anon` for API callers.

-- ---------------------------------------------------------------------------------------------
-- 1. Privileged profile columns
-- ---------------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.profile_caller_is_api_user()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT current_user IN ('authenticated', 'anon');
$$;

CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  can_manage_access boolean;
  can_manage_status boolean;
BEGIN
  IF NOT public.profile_caller_is_api_user() THEN
    RETURN NEW;
  END IF;

  can_manage_access := public.has_permission('role.assign'::public.app_permission)
    OR public.has_permission('settings.manage'::public.app_permission);

  IF TG_OP = 'INSERT' THEN
    IF NOT can_manage_access THEN
      -- A self-created profile always starts as a plain member.
      NEW.role := 'member'::public.app_role;
      NEW.is_admin := false;
      NEW.granted_permissions := '{}'::public.app_permission[];
      NEW.custom_permissions := '{}'::public.app_permission[];
      NEW.denied_permissions := '{}'::public.app_permission[];
      NEW.is_verified := false;
      NEW.citizenship_status := 'registered_member'::public.citizenship_status;
      NEW.is_active_citizen := false;
      NEW.active_citizen_since := NULL;
      NEW.is_governance_eligible := false;
      NEW.governance_eligible_at := NULL;
      NEW.is_system_agent := false;
      NEW.experience_level := 'entry';
      NEW.deleted_at := NULL;
      NEW.deletion_reason := NULL;
    END IF;
    RETURN NEW;
  END IF;

  -- Identity of the row never changes through the API.
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.official_id IS DISTINCT FROM OLD.official_id
    OR NEW.social_security_number IS DISTINCT FROM OLD.social_security_number
    OR NEW.is_system_agent IS DISTINCT FROM OLD.is_system_agent
    OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
    OR NEW.deletion_reason IS DISTINCT FROM OLD.deletion_reason THEN
    RAISE EXCEPTION 'profile_protected_column'
      USING ERRCODE = '42501', HINT = 'Identity and deletion columns are managed by the system.';
  END IF;

  -- Role and permission arrays: only people who can assign roles.
  IF (NEW.role IS DISTINCT FROM OLD.role
      OR NEW.is_admin IS DISTINCT FROM OLD.is_admin
      OR NEW.granted_permissions IS DISTINCT FROM OLD.granted_permissions
      OR NEW.custom_permissions IS DISTINCT FROM OLD.custom_permissions
      OR NEW.denied_permissions IS DISTINCT FROM OLD.denied_permissions)
    AND NOT can_manage_access THEN
    RAISE EXCEPTION 'profile_role_change_not_allowed'
      USING ERRCODE = '42501', HINT = 'Requires role.assign or settings.manage.';
  END IF;

  can_manage_status := can_manage_access
    OR public.has_permission('profile.update_any'::public.app_permission)
    OR public.current_profile_in_governance_unit(
      ARRAY['constitutional_council', 'security_response', 'civic_operations']
    );

  -- Verification, citizenship and experience standing: staff, moderators or governance units.
  IF (NEW.is_verified IS DISTINCT FROM OLD.is_verified
      OR NEW.citizenship_status IS DISTINCT FROM OLD.citizenship_status
      OR NEW.citizenship_review_cleared_at IS DISTINCT FROM OLD.citizenship_review_cleared_at
      OR NEW.is_active_citizen IS DISTINCT FROM OLD.is_active_citizen
      OR NEW.active_citizen_since IS DISTINCT FROM OLD.active_citizen_since
      OR NEW.experience_level IS DISTINCT FROM OLD.experience_level)
    AND NOT can_manage_status THEN
    RAISE EXCEPTION 'profile_status_change_not_allowed'
      USING ERRCODE = '42501', HINT = 'Verification and citizenship standing are set by reviewers.';
  END IF;

  -- Governance eligibility is computed by refresh_governance_eligibility() (a later migration);
  -- members cannot record it for themselves.
  IF (NEW.is_governance_eligible IS DISTINCT FROM OLD.is_governance_eligible
      OR NEW.governance_eligible_at IS DISTINCT FROM OLD.governance_eligible_at)
    AND NOT can_manage_status THEN
    RAISE EXCEPTION 'profile_governance_eligibility_server_only'
      USING ERRCODE = '42501', HINT = 'Call refresh_governance_eligibility() instead.';
  END IF;

  RETURN NEW;
END;
$$;

-- Named to sort before the other BEFORE triggers on profiles (they fire alphabetically), so it sees
-- the caller's change before projections such as is_admin or the identity prefix are derived from it.
DROP TRIGGER IF EXISTS a_guard_profile_privileged_columns ON public.profiles;
CREATE TRIGGER a_guard_profile_privileged_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_privileged_columns();

-- ---------------------------------------------------------------------------------------------
-- 2. Linked accounts need both sides
-- ---------------------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Owners can insert linked accounts" ON public.linked_accounts;
DROP POLICY IF EXISTS "Staff can insert linked accounts" ON public.linked_accounts;
CREATE POLICY "Staff can insert linked accounts"
  ON public.linked_accounts
  FOR INSERT
  WITH CHECK (public.has_permission('settings.manage'::public.app_permission));

CREATE TABLE IF NOT EXISTS public.linked_account_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  owner_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  relationship_type text NOT NULL DEFAULT 'business' CHECK (relationship_type IN ('business')),
  business_name_normalized text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  accepted_at timestamptz,
  accepted_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_linked_account_invites_owner
  ON public.linked_account_invites (owner_profile_id, created_at DESC);

ALTER TABLE public.linked_account_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.linked_account_invites FROM anon, authenticated;

-- Called by the owner's session. Returns a one-time token for the business session to accept.
CREATE OR REPLACE FUNCTION public.create_linked_account_invite(p_business_name_normalized text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_owner uuid := public.current_profile_id();
  v_name text := nullif(btrim(coalesce(p_business_name_normalized, '')), '');
  v_token text;
  v_recent integer;
BEGIN
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'not_signed_in' USING ERRCODE = '42501';
  END IF;
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'business_name_required' USING ERRCODE = '22023';
  END IF;

  SELECT count(*) INTO v_recent
  FROM public.linked_account_invites
  WHERE owner_profile_id = v_owner AND created_at > now() - interval '1 hour';
  IF v_recent >= 10 THEN
    RAISE EXCEPTION 'linked_account_invite_rate_limited' USING ERRCODE = '54000';
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');
  INSERT INTO public.linked_account_invites (token_hash, owner_profile_id, business_name_normalized)
  VALUES (encode(digest(v_token, 'sha256'), 'hex'), v_owner, v_name);
  RETURN v_token;
END;
$$;

-- Called by the business account's own session (it has proven its password). Creates the link.
CREATE OR REPLACE FUNCTION public.accept_linked_account_invite(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_linked uuid := public.current_profile_id();
  v_invite public.linked_account_invites%ROWTYPE;
  v_link_id uuid;
BEGIN
  IF v_linked IS NULL THEN
    RAISE EXCEPTION 'not_signed_in' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_invite
  FROM public.linked_account_invites
  WHERE token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
  FOR UPDATE;

  IF NOT FOUND OR v_invite.accepted_at IS NOT NULL OR v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'linked_account_invite_invalid' USING ERRCODE = '22023';
  END IF;
  IF v_invite.owner_profile_id = v_linked THEN
    RAISE EXCEPTION 'linked_account_invite_self' USING ERRCODE = '22023';
  END IF;
  -- Staff accounts are never linked under someone else.
  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_linked AND (p.role IN ('founder', 'admin', 'system') OR p.is_system_agent)
  ) THEN
    RAISE EXCEPTION 'linked_account_invite_staff_target' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.linked_accounts (owner_profile_id, linked_profile_id, relationship_type, business_name_normalized)
  VALUES (v_invite.owner_profile_id, v_linked, v_invite.relationship_type, v_invite.business_name_normalized)
  RETURNING id INTO v_link_id;

  UPDATE public.linked_account_invites
  SET accepted_at = now(), accepted_by_profile_id = v_linked
  WHERE id = v_invite.id;

  RETURN v_link_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_linked_account_invite(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_linked_account_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_linked_account_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_linked_account_invite(text) TO authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3. Governance votes: window, eligibility and weight come from the server
-- ---------------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_governance_vote_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal record;
  v_voter record;
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

  SELECT is_verified, is_governance_eligible, citizenship_status, is_active_citizen INTO v_voter
  FROM public.profiles
  WHERE id = NEW.voter_id AND deleted_at IS NULL;

  IF NOT FOUND OR NOT coalesce(v_voter.is_verified, false) OR NOT coalesce(v_voter.is_governance_eligible, false) THEN
    RAISE EXCEPTION 'governance_vote_not_eligible' USING ERRCODE = '42501';
  END IF;

  NEW.weight := 1;
  NEW.snapshot := coalesce(NEW.snapshot, '{}'::jsonb) || jsonb_build_object(
    'is_verified', v_voter.is_verified,
    'citizenship_status', v_voter.citizenship_status,
    'is_active_citizen', v_voter.is_active_citizen,
    'is_governance_eligible', v_voter.is_governance_eligible,
    'server_checked_at', now()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_governance_vote_rules ON public.governance_proposal_votes;
CREATE TRIGGER enforce_governance_vote_rules
  BEFORE INSERT OR UPDATE ON public.governance_proposal_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_governance_vote_rules();

REVOKE ALL ON FUNCTION public.enforce_governance_vote_rules() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 4. Row level security on tables that had none
-- ---------------------------------------------------------------------------------------------
-- None of these are read by the app directly; they are used through SECURITY DEFINER functions,
-- which run as the table owner and are unaffected. Staff keep direct read access.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'activation_demographic_feed_worker_escalation_policies',
    'activation_demographic_feed_worker_escalation_policy_events',
    'activation_demographic_feed_worker_schedule_automation_runs',
    'agreement_reference_counters',
    'governance_emergency_access_ops_policies',
    'governance_emergency_access_ops_policy_events',
    'governance_emergency_access_request_events',
    'governance_public_audit_verifier_federation_exchange_attestations',
    'gpav_fed_exchange_receipt_automation_runs',
    'gpav_fed_exchange_receipt_policies',
    'gpav_fed_exchange_receipt_policy_events',
    'identity_verification_providers',
    'matter_escalation_policy_defaults'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.%I FROM authenticated', t);
    EXECUTE format('DROP POLICY IF EXISTS "Staff can read" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "Staff can read" ON public.%I FOR SELECT TO authenticated USING (public.has_permission(%L::public.app_permission))',
      t, 'settings.manage'
    );
  END LOOP;
END $$;

-- The agreement reference counter is bumped by a trigger running as the member; let it run as owner.
ALTER FUNCTION public.agreement_next_reference() SECURITY DEFINER SET search_path = public;
REVOKE ALL ON FUNCTION public.agreement_next_reference() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agreement_next_reference() TO authenticated;

-- ---------------------------------------------------------------------------------------------
-- 5. Internal functions are not callable by logged-out visitors
-- ---------------------------------------------------------------------------------------------
-- Rule: when a signed-in member cannot run a function, a logged-out visitor must not either. This
-- covers the matter engine internals (matter_close, matter_add_party, ...), cron ticks and the
-- service callbacks (matter_complete_agent_run_service, fail_matter_agent_run_service).

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
      AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn.sig);
  END LOOP;
END $$;

-- Service callbacks must also check the caller themselves, in case a grant is ever re-added.
DO $$
BEGIN
  IF to_regprocedure('public.matter_complete_agent_run_service(jsonb)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.matter_complete_agent_run_service(jsonb) FROM PUBLIC, anon, authenticated;
  END IF;
  IF to_regprocedure('public.fail_matter_agent_run_service(uuid, text)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.fail_matter_agent_run_service(uuid, text) FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

-- Finance audit events record the signed-in caller; only server code may name another actor.
CREATE OR REPLACE FUNCTION public.finance_write_audit(
  p_event_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_actor uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  eid uuid;
  actor uuid := CASE
    WHEN coalesce(auth.role(), '') IN ('authenticated', 'anon') THEN auth.uid()
    ELSE COALESCE(p_actor, auth.uid())
  END;
BEGIN
  INSERT INTO public.finance_audit_events (event_type, entity_type, entity_id, payload, actor_user_id)
  VALUES (p_event_type, p_entity_type, p_entity_id, COALESCE(p_payload, '{}'::jsonb), actor)
  RETURNING id INTO eid;
  RETURN eid;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.finance_write_audit(text, text, uuid, jsonb, uuid) FROM anon;
