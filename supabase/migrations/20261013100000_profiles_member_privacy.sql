-- v2 plan step A2 (decision E3): other members may read only the public part of a profile. Birth date, place of
-- birth, sex, phone, official and social-security numbers, city/region, permission arrays, terms and messaging
-- settings, privacy settings and activity timestamps are readable only by the owner (my_profile) and by staff
-- (admin_list_profiles). Enforced with column privileges, so a crafted client cannot select them either.
-- New profile columns are private by default: grant them below only if every member may see them.

REVOKE SELECT ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id, user_id, username, full_name, avatar_url, bio, is_verified, is_admin, created_at, updated_at,
  country, country_code, language_code, role, experience_level, deleted_at,
  citizenship_status, is_active_citizen, active_citizen_since, is_governance_eligible, governance_eligible_at,
  is_system_agent, citizen_signing_public_key, citizen_signing_key_algorithm, citizen_signing_key_registered_at,
  messaging_x25519_public_key
) ON public.profiles TO anon, authenticated;

-- The signed-in member's own full row (Auth context, Edit Profile, ID card, messaging settings).
CREATE OR REPLACE FUNCTION public.my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE user_id = auth.uid() AND deleted_at IS NULL LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_profile() TO authenticated;

-- Full rows for staff who administer members (Users admin).
CREATE OR REPLACE FUNCTION public.admin_list_profiles()
RETURNS SETOF public.profiles
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_permission('role.assign'::public.app_permission)
          OR public.has_permission('settings.manage'::public.app_permission)) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.profiles WHERE deleted_at IS NULL ORDER BY created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;

-- Endorsements follow the owner's "show endorsements" switch for everyone except the two parties and moderators.
CREATE OR REPLACE FUNCTION public.profile_shows_endorsements(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((SELECT (privacy_settings ->> 'show_endorsements')::boolean FROM public.profiles WHERE id = p_profile_id), true);
$$;
REVOKE ALL ON FUNCTION public.profile_shows_endorsements(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_shows_endorsements(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Non-hidden endorsements are viewable by everyone" ON public.endorsements;
DROP POLICY IF EXISTS "Endorsements are visible per the endorsed member's choice" ON public.endorsements;
CREATE POLICY "Endorsements are visible per the endorsed member's choice"
  ON public.endorsements
  FOR SELECT
  USING (
    public.has_permission('endorsement.moderate'::public.app_permission)
    OR (
      is_hidden = false
      AND (
        endorser_id = public.current_profile_id()
        OR endorsed_id = public.current_profile_id()
        OR public.profile_shows_endorsements(endorsed_id)
      )
    )
  );
