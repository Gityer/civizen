import type { FunctionGroup } from '@/lib/public-functions';

/** i18n keys for the function groups (literal so the key check can see them). */
export const GROUP_KEYS: Record<FunctionGroup, string> = {
  places: 'organisation.public.groups.places',
  health_social: 'organisation.public.groups.health_social',
  learning_culture: 'organisation.public.groups.learning_culture',
  economy: 'organisation.public.groups.economy',
  safety: 'organisation.public.groups.safety',
  planet: 'organisation.public.groups.planet',
  governance_rights: 'organisation.public.groups.governance_rights',
  civizen: 'organisation.public.groups.civizen',
};
