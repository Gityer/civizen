-- Phase 2 step 2.1: public Matters are listed for every signed-in member with search, Area, country
-- and type filters; participants-only Matters stay out; guests get nothing.
-- Run with scripts/local-supabase/run-sql-tests.sh against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('test.author_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.author_pid', (SELECT id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.reader_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.area_id', (SELECT id FROM public.classification_nodes WHERE node_type = 'area' AND status = 'current' ORDER BY sort_order LIMIT 1), true);

DO $$
BEGIN
  IF coalesce(current_setting('test.author_uid', true), '') = '' OR coalesce(current_setting('test.reader_uid', true), '') = '' THEN
    RAISE EXCEPTION 'fixtures member/citizen missing in the local database';
  END IF;
END $$;

-- ---- the member raises one public and one participants-only Matter for the Civizen community ----
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.author_uid'))::text, true);
SELECT set_config('test.community_pid', public.resolve_civizen_org_profile()::text, true);
DO $$
BEGIN
  IF coalesce(current_setting('test.community_pid', true), '') = '' THEN RAISE EXCEPTION 'official Civizen organization profile not resolvable'; END IF;
END $$;

SELECT set_config('test.public_id', public.create_matter(jsonb_build_object(
  'title', 'Browse test: shade trees for Yerevan bus stops',
  'description', 'Public Matter raised to the community about shade at bus stops.',
  'matter_type', 'suggestion',
  'addressee_kind', 'organization',
  'addressee_profile_id', current_setting('test.community_pid'),
  'visibility', 'public',
  'area_node_id', nullif(current_setting('test.area_id', true), ''),
  'scope_kind', 'country',
  'scope_country_code', 'AM'
))::text, true);
SELECT set_config('test.private_id', public.create_matter(jsonb_build_object(
  'title', 'Browse test: participants-only question',
  'description', 'Must not appear in the public list.',
  'matter_type', 'question',
  'addressee_kind', 'organization',
  'addressee_profile_id', current_setting('test.community_pid'),
  'visibility', 'participants'
))::text, true);

-- ---- another member (not a party) browses --------------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.reader_uid'))::text, true);
DO $$
DECLARE rows jsonb; ids text[];
BEGIN
  rows := public.list_public_matters();
  SELECT array_agg(r->'matter'->>'id') INTO ids FROM jsonb_array_elements(rows) r;
  IF NOT (current_setting('test.public_id') = ANY (ids)) THEN RAISE EXCEPTION 'public Matter missing from the public list'; END IF;
  IF current_setting('test.private_id') = ANY (ids) THEN RAISE EXCEPTION 'participants-only Matter leaked into the public list'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(rows) r WHERE r->'matter'->>'visibility' <> 'public') THEN
    RAISE EXCEPTION 'non-public row in the public list';
  END IF;
  RAISE NOTICE 'ok: public list shows public Matters only';
END $$;

DO $$
DECLARE rows jsonb; n integer;
BEGIN
  rows := public.list_public_matters('shade trees');
  SELECT count(*) INTO n FROM jsonb_array_elements(rows) r WHERE r->'matter'->>'id' = current_setting('test.public_id');
  IF n <> 1 THEN RAISE EXCEPTION 'text search did not find the Matter'; END IF;
  rows := public.list_public_matters('no such phrase xyzzy');
  IF jsonb_array_length(rows) <> 0 THEN RAISE EXCEPTION 'text search returned unrelated rows'; END IF;
  rows := public.list_public_matters(NULL, NULL, 'am');
  SELECT count(*) INTO n FROM jsonb_array_elements(rows) r WHERE r->'matter'->>'id' = current_setting('test.public_id');
  IF n <> 1 THEN RAISE EXCEPTION 'country filter did not keep the AM Matter'; END IF;
  rows := public.list_public_matters(NULL, NULL, 'FR');
  SELECT count(*) INTO n FROM jsonb_array_elements(rows) r WHERE r->'matter'->>'id' = current_setting('test.public_id');
  IF n <> 0 THEN RAISE EXCEPTION 'country filter kept a Matter from another country'; END IF;
  rows := public.list_public_matters(NULL, NULL, NULL, 'question');
  SELECT count(*) INTO n FROM jsonb_array_elements(rows) r WHERE r->'matter'->>'id' = current_setting('test.public_id');
  IF n <> 0 THEN RAISE EXCEPTION 'type filter kept a suggestion when asking for questions'; END IF;
  IF coalesce(current_setting('test.area_id', true), '') <> '' THEN
    rows := public.list_public_matters(NULL, current_setting('test.area_id'));
    SELECT count(*) INTO n FROM jsonb_array_elements(rows) r WHERE r->'matter'->>'id' = current_setting('test.public_id');
    IF n <> 1 THEN RAISE EXCEPTION 'area filter did not keep the Matter'; END IF;
  END IF;
  RAISE NOTICE 'ok: search, country, type and area filters';
END $$;

-- the reader can open the public Matter (RLS through can_access_matter)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.matters WHERE id = current_setting('test.public_id')::uuid) THEN
    RAISE EXCEPTION 'reader cannot open the public Matter';
  END IF;
  IF EXISTS (SELECT 1 FROM public.matters WHERE id = current_setting('test.private_id')::uuid) THEN
    RAISE EXCEPTION 'reader can open the participants-only Matter';
  END IF;
  RAISE NOTICE 'ok: public Matter readable, participants-only hidden';
END $$;

-- ---- guests get nothing -------------------------------------------------------------------------
RESET ROLE;
SELECT set_config('request.jwt.claims', '{}', true);
SET LOCAL ROLE anon;
DO $$
BEGIN
  BEGIN
    IF jsonb_array_length(public.list_public_matters()) <> 0 THEN RAISE EXCEPTION 'guest received public Matters'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL; -- not executable by anon at all is also fine
  END;
  RAISE NOTICE 'ok: guests get nothing';
END $$;

ROLLBACK;
