-- Abuse limits found in the review:
-- 1. resolve_login_email(identifier) let anyone turn a username or phone number into the account's
--    email address. The replacement only answers when the password is right, and counts failures.
-- 2. Anyone could register a username such as "civizen_support" and pose as the platform.
-- 3. Signed-in AI requests (Civi chat, solutions council) had no per-member limit.

-- ---------------------------------------------------------------------------------------------
-- 1. Username / phone sign-in
-- ---------------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.login_identifier_failures (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  identifier_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_identifier_failures_hash_created
  ON public.login_identifier_failures (identifier_hash, created_at DESC);

-- Only reachable through the definer function below.
ALTER TABLE public.login_identifier_failures ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.login_identifier_failures FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.resolve_login_email(identifier text, password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  normalized text := lower(trim(coalesce(identifier, '')));
  digits text := regexp_replace(coalesce(identifier, ''), '[^0-9]', '', 'g');
  v_hash text;
  v_user record;
  v_matches integer;
BEGIN
  IF normalized = '' OR coalesce(password, '') = '' OR position('@' in normalized) > 0 THEN
    RETURN NULL;
  END IF;

  v_hash := encode(extensions.digest(normalized, 'sha256'), 'hex');

  -- Ten wrong passwords per username or phone in 15 minutes, then wait. Email sign-in is unaffected.
  IF (
    SELECT count(*) FROM public.login_identifier_failures f
    WHERE f.identifier_hash = v_hash AND f.created_at > now() - interval '15 minutes'
  ) >= 10 THEN
    RAISE EXCEPTION 'too_many_login_attempts' USING ERRCODE = '54000';
  END IF;

  SELECT u.email, u.encrypted_password INTO v_user
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE lower(p.username) = normalized AND p.deleted_at IS NULL
  LIMIT 1;

  IF NOT FOUND AND digits <> '' THEN
    SELECT count(*) INTO v_matches
    FROM public.profiles p
    WHERE p.deleted_at IS NULL
      AND (regexp_replace(coalesce(p.phone_e164, ''), '[^0-9]', '', 'g') = digits
        OR regexp_replace(coalesce(p.phone_number, ''), '[^0-9]', '', 'g') = digits);

    IF v_matches = 1 THEN
      SELECT u.email, u.encrypted_password INTO v_user
      FROM public.profiles p
      JOIN auth.users u ON u.id = p.user_id
      WHERE p.deleted_at IS NULL
        AND (regexp_replace(coalesce(p.phone_e164, ''), '[^0-9]', '', 'g') = digits
          OR regexp_replace(coalesce(p.phone_number, ''), '[^0-9]', '', 'g') = digits);
    END IF;
  END IF;

  IF v_user.email IS NOT NULL
    AND v_user.encrypted_password IS NOT NULL
    AND v_user.encrypted_password <> ''
    AND extensions.crypt(password, v_user.encrypted_password) = v_user.encrypted_password THEN
    RETURN lower(v_user.email);
  END IF;

  INSERT INTO public.login_identifier_failures (identifier_hash) VALUES (v_hash);
  DELETE FROM public.login_identifier_failures WHERE created_at < now() - interval '1 day';
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_login_email(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_login_email(text, text) TO anon, authenticated;

-- The one-argument version answered without a password. App builds before this change fall back to
-- email sign-in.
REVOKE ALL ON FUNCTION public.resolve_login_email(text) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 2. Reserved usernames
-- ---------------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_reserved_username(p_username text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(coalesce(p_username, '')) ~ '(c[i1l]v[i1l]zen|levela)'
    OR lower(coalesce(p_username, '')) IN (
      'admin', 'administrator', 'support', 'help', 'helpdesk', 'official', 'moderator', 'mod',
      'staff', 'system', 'root', 'security', 'nela', 'civi', 'founder', 'team', 'info', 'contact',
      'governance', 'council', 'verify', 'verification', 'notifications', 'noreply', 'no_reply'
    );
$$;

-- Runs after prepare_profile_identity (triggers fire alphabetically) so it sees the final username.
CREATE OR REPLACE FUNCTION public.guard_reserved_username()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.username IS NULL
    OR (TG_OP = 'UPDATE' AND NEW.username IS NOT DISTINCT FROM OLD.username)
    OR coalesce(NEW.is_system_agent, false)
    OR NOT public.is_reserved_username(NEW.username)
    OR public.has_permission('settings.manage'::public.app_permission)
    OR public.has_permission('role.assign'::public.app_permission) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Sign-up cannot be told apart from staff tools here, so give the account a neutral name;
    -- staff can rename official accounts afterwards.
    NEW.username := public.generate_unique_username('member');
    RETURN NEW;
  END IF;

  IF public.profile_caller_is_api_user() THEN
    RAISE EXCEPTION 'username_reserved'
      USING ERRCODE = '42501', HINT = 'This username is reserved for official Civizen accounts.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS q_guard_reserved_username ON public.profiles;
CREATE TRIGGER q_guard_reserved_username
  BEFORE INSERT OR UPDATE OF username ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_reserved_username();

REVOKE ALL ON FUNCTION public.guard_reserved_username() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3. Per-member AI quota, used by edge functions with the service role
-- ---------------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bucket text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_events_profile_bucket_created
  ON public.ai_usage_events (profile_id, bucket, created_at DESC);

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_usage_events FROM anon, authenticated;

-- Records one use and returns true while the member is within p_limit uses per p_window.
CREATE OR REPLACE FUNCTION public.consume_ai_quota(
  p_profile_id uuid,
  p_bucket text,
  p_limit integer,
  p_window interval
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- One member's requests are counted one at a time, so parallel calls cannot overshoot.
  PERFORM pg_advisory_xact_lock(hashtext(p_profile_id::text || ':' || p_bucket));

  IF (
    SELECT count(*) FROM public.ai_usage_events e
    WHERE e.profile_id = p_profile_id AND e.bucket = p_bucket AND e.created_at > now() - p_window
  ) >= p_limit THEN
    RETURN false;
  END IF;

  INSERT INTO public.ai_usage_events (profile_id, bucket) VALUES (p_profile_id, p_bucket);
  DELETE FROM public.ai_usage_events
  WHERE profile_id = p_profile_id AND bucket = p_bucket AND created_at < now() - interval '7 days';
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_quota(uuid, text, integer, interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota(uuid, text, integer, interval) TO service_role;

-- ---------------------------------------------------------------------------------------------
-- 4. Emergency account access needs a second person
-- ---------------------------------------------------------------------------------------------
-- An admin could request emergency access to a member's account, approve their own request and
-- then sign in as that member. Approval now has to come from someone else, and the access can be
-- used only by the person who asked for it.

CREATE OR REPLACE FUNCTION public.enforce_emergency_access_two_person_rule()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.request_status = 'approved'
    AND OLD.request_status IS DISTINCT FROM 'approved'
    AND NEW.reviewed_by IS NOT DISTINCT FROM NEW.requested_by THEN
    RAISE EXCEPTION 'emergency_access_self_approval'
      USING ERRCODE = '42501', HINT = 'Another administrator must approve this request.';
  END IF;

  IF NEW.consumed_at IS NOT NULL
    AND OLD.consumed_at IS NULL
    AND NEW.consumed_by IS DISTINCT FROM NEW.requested_by THEN
    RAISE EXCEPTION 'emergency_access_wrong_claimant'
      USING ERRCODE = '42501', HINT = 'Only the requester can use approved emergency access.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_emergency_access_two_person_rule ON public.governance_emergency_access_requests;
CREATE TRIGGER enforce_emergency_access_two_person_rule
  BEFORE UPDATE ON public.governance_emergency_access_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_emergency_access_two_person_rule();

REVOKE ALL ON FUNCTION public.enforce_emergency_access_two_person_rule() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 5. X sign-in uses a real PKCE verifier
-- ---------------------------------------------------------------------------------------------
-- The X connection derived its PKCE verifier from the OAuth state, which travels in the URL, so
-- the verifier protected nothing. The verifier is now random and kept server-side with the state.
ALTER TABLE public.social_oauth_states ADD COLUMN IF NOT EXISTS code_verifier text;
