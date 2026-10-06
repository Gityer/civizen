-- Regression checks for 20261006190000_search_posts.sql. Runs in one transaction and rolls back.
BEGIN;

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
VALUES
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'search-a@example.test', '', now(), '{"full_name":"Search A","username":"search_test_a"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000b3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'search-b@example.test', '', now(), '{"full_name":"Search B","username":"search_test_b"}', now(), now());

CREATE TEMP TABLE search_ids AS
SELECT
  (SELECT id FROM public.profiles WHERE user_id = '00000000-0000-4000-8000-0000000000b1') AS a,
  (SELECT id FROM public.profiles WHERE user_id = '00000000-0000-4000-8000-0000000000b3') AS b;
GRANT SELECT ON search_ids TO authenticated;

INSERT INTO public.posts (author_id, content) SELECT b, '<p>Community Garden opening on Saturday</p>' FROM search_ids;
INSERT INTO public.posts (author_id, content) SELECT b, '<p>Garden tools wanted, 100% free</p>' FROM search_ids;
INSERT INTO public.posts (author_id, content) SELECT b, '<p>Nothing related</p>' FROM search_ids;

SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.search_posts('garden')) <> 2 THEN
    RAISE EXCEPTION 'FAIL: expected 2 garden posts, got %', (SELECT count(*) FROM public.search_posts('garden'));
  END IF;
  IF (SELECT count(*) FROM public.search_posts('100%')) <> 1 THEN
    RAISE EXCEPTION 'FAIL: percent sign was treated as a wildcard';
  END IF;
  IF (SELECT count(*) FROM public.search_posts('g')) <> 0 THEN
    RAISE EXCEPTION 'FAIL: one-letter query returned rows';
  END IF;
END $$;

INSERT INTO public.post_hides (profile_id, post_id)
SELECT a, (SELECT id FROM public.posts WHERE content LIKE '%Saturday%' AND author_id = b) FROM search_ids;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.search_posts('garden')) <> 1 THEN
    RAISE EXCEPTION 'FAIL: hidden post still found';
  END IF;
END $$;

RESET ROLE;
INSERT INTO public.private_message_blocks (blocker_id, blocked_id) SELECT a, b FROM search_ids;
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.search_posts('garden')) <> 0 THEN
    RAISE EXCEPTION 'FAIL: blocked author''s post still found';
  END IF;
END $$;

RESET ROLE;
INSERT INTO public.governance_proposals (title, summary, proposer_id, opens_at, closes_at)
SELECT 'Garden budget proposal', 'Fund the community garden', b, now(), now() + interval '1 day' FROM search_ids;
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.search_civic_items('garden budget') WHERE kind = 'proposal') THEN
    RAISE EXCEPTION 'FAIL: proposal not found by search_civic_items';
  END IF;
END $$;

ROLLBACK;
