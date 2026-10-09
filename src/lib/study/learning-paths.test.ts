import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

import {
  LEARNING_PATH_IDS,
  LEARNING_PATH_SOURCES,
  getLearningPath,
  lessonKey,
  nextLessonId,
  pathLessonKeys,
  pathLocale,
  pathProgress,
} from './learning-paths';
import { mapStudyCompletions } from './learning-progress';

describe('learning paths', () => {
  it('has three paths with the same lesson ids in EN, HY and RU, each with real text and a source list', () => {
    for (const id of LEARNING_PATH_IDS) {
      const en = getLearningPath(id, 'en');
      const hy = getLearningPath(id, 'hy');
      const ru = getLearningPath(id, 'ru');
      expect(en.lessons.length).toBeGreaterThanOrEqual(5);
      expect(hy.lessons.map((l) => l.id)).toEqual(en.lessons.map((l) => l.id));
      expect(ru.lessons.map((l) => l.id)).toEqual(en.lessons.map((l) => l.id));
      for (const path of [en, hy, ru]) {
        expect(path.title.length).toBeGreaterThan(3);
        for (const lesson of path.lessons) {
          expect(lesson.body.join(' ').length).toBeGreaterThan(400);
          expect(lesson.minutes).toBeGreaterThan(0);
        }
      }
      expect(hy.lessons[0].title).not.toEqual(en.lessons[0].title);
      expect(ru.lessons[0].title).not.toEqual(en.lessons[0].title);
      expect(LEARNING_PATH_SOURCES[id].length).toBeGreaterThan(0);
    }
  });

  it('keeps the institutional boundary in the text', () => {
    const all = LEARNING_PATH_IDS.map((id) => getLearningPath(id, 'en').lessons.map((l) => l.body.join(' ')).join(' ')).join(' ');
    expect(all).toMatch(/not a government/i);
    expect(all).toMatch(/does not claim/i);
    expect(all).toMatch(/AI cannot authorize emergency action/);
  });

  it('resolves locale, keys, progress and the next lesson', () => {
    expect(pathLocale('hy')).toBe('hy');
    expect(pathLocale('ru-RU')).toBe('ru');
    expect(pathLocale('de')).toBe('en');
    const keys = pathLessonKeys('charter-and-pathway');
    expect(keys[0]).toBe(lessonKey('charter-and-pathway', 'mission'));
    const done = new Set(keys.slice(0, 2));
    expect(pathProgress('charter-and-pathway', done)).toEqual({ completed: 2, total: keys.length, percent: Math.round((2 / keys.length) * 100), done: false });
    expect(nextLessonId('charter-and-pathway', done)).toBe('what-it-seeks');
    expect(pathProgress('charter-and-pathway', new Set(keys)).done).toBe(true);
    expect(nextLessonId('charter-and-pathway', new Set(keys))).toBe('mission');
  });

  it('maps public completions and ignores foreign keys', () => {
    expect(mapStudyCompletions([{ key: 'path:charter-and-pathway', earned_at: '2026-10-09T00:00:00Z' }, { key: 'foundation', earned_at: 'x' }, null])).toEqual([
      { key: 'path:charter-and-pathway', earnedAt: '2026-10-09T00:00:00Z' },
    ]);
    expect(mapStudyCompletions(null)).toEqual([]);
  });
});
