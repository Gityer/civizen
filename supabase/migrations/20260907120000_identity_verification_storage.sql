-- Private storage for identity verification ID photos and selfies.
-- Path layout: {profile_id}/{case_id}/{kind}-{uuid}.{ext}

INSERT INTO storage.buckets (id, name, public)
VALUES ('identity-verification', 'identity-verification', false)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.can_review_identity_verification_storage()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.current_profile_id() IS NOT NULL
    AND (
      public.has_permission('role.assign'::public.app_permission)
      OR public.has_permission('settings.manage'::public.app_permission)
    );
$$;

REVOKE ALL ON FUNCTION public.can_review_identity_verification_storage() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_review_identity_verification_storage() TO authenticated;

DROP POLICY IF EXISTS "Identity verification files read entitled" ON storage.objects;
DROP POLICY IF EXISTS "Identity verification files insert own" ON storage.objects;
DROP POLICY IF EXISTS "Identity verification files update own" ON storage.objects;
DROP POLICY IF EXISTS "Identity verification files delete own" ON storage.objects;

CREATE POLICY "Identity verification files read entitled"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'identity-verification'
  AND split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND (
    split_part(name, '/', 1) = public.current_profile_id()::text
    OR public.can_review_identity_verification_storage()
  )
);

CREATE POLICY "Identity verification files insert own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'identity-verification'
  AND split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND split_part(name, '/', 1) = public.current_profile_id()::text
  AND split_part(name, '/', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);

CREATE POLICY "Identity verification files update own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'identity-verification'
  AND split_part(name, '/', 1) = public.current_profile_id()::text
)
WITH CHECK (
  bucket_id = 'identity-verification'
  AND split_part(name, '/', 1) = public.current_profile_id()::text
);

CREATE POLICY "Identity verification files delete own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'identity-verification'
  AND split_part(name, '/', 1) = public.current_profile_id()::text
);
