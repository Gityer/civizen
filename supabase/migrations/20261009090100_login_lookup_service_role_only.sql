-- Phase 0 trust hardening (S5): the username/phone → e-mail lookup used by the login form could be
-- called anonymously, which let anyone learn the e-mail behind any username or phone number.
-- The lookup now runs only inside the `sign-in-with-identifier` edge function (service role).
--
-- Deploy order: the edge function and the web bundle that uses it must be live BEFORE this file is
-- applied, otherwise username and phone sign-in stops working until they are.

REVOKE ALL ON FUNCTION public.resolve_login_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_login_email(text) TO service_role;

COMMENT ON FUNCTION public.resolve_login_email(text) IS
  'Resolves a username or phone number to the account e-mail for sign-in. Service role only; called by the sign-in-with-identifier edge function.';
