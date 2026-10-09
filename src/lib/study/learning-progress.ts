import { supabase } from '@/integrations/supabase/client';
import { type LearningPathId, pathLessonKeys } from '@/lib/study/learning-paths';

export type StudyCompletion = { key: string; earnedAt: string };

/** Lesson keys (`path:<path>:<lesson>`) the member has completed. */
export async function loadCompletedLessonKeys(profileId: string): Promise<Set<string>> {
  if (!profileId) return new Set();
  const { data, error } = await supabase
    .from('study_progress')
    .select('document_key, progress_percent')
    .eq('profile_id', profileId)
    .like('document_key', 'path:%');
  if (error) return new Set();
  return new Set((data ?? []).filter((row) => Number(row.progress_percent) >= 100).map((row) => String(row.document_key)));
}

/** Marks one lesson complete; the server awards the path certification once every lesson is done. */
export async function markLessonComplete(pathId: LearningPathId, lessonId: string): Promise<{ pathCompleted: boolean } | null> {
  const { data, error } = await supabase.rpc('mark_study_lesson_complete', {
    p_path_key: pathId,
    p_lesson_key: lessonId,
    p_path_lesson_keys: pathLessonKeys(pathId),
  });
  if (error) throw new Error(error.message);
  const row = (data ?? {}) as { path_completed?: unknown };
  return { pathCompleted: Boolean(row.path_completed) };
}

export function mapStudyCompletions(data: unknown): StudyCompletion[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({ key: String(item.key ?? ''), earnedAt: String(item.earned_at ?? '') }))
    .filter((item) => item.key.startsWith('path:'));
}

/** Learning paths a member has completed, readable by any signed-in member (shown on the public profile). */
export async function loadStudyCompletions(profileId: string): Promise<StudyCompletion[]> {
  if (!profileId) return [];
  try {
    const { data, error } = await supabase.rpc('public_study_completions', { p_profile_id: profileId });
    if (error) return [];
    return mapStudyCompletions(data);
  } catch {
    return [];
  }
}
