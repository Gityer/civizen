-- v2 step B3: signed-out visitors read public Matters and their public comments; participants-only Matters,
-- participants-only comments and comments hidden by moderation never reach them.
-- Run with scripts/local-supabase/run-sql-tests.sh against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('test.author_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);

DO $$
BEGIN
  IF coalesce(current_setting('test.author_uid', true), '') = '' THEN
    RAISE EXCEPTION 'fixture member missing in the local database';
  END IF;
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.author_uid'))::text, true);
SELECT set_config('test.community_pid', public.resolve_civizen_org_profile()::text, true);
SELECT set_config('test.public_id', public.create_matter(jsonb_build_object(
  'title', 'Guest test: drinking fountains in parks',
  'description', 'Public Matter about drinking water in public parks.',
  'matter_type', 'suggestion',
  'addressee_kind', 'organization',
  'addressee_profile_id', current_setting('test.community_pid'),
  'visibility', 'public',
  'scope_kind', 'global'
))::text, true);
SELECT set_config('test.private_id', public.create_matter(jsonb_build_object(
  'title', 'Guest test: participants-only',
  'description', 'Only for participants.',
  'matter_type', 'question',
  'addressee_kind', 'organization',
  'addressee_profile_id', current_setting('test.community_pid'),
  'visibility', 'participants',
  'scope_kind', 'global'
))::text, true);
RESET ROLE;

INSERT INTO public.matter_comments (id, matter_id, author_kind, author_profile_id, body, visibility)
SELECT '7b000000-0000-4000-8000-000000000001', current_setting('test.public_id')::uuid, 'person', p.id, 'Public comment', NULL
  FROM public.profiles p WHERE p.user_id = current_setting('test.author_uid')::uuid;
INSERT INTO public.matter_comments (id, matter_id, author_kind, author_profile_id, body, visibility)
SELECT '7b000000-0000-4000-8000-000000000002', current_setting('test.public_id')::uuid, 'person', p.id, 'Participants comment', 'participants'
  FROM public.profiles p WHERE p.user_id = current_setting('test.author_uid')::uuid;
INSERT INTO public.matter_comments (id, matter_id, author_kind, author_profile_id, body, visibility, moderation_hidden_at, moderation_reason)
SELECT '7b000000-0000-4000-8000-000000000003', current_setting('test.public_id')::uuid, 'person', p.id, 'Hidden comment', NULL, now(), 'spam'
  FROM public.profiles p WHERE p.user_id = current_setting('test.author_uid')::uuid;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
DO $$
DECLARE v jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(public.public_matter_cards('fountains')) e WHERE e->>'id' = current_setting('test.public_id')
  ) THEN
    RAISE EXCEPTION 'guest does not see the public Matter';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(public.public_matter_cards(NULL, NULL, NULL, NULL, 60, 0)) e WHERE e->>'id' = current_setting('test.private_id')
  ) THEN
    RAISE EXCEPTION 'guest sees a participants-only Matter';
  END IF;
  IF public.public_matter(current_setting('test.private_id')::uuid) IS NOT NULL THEN
    RAISE EXCEPTION 'guest opened a participants-only Matter';
  END IF;
  v := public.public_matter(current_setting('test.public_id')::uuid);
  IF jsonb_array_length(v->'comments') <> 1 OR v->'comments'->0->>'body' <> 'Public comment' THEN
    RAISE EXCEPTION 'guest comments wrong: %', v->'comments';
  END IF;
  IF (v->>'comment_count')::int <> 1 THEN RAISE EXCEPTION 'comment count %', v->>'comment_count'; END IF;
  IF v ? 'pending_actions' OR v ? 'parties' THEN RAISE EXCEPTION 'guest shape leaks internal fields'; END IF;
  RAISE NOTICE 'ok: guests read public Matters and public comments only';
END $$;
RESET ROLE;

ROLLBACK;
