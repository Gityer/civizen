-- Phase 4 batch 2: members propose resources and report gaps (drafts, coordinator notified, proposer sees own
-- draft, "reviewed" needs another person); a Solutions problem and a community challenge can be linked to a Matter
-- and the Matter lists them.
-- Run with scripts/local-supabase/run-sql-tests.sh against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('test.member_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.member_pid', (SELECT id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.citizen_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.citizen_pid', (SELECT id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);

-- a space the citizen publishes, shared so members can read it
INSERT INTO public.contribution_programs (id, publisher_profile_id, title, summary, description, status, program_kind, is_demo)
VALUES ('88888888-8888-4888-8888-888888888881', current_setting('test.citizen_pid')::uuid, 'Proposal test program', 'Summary of the test program', 'Description of the test program', 'active',
        (SELECT program_kind FROM public.contribution_programs LIMIT 1), false);
INSERT INTO public.knowledge_spaces (id, publisher_profile_id, program_id, title, summary, description, status, is_demo)
VALUES ('88888888-8888-4888-8888-888888888882', current_setting('test.citizen_pid')::uuid, '88888888-8888-4888-8888-888888888881', 'Proposal test space', 'Summary', 'Description', 'shared', false);

-- ---- member proposes a resource and reports a gap --------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member_uid'))::text, true);
SELECT set_config('test.res_id', public.propose_knowledge_resource(jsonb_build_object(
  'space_id', '88888888-8888-4888-8888-888888888882', 'title', 'A useful guide', 'summary', 'Why it helps', 'resource_type', 'guide', 'external_url', 'https://example.org/guide'))::text, true);
SELECT set_config('test.gap_id', public.propose_knowledge_gap(jsonb_build_object(
  'space_id', '88888888-8888-4888-8888-888888888882', 'title', 'Nothing on winter heating', 'description', 'No resource covers it.', 'gap_kind', 'missing'))::text, true);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.knowledge_resources WHERE id = current_setting('test.res_id')::uuid) THEN RAISE EXCEPTION 'proposer cannot read own draft'; END IF;
  BEGIN
    PERFORM public.set_knowledge_resource_status(current_setting('test.res_id')::uuid, 'shared');
    RAISE EXCEPTION 'proposer published their own draft';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'not_authorized' THEN RAISE EXCEPTION 'expected not_authorized, got %', SQLERRM; END IF;
  END;
  RAISE NOTICE 'ok: proposals land as drafts the proposer can see but not publish';
END $$;
RESET ROLE;
DO $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM public.knowledge_resources WHERE id = current_setting('test.res_id')::uuid;
  IF r.status <> 'draft' OR r.proposed_by_profile_id <> current_setting('test.member_pid')::uuid OR r.publisher_profile_id <> current_setting('test.citizen_pid')::uuid THEN
    RAISE EXCEPTION 'draft stored wrongly: % % %', r.status, r.proposed_by_profile_id, r.publisher_profile_id;
  END IF;
  IF (SELECT status FROM public.knowledge_gaps WHERE id = current_setting('test.gap_id')::uuid) <> 'open' THEN RAISE EXCEPTION 'gap not open'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_notifications WHERE recipient_profile_id = current_setting('test.citizen_pid')::uuid AND notification_type = 'knowledge_resource_proposed') THEN
    RAISE EXCEPTION 'coordinator not notified of the proposal';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_notifications WHERE recipient_profile_id = current_setting('test.citizen_pid')::uuid AND notification_type = 'knowledge_gap_reported') THEN
    RAISE EXCEPTION 'coordinator not notified of the gap';
  END IF;
  RAISE NOTICE 'ok: coordinator notified';
END $$;

-- ---- coordinator shares it; the proposer is told; a member cannot see drafts of others -------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.citizen_uid'))::text, true);
SELECT public.set_knowledge_resource_status(current_setting('test.res_id')::uuid, 'reviewed');
RESET ROLE;
DO $$
BEGIN
  IF (SELECT status FROM public.knowledge_resources WHERE id = current_setting('test.res_id')::uuid) <> 'reviewed' THEN RAISE EXCEPTION 'not reviewed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_notifications WHERE recipient_profile_id = current_setting('test.member_pid')::uuid AND notification_type = 'knowledge_resource_published') THEN
    RAISE EXCEPTION 'proposer not told the resource went live';
  END IF;
  RAISE NOTICE 'ok: coordinator review publishes and notifies';
