-- Security finding M2: sign-in attempts are limited per identifier and per caller. LOCAL database only. Rolls back.

BEGIN;

DO $$
DECLARE i integer;
BEGIN
  FOR i IN 1..10 LOOP
    IF NOT public.sign_in_attempt_allowed('Someone', '203.0.113.7') THEN RAISE EXCEPTION 'refused too early at %', i; END IF;
    PERFORM public.record_sign_in_attempt('someone', '203.0.113.7', false);
  END LOOP;
  IF public.sign_in_attempt_allowed('SOMEONE ', '198.51.100.1') THEN
    RAISE EXCEPTION 'an 11th failure for the same identifier (other caller, other case) was allowed';
  END IF;
  IF NOT public.sign_in_attempt_allowed('someone-else', '198.51.100.1') THEN
    RAISE EXCEPTION 'another identifier was refused';
  END IF;
  PERFORM public.record_sign_in_attempt('someone', '198.51.100.1', true);
  IF NOT public.sign_in_attempt_allowed('someone', '198.51.100.1') THEN
    RAISE EXCEPTION 'a successful sign-in did not clear the failure count';
  END IF;
  FOR i IN 1..30 LOOP
    PERFORM public.record_sign_in_attempt('user' || i, '192.0.2.9', false);
  END LOOP;
  IF public.sign_in_attempt_allowed('fresh-user', '192.0.2.9') THEN
    RAISE EXCEPTION 'a 31st attempt from one caller was allowed';
  END IF;
  IF EXISTS (SELECT 1 FROM public.sign_in_attempts WHERE identifier_hash ILIKE '%someone%') THEN
    RAISE EXCEPTION 'identifiers are stored in clear text';
  END IF;
  RAISE NOTICE 'ok: per-identifier and per-caller limits, reset on success, hashed identifiers';
END $$;

SET LOCAL ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM public.sign_in_attempt_allowed('x', 'y');
    RAISE EXCEPTION 'anon could call the limiter';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM 1 FROM public.sign_in_attempts LIMIT 1;
    RAISE EXCEPTION 'anon could read sign-in attempts';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'ok: closed to clients';
END $$;

ROLLBACK;
