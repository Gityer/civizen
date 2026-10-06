-- Regression checks for 20261006180000_account_deletion_purge.sql. Runs in one transaction and rolls back.
BEGIN;

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
VALUES
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'purge-a@example.test', '', now(), '{"full_name":"Purge A","username":"purge_test_a"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'purge-b@example.test', '', now(), '{"full_name":"Purge B","username":"purge_test_b"}', now(), now());

CREATE TEMP TABLE purge_ids AS
SELECT
  (SELECT id FROM public.profiles WHERE user_id = '00000000-0000-4000-8000-0000000000c1') AS a,
  (SELECT id FROM public.profiles WHERE user_id = '00000000-0000-4000-8000-0000000000c2') AS b;

INSERT INTO public.posts (author_id, content) SELECT a, 'A post' FROM purge_ids;
INSERT INTO public.posts (author_id, content) SELECT b, 'B post' FROM purge_ids;
INSERT INTO public.post_hides (profile_id, post_id)
SELECT a, (SELECT id FROM public.posts WHERE content = 'B post' AND author_id = b) FROM purge_ids;

SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
SELECT public.delete_my_account('delete');
RESET ROLE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.posts WHERE author_id = (SELECT a FROM purge_ids)) THEN
    RAISE EXCEPTION 'FAIL: deleted member''s posts remain';
  END IF;
  IF EXISTS (SELECT 1 FROM public.post_hides WHERE profile_id = (SELECT a FROM purge_ids)) THEN
    RAISE EXCEPTION 'FAIL: deleted member''s private rows remain';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.posts WHERE author_id = (SELECT b FROM purge_ids)) THEN
    RAISE EXCEPTION 'FAIL: another member''s post was removed';
  END IF;
END $$;

ROLLBACK;
