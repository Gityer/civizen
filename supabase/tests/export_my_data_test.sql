-- Regression checks for 20261006150000_export_my_data.sql. Runs in one transaction and rolls back.
BEGIN;

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
VALUES
  ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'export-a@example.test', '', now(), '{"full_name":"Export A","username":"export_test_a"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000e2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'export-b@example.test', '', now(), '{"full_name":"Export B","username":"export_test_b"}', now(), now());

CREATE TEMP TABLE export_ids AS
SELECT
  (SELECT id FROM public.profiles WHERE user_id = '00000000-0000-4000-8000-0000000000e1') AS a,
  (SELECT id FROM public.profiles WHERE user_id = '00000000-0000-4000-8000-0000000000e2') AS b;
GRANT SELECT ON export_ids TO authenticated, anon;

INSERT INTO public.posts (author_id, content) SELECT a, 'post by A' FROM export_ids;
INSERT INTO public.posts (author_id, content) SELECT b, 'post by B' FROM export_ids;

SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v jsonb := public.export_my_data();
BEGIN
  IF v->>'profile_id' <> (SELECT a::text FROM export_ids) THEN
    RAISE EXCEPTION 'FAIL: export is not for the caller';
  END IF;
  IF jsonb_array_length(v->'data'->'profiles') <> 1 THEN
    RAISE EXCEPTION 'FAIL: own profile missing from export';
  END IF;
  IF jsonb_array_length(v->'data'->'posts') <> 1 OR v->'data'->'posts'->0->>'content' <> 'post by A' THEN
    RAISE EXCEPTION 'FAIL: export posts are wrong: %', v->'data'->'posts';
  END IF;
  IF v->'data' ? 'civic_ballots' THEN
    RAISE EXCEPTION 'FAIL: ballots must not be exported';
  END IF;
END $$;

-- Rate limit: five per hour.
DO $$
BEGIN
  PERFORM public.export_my_data();
  PERFORM public.export_my_data();
  PERFORM public.export_my_data();
  PERFORM public.export_my_data();
  BEGIN
    PERFORM public.export_my_data();
    RAISE EXCEPTION 'FAIL: export was not rate limited';
  EXCEPTION WHEN program_limit_exceeded THEN NULL;
  END;
END $$;

RESET ROLE;
SET LOCAL ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM public.export_my_data();
    RAISE EXCEPTION 'FAIL: anon could export';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

ROLLBACK;
