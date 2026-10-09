import { charterAndPathwayEn } from '@/lib/study/paths/charter-and-pathway.en';
import { charterAndPathwayHy } from '@/lib/study/paths/charter-and-pathway.hy';
import { charterAndPathwayRu } from '@/lib/study/paths/charter-and-pathway.ru';
import { howCivizenDecidesEn } from '@/lib/study/paths/how-civizen-decides.en';
import { howCivizenDecidesHy } from '@/lib/study/paths/how-civizen-decides.hy';
import { howCivizenDecidesRu } from '@/lib/study/paths/how-civizen-decides.ru';
import { rightsAndDutiesEn } from '@/lib/study/paths/rights-and-duties.en';
import { rightsAndDutiesHy } from '@/lib/study/paths/rights-and-duties.hy';
import { rightsAndDutiesRu } from '@/lib/study/paths/rights-and-duties.ru';

export type LearningPathId = 'charter-and-pathway' | 'how-civizen-decides' | 'rights-and-duties';

/** A lesson body is a list of paragraphs; a paragraph starting with "- " renders as a bullet. */
export type LessonContent = { id: string; title: string; minutes: number; body: string[] };
export type PathContent = { title: string; summary: string; lessons: LessonContent[] };
export type PathSource = { label: string; href?: string };

export const LEARNING_PATH_IDS: LearningPathId[] = ['charter-and-pathway', 'how-civizen-decides', 'rights-and-duties'];

/** Every path is written from these public documents; the reader lists them so members can check the source. */
export const LEARNING_PATH_SOURCES: Record<LearningPathId, PathSource[]> = {
  'charter-and-pathway': [
    { label: 'Civizen Mission Charter', href: '/about/mission' },
    { label: 'From Voluntary World Citizenship to Recognized Planetary Citizenship', href: '/about/world-citizenship' },
  ],
  'how-civizen-decides': [
    { label: 'Civizen Community Governance Charter', href: '/governance/charter' },
    { label: 'Civic Voting System Design v0.1 (docs/01-governance/participation)' },
  ],
  'rights-and-duties': [
    { label: 'Citizen Status Model v0.1 (docs/01-governance/participation)' },
    { label: 'Civizen Community Governance Charter', href: '/governance/charter' },
    { label: 'Settings › Account (export and deletion)', href: '/settings/account' },
  ],
};

type Locale = 'en' | 'hy' | 'ru';
const CONTENT: Record<LearningPathId, Record<Locale, PathContent>> = {
  'charter-and-pathway': { en: charterAndPathwayEn, hy: charterAndPathwayHy, ru: charterAndPathwayRu },
  'how-civizen-decides': { en: howCivizenDecidesEn, hy: howCivizenDecidesHy, ru: howCivizenDecidesRu },
  'rights-and-duties': { en: rightsAndDutiesEn, hy: rightsAndDutiesHy, ru: rightsAndDutiesRu },
};

export function isLearningPathId(value: string | undefined | null): value is LearningPathId {
  return Boolean(value) && (LEARNING_PATH_IDS as string[]).includes(value as string);
}

/** Curated EN, HY and RU; every other language reads the English text. */
export function pathLocale(language: string): Locale {
  if (language === 'hy' || language.startsWith('hy-')) return 'hy';
  if (language === 'ru' || language.startsWith('ru-')) return 'ru';
  return 'en';
}

export function getLearningPath(id: LearningPathId, language: string): PathContent {
  return CONTENT[id][pathLocale(language)];
}

export const lessonKey = (pathId: LearningPathId, lessonId: string): string => `path:${pathId}:${lessonId}`;
export const pathCertificationKey = (pathId: LearningPathId): string => `path:${pathId}`;

export function pathLessonKeys(pathId: LearningPathId): string[] {
  return CONTENT[pathId].en.lessons.map((lesson) => lessonKey(pathId, lesson.id));
}

export function pathProgress(pathId: LearningPathId, completedKeys: ReadonlySet<string>): { completed: number; total: number; percent: number; done: boolean } {
  const keys = pathLessonKeys(pathId);
  const completed = keys.filter((key) => completedKeys.has(key)).length;
  return { completed, total: keys.length, percent: keys.length ? Math.round((completed / keys.length) * 100) : 0, done: completed === keys.length && keys.length > 0 };
}

/** The first lesson not yet completed, or the first lesson when the path is done. */
export function nextLessonId(pathId: LearningPathId, completedKeys: ReadonlySet<string>): string {
  const lessons = CONTENT[pathId].en.lessons;
  return (lessons.find((lesson) => !completedKeys.has(lessonKey(pathId, lesson.id))) ?? lessons[0]).id;
}
