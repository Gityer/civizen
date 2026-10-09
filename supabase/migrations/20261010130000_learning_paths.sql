-- Phase 5 (Study that teaches), steps 5.1–5.2: lesson progress per member and path completion.
-- Lessons are keyed `path:<path>:<lesson>` in study_progress; a completed path is a study_certifications row
-- `path:<path>` with status 'earned'. Completions are readable by signed-in members for the public profile.

-- One progress row per (member, key); production and local have no duplicates (checked 2026-10-09).
CREATE UNIQUE INDEX IF NOT EXISTS study_progress_profile_document_key
  ON public.study_progress (profile_id, document_key);

CREATE OR REPLACE FUNCTION public.mark_study_lesson_complete(
  p_path_key text,
  p_lesson_key text,
  p_path_lesson_keys text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_key text;
  v_completed integer;
  v_path_completed boolean := false;
BEGIN
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF p_path_key IS NULL OR p_path_key !~ '^[a-z0-9-]{3,60}$' OR p_lesson_key IS NULL OR p_lesson_key !~ '^[a-z0-9-]{3,60}$' THEN
    RAISE EXCEPTION 'invalid_key';
  END IF;
  v_key := 'path:' || p_path_key || ':' || p_lesson_key;
  IF NOT (v_key = ANY (coalesce(p_path_lesson_keys, '{}'::text[]))) THEN
    RAISE EXCEPTION 'lesson_not_in_path';
  END IF;

  INSERT INTO public.study_progress (profile_id, document_key, progress_percent, completed_at, last_read_at)
  VALUES (v_profile, v_key, 100, now(), now())
  ON CONFLICT (profile_id, document_key) DO UPDATE
    SET progress_percent = 100,
        completed_at = coalesce(public.study_progress.completed_at, now()),
        last_read_at = now(),
        updated_at = now();

  SELECT count(*) INTO v_completed
  FROM public.study_progress sp
  WHERE sp.profile_id = v_profile
    AND sp.progress_percent >= 100
    AND sp.document_key = ANY (p_path_lesson_keys);

  IF v_completed >= cardinality(p_path_lesson_keys) AND cardinality(p_path_lesson_keys) > 0 THEN
    v_path_completed := true;
    INSERT INTO public.study_certifications (profile_id, certification_key, status, earned_at, metadata)
    VALUES (v_profile, 'path:' || p_path_key, 'earned', now(), jsonb_build_object('lessons', cardinality(p_path_lesson_keys), 'source', 'learning_path'))
    ON CONFLICT (profile_id, certification_key) DO UPDATE
      SET status = 'earned',
          earned_at = coalesce(public.study_certifications.earned_at, now()),
          metadata = public.study_certifications.metadata || jsonb_build_object('lessons', cardinality(p_path_lesson_keys)),
          updated_at = now();
  END IF;

  RETURN jsonb_build_object('completed_lessons', v_completed, 'path_completed', v_path_completed);
END;
$$;
REVOKE ALL ON FUNCTION public.mark_study_lesson_complete(text, text, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_study_lesson_complete(text, text, text[]) TO authenticated;

-- Completed learning paths of any live member, for the public profile. Only `path:*` certifications are exposed.
CREATE OR REPLACE FUNCTION public.public_study_completions(p_profile_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('key', sc.certification_key, 'earned_at', sc.earned_at) ORDER BY sc.earned_at), '[]'::jsonb)
  FROM public.study_certifications sc
  JOIN public.profiles p ON p.id = sc.profile_id AND p.deleted_at IS NULL
  WHERE sc.profile_id = p_profile_id
    AND sc.status = 'earned'
    AND sc.certification_key LIKE 'path:%';
$$;
REVOKE ALL ON FUNCTION public.public_study_completions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_study_completions(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