END $$;
-- a coordinator who proposed a resource themselves cannot mark it reviewed
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.citizen_uid'))::text, true);
SELECT set_config('test.own_res', public.propose_knowledge_resource(jsonb_build_object(
  'space_id', '88888888-8888-4888-8888-888888888882', 'title', 'Coordinator own note', 'summary', 'Needs another reviewer', 'resource_type', 'other'))::text, true);
DO $$
BEGIN
  PERFORM public.set_knowledge_resource_status(current_setting('test.own_res')::uuid, 'shared');
  BEGIN
    PERFORM public.set_knowledge_resource_status(current_setting('test.own_res')::uuid, 'reviewed');
    RAISE EXCEPTION 'coordinator reviewed their own proposal';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'review_needs_another_person' THEN RAISE EXCEPTION 'expected review_needs_another_person, got %', SQLERRM; END IF;
  END;
  RAISE NOTICE 'ok: reviewed means someone else reviewed';
END $$;

-- ---- Matter links: Solutions problem and community challenge --------------------------------------------
RESET ROLE;
INSERT INTO public.matters (id, title, description, matter_type, visibility, initiator_kind, initiator_profile_id,
  addressee_kind, addressee_profile_id, responsible_kind, responsible_profile_id, created_by_profile_id, lifecycle_status)
VALUES ('88888888-8888-4888-8888-888888888883', 'Link test matter', 'Public problem.', 'discussion', 'public',
  'person', current_setting('test.member_pid')::uuid, 'person', current_setting('test.citizen_pid')::uuid, 'person', current_setting('test.citizen_pid')::uuid, current_setting('test.member_pid')::uuid, 'active');
INSERT INTO public.solution_problems (id, author_id, title, body, status, mode) VALUES ('88888888-8888-4888-8888-888888888884', current_setting('test.member_pid')::uuid, 'Link test problem', 'Body text here', 'debating', 'discuss');
INSERT INTO public.community_challenges (id, program_id, publisher_profile_id, title, problem_statement, why_it_matters, success_criteria, status)
VALUES ('88888888-8888-4888-8888-888888888885', '88888888-8888-4888-8888-888888888881', current_setting('test.citizen_pid')::uuid, 'Link test challenge', 'Problem', 'Why', 'Done when', 'active');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member_uid'))::text, true);
SELECT public.link_solution_problem_matter('88888888-8888-4888-8888-888888888884', '88888888-8888-4888-8888-888888888883');
DO $$
BEGIN
  BEGIN
    PERFORM public.link_challenge_source_matter('88888888-8888-4888-8888-888888888885', '88888888-8888-4888-8888-888888888883');
    RAISE EXCEPTION 'non-publisher linked a challenge';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'not_authorized' THEN RAISE EXCEPTION 'expected not_authorized, got %', SQLERRM; END IF;
  END;
END $$;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.citizen_uid'))::text, true);
SELECT public.link_challenge_source_matter('88888888-8888-4888-8888-888888888885', '88888888-8888-4888-8888-888888888883');
DO $$
DECLARE l jsonb := public.matter_links('88888888-8888-4888-8888-888888888883');
BEGIN
  IF l->'solution_problem'->>'id' <> '88888888-8888-4888-8888-888888888884' THEN RAISE EXCEPTION 'solution problem link missing: %', l; END IF;
  IF jsonb_array_length(l->'challenges') <> 1 OR l->'challenges'->0->>'title' <> 'Link test challenge' THEN RAISE EXCEPTION 'challenge link missing: %', l; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.matter_events WHERE matter_id = '88888888-8888-4888-8888-888888888883' AND event_type = 'community_challenge_started') THEN
    RAISE EXCEPTION 'challenge start not logged on the Matter';
  END IF;
  RAISE NOTICE 'ok: Matter lists its AI-council problem and community challenge';
END $$;

ROLLBACK;
