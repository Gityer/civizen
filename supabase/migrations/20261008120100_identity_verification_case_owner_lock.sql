-- Phase 0 trust hardening (S2): the owner of an identity verification case could update any column of
-- the case, including status, and the projection trigger then marked the profile verified. Owners may
-- now create a draft, fill in the completion flags and submit it (draft -> submitted). Every other
-- transition and every reviewer field stays with reviewers (role.assign / settings.manage / the
-- identity_verification governance domain) and server functions.

CREATE OR REPLACE FUNCTION public.guard_identity_verification_case_owner_writes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_direct_client boolean := current_user IN ('authenticated', 'anon');
  v_reviewer boolean;
BEGIN
  IF NOT v_direct_client THEN
    RETURN NEW;
  END IF;

  v_reviewer := NOT public.current_profile_has_governance_block('verification_review'::public.governance_block_scope)
    AND (
      public.has_permission('role.assign'::public.app_permission)
      OR public.has_permission('settings.manage'::public.app_permission)
      OR public.current_profile_in_governance_domain(ARRAY['identity_verification'])
    );

  IF v_reviewer THEN
    RETURN NEW;
  END IF;

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

  IF OLD.status NOT IN ('draft'::public.identity_verification_case_status, 'submitted'::public.identity_verification_case_status) THEN
    RAISE EXCEPTION 'verification_case_locked_for_owner' USING ERRCODE = '42501';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT (OLD.status = 'draft'::public.identity_verification_case_status
              AND NEW.status = 'submitted'::public.identity_verification_case_status) THEN
    RAISE EXCEPTION 'verification_case_owner_status_forbidden' USING ERRCODE = '42501';
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
$$;

COMMENT ON FUNCTION public.guard_identity_verification_case_owner_writes() IS
  'BEFORE INSERT/UPDATE guard: case owners may only create drafts, edit completion fields and submit; status decisions and reviewer fields need reviewer rights.';

DROP TRIGGER IF EXISTS aaa_guard_identity_verification_case_owner_writes ON public.identity_verification_cases;
CREATE TRIGGER aaa_guard_identity_verification_case_owner_writes
  BEFORE INSERT OR UPDATE ON public.identity_verification_cases
  FOR EACH ROW EXECUTE FUNCTION public.guard_identity_verification_case_owner_writes();
