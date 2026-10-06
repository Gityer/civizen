import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Briefcase,
  HandCoins,
  Handshake,
  Landmark,
  Lightbulb,
  MessageSquareWarning,
  Target,
  TrendingUp,
} from 'lucide-react';

export type ContributeLaneSection = 'ways' | 'community' | 'knowledge' | 'impact';

export type ContributeRelatedLink = {
  path: string;
  labelKey: string;
};

export type ContributeLane = {
  id: string;
  section: ContributeLaneSection;
  path: string;
  icon: LucideIcon;
  iconClassName: string;
  titleKey: string;
  descriptionKey: string;
  /** When true, the path is a Phase 1 placeholder under /contribute/* */
  placeholder: boolean;
  relatedLinks?: readonly ContributeRelatedLink[];
};

/** Placeholder lane path segments (excludes live contribution surfaces). */
export const CONTRIBUTE_PLACEHOLDER_IDS = [] as const;

export type ContributePlaceholderId = (typeof CONTRIBUTE_PLACEHOLDER_IDS)[number];

export const CONTRIBUTE_LANES: readonly ContributeLane[] = [
  {
    id: 'volunteer',
    section: 'ways',
    path: '/fund/contribute',
    icon: Handshake,
    iconClassName: 'text-primary',
    titleKey: 'contribute.lanes.volunteer.title',
    descriptionKey: 'contribute.lanes.volunteer.description',
    placeholder: false,
  },
  {
    id: 'professional',
    section: 'ways',
    path: '/contribute/professional',
    icon: Briefcase,
    iconClassName: 'text-primary',
    titleKey: 'contribute.lanes.professional.title',
    descriptionKey: 'contribute.lanes.professional.description',
    placeholder: false,
    relatedLinks: [
      { path: '/contribute/policy', labelKey: 'contribute.related.policy' },
    ],
  },
  {
    id: 'financial',
    section: 'ways',
    path: '/fund',
    icon: HandCoins,
    iconClassName: 'text-accent',
    titleKey: 'contribute.lanes.financial.title',
    descriptionKey: 'contribute.lanes.financial.description',
    placeholder: false,
  },
  {
    id: 'organization',
    section: 'ways',
    path: '/partners',
    icon: Landmark,
    iconClassName: 'text-accent',
    titleKey: 'contribute.lanes.organization.title',
    descriptionKey: 'contribute.lanes.organization.description',
    placeholder: false,
  },
  {
    id: 'challenges',
    section: 'community',
    path: '/contribute/challenges',
    icon: Target,
    iconClassName: 'text-accent',
    titleKey: 'contribute.lanes.challenges.title',
    descriptionKey: 'contribute.lanes.challenges.description',
    placeholder: false,
  },
  {
    id: 'matters',
    section: 'community',
    path: '/contribute/matters',
    icon: MessageSquareWarning,
    iconClassName: 'text-primary',
    titleKey: 'contribute.lanes.matters.title',
    descriptionKey: 'contribute.lanes.matters.description',
    placeholder: false,
  },
  {
    id: 'knowledge',
    section: 'knowledge',
    path: '/contribute/knowledge',
    icon: BookOpen,
    iconClassName: 'text-primary',
    titleKey: 'contribute.lanes.knowledge.title',
    descriptionKey: 'contribute.lanes.knowledge.description',
    placeholder: false,
    relatedLinks: [
      { path: '/study', labelKey: 'contribute.related.study' },
    ],
  },
  {
    id: 'improvements',
    section: 'knowledge',
    path: '/contribute/improvements',
    icon: Lightbulb,
    iconClassName: 'text-accent',
    titleKey: 'contribute.lanes.improvements.title',
    descriptionKey: 'contribute.lanes.improvements.description',
    placeholder: false,
    relatedLinks: [
      { path: '/governance/solutions', labelKey: 'contribute.related.solutions' },
      { path: '/governance', labelKey: 'contribute.related.governance' },
    ],
  },
  {
    id: 'impact',
    section: 'impact',
    path: '/contribute/impact',
    icon: TrendingUp,
    iconClassName: 'text-accent',
    titleKey: 'contribute.lanes.impact.title',
    descriptionKey: 'contribute.lanes.impact.description',
    placeholder: false,
    relatedLinks: [
      { path: '/profile', labelKey: 'contribute.related.score' },
    ],
  },
] as const;

export const CONTRIBUTE_SECTION_ORDER: readonly ContributeLaneSection[] = [
  'ways',
  'community',
  'knowledge',
  'impact',
] as const;

export function getContributeLanesBySection(section: ContributeLaneSection): ContributeLane[] {
  return CONTRIBUTE_LANES.filter((lane) => lane.section === section);
}


