import type { LucideIcon } from 'lucide-react';
import { BookOpen, CalendarDays, ClipboardCheck, FileText, GraduationCap } from 'lucide-react';

export type StudySectionId =
  | 'civicLearning'
  | 'paths'
  | 'courses'
  | 'schedules'
  | 'materials'
  | 'tests';

export type StudySectionMeta = {
  id: StudySectionId;
  path: string;
  labelKey: string;
  descriptionKey: string;
  icon: LucideIcon;
};

export const studySectionRegistry: StudySectionMeta[] = [
  {
    id: 'civicLearning',
    path: '/study',
    labelKey: 'study.sections.civicLearning.label',
    descriptionKey: 'study.sections.civicLearning.description',
    icon: BookOpen,
  },
  {
    id: 'paths',
    path: '/study/paths',
    labelKey: 'study.sections.paths.label',
    descriptionKey: 'study.sections.paths.description',
    icon: GraduationCap,
  },
  {
    id: 'courses',
    path: '/study/courses',
    labelKey: 'study.sections.courses.label',
    descriptionKey: 'study.sections.courses.description',
    icon: GraduationCap,
  },
  {
    id: 'schedules',
    path: '/study/schedules',
    labelKey: 'study.sections.schedules.label',
    descriptionKey: 'study.sections.schedules.description',
    icon: CalendarDays,
  },
  {
    id: 'materials',
    path: '/study/materials',
    labelKey: 'study.sections.materials.label',
    descriptionKey: 'study.sections.materials.description',
    icon: FileText,
  },
  {
    id: 'tests',
    path: '/study/tests',
    labelKey: 'study.sections.tests.label',
    descriptionKey: 'study.sections.tests.description',
    icon: ClipboardCheck,
  },
];
