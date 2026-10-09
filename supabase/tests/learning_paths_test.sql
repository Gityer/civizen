-- Phase 5 steps 5.1–5.2: lesson completion is per member, the path certification is awarded only when every
-- lesson is done, foreign lesson keys are refused, and completions are readable by other members.
-- Run with scripts/local-supabase/run-sql-tests.sh against the LOCAL database only. Rolls back.

BEGIN;

SELECT set_config('test.member_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.member_pid', (SELECT id::text FROM public.profiles WHERE username = 'member' AND deleted_at IS NULL LIMIT 1), true);
SELECT set_config('test.citizen_uid', (SELECT user_id::text FROM public.profiles WHERE username = 'citizen' AND deleted_at IS NULL LIMIT 1), true);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.member_uid'))::text, true);

DO $$
DECLARE r jsonb;
BEGIN
  r := public.mark_study_lesson_complete('test-path', 'one', ARRAY['path:test-path:one', 'path:test-path:two']);
  IF (r->>'path_completed')::boolean THEN RAISE EXCEPTION 'path completed after one of two lessons'; END IF;
  IF (r->>'completed_lessons')::int <> 1 THEN RAISE EXCEPTION 'expected 1 completed lesson, got %', r->>'completed_lessons'; END IF;
  -- repeating the same lesson is idempotent
  r := public.mark_study_lesson_complete('test-path', 'one', ARRAY['path:test-path:one', 'path:test-path:two']);
  IF (r->>'completed_lessons')::int <> 1 THEN RAISE EXCEPTION 'repeat changed the count: %', r->>'completed_lessons'; END IF;
  BEGIN
    PERFORM public.mark_study_lesson_complete('test-path', 'other', ARRAY['path:test-path:one', 'path:test-path:two']);
    RAISE EXCEPTION 'foreign lesson key accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'lesson_not_in_path' THEN RAISE EXCEPTION 'expected lesson_not_in_path, got %', SQLERRM; END IF;
  END;
  r := public.mark_study_lesson_complete('test-path', 'two', ARRAY['path:test-path:one', 'path:test-path:two']);
  IF NOT (r->>'path_completed')::boolean THEN RAISE EXCEPTION 'path not completed after every lesson'; END IF;
  RAISE NOTICE 'ok: lessons complete one by one and the path completes at the end';
END $$;

-- another signed-in member sees the completion; the lesson rows stay private
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.citizen_uid'))::text, true);
DO $$
DECLARE v jsonb;
BEGIN
  v := public.public_study_completions(current_setting('test.member_pid')::uuid);
  IF jsonb_array_length(v) <> 1 OR v->0->>'key' <> 'path:test-path' THEN RAISE EXCEPTION 'completion not visible: %', v; END IF;
  IF EXISTS (SELECT 1 FROM public.study_progress WHERE profile_id = current_setting('test.member_pid')::uuid) THEN
    RAISE EXCEPTION 'another member can read lesson progress rows';
  END IF;
  RAISE NOTICE 'ok: completion public, progress private';
END $$;
RESET ROLE;

DO $$
BEGIN
  IF (SELECT status FROM public.study_certifications WHERE profile_id = current_setting('test.member_pid')::uuid AND certification_key = 'path:test-path') <> 'earned' THEN
    RAISE EXCEPTION 'certification not earned';
  END IF;
  IF (SELECT count(*) FROM public.study_progress WHERE profile_id = current_setting('test.member_pid')::uuid AND document_key LIKE 'path:test-path:%') <> 2 THEN
    RAISE EXCEPTION 'expected two progress rows';
  END IF;
  RAISE NOTICE 'ok: rows stored once per lesson';
END $$;

ROLLBACK;
