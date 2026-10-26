-- Security finding M2 (job jd253bc24): sign-in-with-identifier sent every password attempt to GoTrue from the
-- function's own address with no limit per account or per caller, so password guessing was unlimited (or GoTrue's
-- per-IP limit blocked everyone at once). Attempts are now counted per identifier and per caller address in a
-- 15-minute window; the identifier is stored only as a hash.

CREATE TABLE IF NOT EXISTS public.sign_in_attempts (
  id bigserial PRIMARY KEY,
  identifier_hash text NOT NULL,
  caller_ip text NOT NULL,
  succeeded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sign_in_attempts_identifier_idx ON public.sign_in_attempts (identifier_hash, created_at);
CREATE INDEX IF NOT EXISTS sign_in_attempts_ip_idx ON public.sign_in_attempts (caller_ip, created_at);
ALTER TABLE public.sign_in_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sign_in_attempts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.sign_in_attempts_id_seq FROM PUBLIC, anon, authenticated;

-- Limits: 10 failed attempts per identifier and 30 attempts per caller address in 15 minutes.
CREATE OR REPLACE FUNCTION public.sign_in_attempt_allowed(p_identifier text, p_ip text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text := encode(extensions.digest(lower(trim(coalesce(p_identifier, ''))), 'sha256'), 'hex');
  v_ip text := left(coalesce(nullif(trim(p_ip), ''), 'unknown'), 64);
  v_since timestamptz := now() - interval '15 minutes';
BEGIN
  DELETE FROM public.sign_in_attempts WHERE created_at < now() - interval '1 day';
  IF (SELECT count(*) FROM public.sign_in_attempts
      WHERE identifier_hash = v_hash AND NOT succeeded AND created_at > v_since) >= 10 THEN
    RETURN false;
  END IF;
  IF (SELECT count(*) FROM public.sign_in_attempts WHERE caller_ip = v_ip AND created_at > v_since) >= 30 THEN
    RETURN false;
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_sign_in_attempt(p_identifier text, p_ip text, p_succeeded boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text := encode(extensions.digest(lower(trim(coalesce(p_identifier, ''))), 'sha256'), 'hex');
BEGIN
  INSERT INTO public.sign_in_attempts (identifier_hash, caller_ip, succeeded)
  VALUES (v_hash, left(coalesce(nullif(trim(p_ip), ''), 'unknown'), 64), coalesce(p_succeeded, false));
  IF p_succeeded THEN
    -- A successful sign-in clears that identifier's failure count.
    DELETE FROM public.sign_in_attempts WHERE identifier_hash = v_hash AND NOT succeeded;
  END IF;
END;
$$;

-- Only the edge function (service role) may call these.
REVOKE ALL ON FUNCTION public.sign_in_attempt_allowed(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_sign_in_attempt(text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sign_in_attempt_allowed(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_sign_in_attempt(text, text, boolean) TO service_role;
