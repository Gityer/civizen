-- v2 plan step C6, decision E5: the founder becomes an office.
-- Part 1 (this migration, additive): founder authority comes from the constitutional founder office as well as
-- from the founder role, through one helper (profile_has_founder_authority). The office grants the founder
-- permission set; the maturity withdrawal (founder_withdrawn_permissions) applies to whoever holds founder
-- authority. Nobody loses a permission today.
-- Part 2 (a later migration, after the owner confirms which account holds the office): replace
-- founder_role_grants_authority() with `SELECT false`. The founder role then carries baseline member
-- permissions and only the office holder keeps founder powers.

CREATE OR REPLACE FUNCTION public.founder_role_grants_authority()
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT true;
$$;
COMMENT ON FUNCTION public.founder_role_grants_authority() IS
  'Decision E5 switch: true while the founder ROLE still carries founder powers; set to false once the founder OFFICE holder is confirmed.';

CREATE OR REPLACE FUNCTION public.profile_has_founder_authority(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    p_profile_id IS NOT NULL AND (
      public.profile_has_constitutional_office(p_profile_id, 'founder'::public.constitutional_office_key)
      OR (
        public.founder_role_grants_authority()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_profile_id AND p.role = 'founder'::public.app_role AND p.deleted_at IS NULL)
      )
    ),
    false
  );
$$;
REVOKE ALL ON FUNCTION public.profile_has_founder_authority(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.profile_has_founder_authority(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.founder_withdrawn_permissions(target_profile_id uuid)
RETURNS public.app_permission[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN public.profile_has_founder_authority(target_profile_id) THEN coalesce(
    (
      SELECT array_agg(DISTINCT scope.permission)
      FROM public.governance_domain_permission_scopes AS scope
      WHERE public.governance_domain_is_mature(scope.domain_key)
        AND NOT EXISTS (
          SELECT 1
          FROM public.profile_governance_roles AS assignment
          WHERE assignment.profile_id = target_profile_id
            AND assignment.domain_key = scope.domain_key
            AND assignment.is_active = true
            AND (assignment.ended_at IS NULL OR assignment.ended_at > now())
        )
    ),
    '{}'::public.app_permission[]
  ) ELSE '{}'::public.app_permission[] END;
$$;

-- Effective permissions: role (a founder role without founder authority counts as a member), plus the founder
-- permission set for the founder office holder, plus individual grants; minus denials and, for whoever holds
-- founder authority, the permissions matured domains have withdrawn.
CREATE OR REPLACE FUNCTION public.current_app_permissions()
RETURNS public.app_permission[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT ARRAY(
        SELECT DISTINCT permission
        FROM unnest(
          public.app_role_permissions(
            CASE WHEN profile.role = 'founder'::public.app_role AND NOT authority.has_authority
                 THEN 'member'::public.app_role ELSE profile.role END
          )
          || CASE WHEN authority.holds_office THEN public.app_role_permissions('founder'::public.app_role)
                  ELSE '{}'::public.app_permission[] END
          || COALESCE(profile.granted_permissions, '{}'::public.app_permission[])
          || COALESCE(profile.custom_permissions, '{}'::public.app_permission[])
        ) AS permission
        WHERE permission <> ALL(COALESCE(profile.denied_permissions, '{}'::public.app_permission[]))
          AND (
            NOT authority.has_authority
            OR permission <> ALL(COALESCE(public.founder_withdrawn_permissions(profile.id), '{}'::public.app_permission[]))
          )
      )
      FROM public.profiles AS profile
      CROSS JOIN LATERAL (
        SELECT
          public.profile_has_constitutional_office(profile.id, 'founder'::public.constitutional_office_key) AS holds_office,
          public.profile_has_founder_authority(profile.id) AS has_authority
      ) AS authority
      WHERE profile.user_id = auth.uid()
      LIMIT 1
    ),
    public.app_role_permissions('guest'::public.app_role)
  );
$$;

-- Voting proposal management: admins, the system, and whoever holds founder authority.
CREATE OR REPLACE FUNCTION public.civic_can_manage_voting_proposals(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_profile_id
      AND p.deleted_at IS NULL
      AND (p.role IN ('admin', 'system') OR public.profile_has_founder_authority(p.id))
  );
$$;

-- For the client: does the signed-in member hold founder authority (office, or role while the switch is on)?
CREATE OR REPLACE FUNCTION public.my_founder_authority()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.profile_has_founder_authority(public.current_profile_id());
$$;
REVOKE ALL ON FUNCTION public.my_founder_authority() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_founder_authority() TO authenticated;
