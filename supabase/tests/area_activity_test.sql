-- Phase 4 step 4.4: Area pages list the public programs, challenges and Matters tagged with the Area; demo and
-- non-public items stay out; guests may call it.
-- Run with scripts/local-supabase/run-sql-tests.sh against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('test.member_pid', (SELECT id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.area_id', (SELECT id FROM public.classification_nodes WHERE node_type = 'area' AND status = 'current' AND code = 'education' LIMIT 1), true);

DO $$
BEGIN
  IF coalesce(current_setting('test.area_id', true), '') = '' THEN RAISE EXCEPTION 'education area node missing'; END IF;
END $$;

INSERT INTO public.matters (
  id, title, description, matter_type, visibility, area_node_id, initiator_kind, initiator_profile_id,
  addressee_kind, addressee_profile_id, responsible_kind, responsible_profile_id, created_by_profile_id, lifecycle_status
) VALUES
  ('77777777-7777-4777-8777-777777777771', 'Area test public matter', 'Public and tagged.', 'suggestion', 'public', current_setting('test.area_id'),
   'person', current_setting('test.member_pid')::uuid, 'person', current_setting('test.member_pid')::uuid, 'person', current_setting('test.member_pid')::uuid, current_setting('test.member_pid')::uuid, 'active'),
  ('77777777-7777-4777-8777-777777777772', 'Area test private matter', 'Participants only.', 'question', 'participants', current_setting('test.area_id'),
   'person', current_setting('test.member_pid')::uuid, 'person', current_setting('test.member_pid')::uuid, 'person', current_setting('test.member_pid')::uuid, current_setting('test.member_pid')::uuid, 'active');

INSERT INTO public.contribution_programs (id, publisher_profile_id, title, summary, description, status, program_kind, area_node_id, is_demo)
VALUES ('77777777-7777-4777-8777-777777777781', current_setting('test.member_pid')::uuid, 'Area test program', 'Summary', 'Description', 'active',
        (SELECT program_kind FROM public.contribution_programs LIMIT 1), current_setting('test.area_id'), false),
       ('77777777-7777-4777-8777-777777777782', current_setting('test.member_pid')::uuid, 'Area demo program', 'Summary', 'Description', 'active',
        (SELECT program_kind FROM public.contribution_programs LIMIT 1), current_setting('test.area_id'), true);
-- challenges inherit the demo flag from their program (decision D5)
INSERT INTO public.community_challenges (id, program_id, publisher_profile_id, title, problem_statement, why_it_matters, success_criteria, status, area_node_id)
VALUES ('77777777-7777-4777-8777-777777777791', '77777777-7777-4777-8777-777777777781', current_setting('test.member_pid')::uuid, 'Area test challenge', 'Problem', 'Why', 'Done when', 'active', current_setting('test.area_id')),
       ('77777777-7777-4777-8777-777777777792', '77777777-7777-4777-8777-777777777782', current_setting('test.member_pid')::uuid, 'Area demo challenge', 'Problem', 'Why', 'Done when', 'active', current_setting('test.area_id'));

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{}', true);
DO $$
DECLARE a jsonb; ids text;
BEGIN
  a := public.area_activity('education');
  SELECT string_agg(r->>'id', ',') INTO ids FROM jsonb_array_elements(a->'matters') r;
  IF ids NOT LIKE '%77777777-7777-4777-8777-777777777771%' THEN RAISE EXCEPTION 'public matter missing: %', a->'matters'; END IF;
  IF ids LIKE '%77777777-7777-4777-8777-777777777772%' THEN RAISE EXCEPTION 'participants-only matter leaked to the Area page'; END IF;
  SELECT string_agg(r->>'id', ',') INTO ids FROM jsonb_array_elements(a->'challenges') r;
  IF ids NOT LIKE '%77777777-7777-4777-8777-777777777791%' THEN RAISE EXCEPTION 'challenge missing: %', a->'challenges'; END IF;
  IF ids LIKE '%77777777-7777-4777-8777-777777777792%' THEN RAISE EXCEPTION 'demo challenge leaked'; END IF;
  SELECT string_agg(r->>'id', ',') INTO ids FROM jsonb_array_elements(a->'programs') r;
  IF ids NOT LIKE '%77777777-7777-4777-8777-777777777781%' THEN RAISE EXCEPTION 'program missing: %', a->'programs'; END IF;
  IF ids LIKE '%77777777-7777-4777-8777-777777777782%' THEN RAISE EXCEPTION 'demo program leaked'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(a->'matters') r WHERE r ? 'description') THEN RAISE EXCEPTION 'matter description exposed to guests'; END IF;
  a := public.area_activity('no-such-area');
  IF jsonb_array_length(a->'matters') <> 0 THEN RAISE EXCEPTION 'unknown area returned rows'; END IF;
  RAISE NOTICE 'ok: area activity for guests, public and non-demo only';
END $$;

ROLLBACK;
