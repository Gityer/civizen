import { ASSISTANT_CAPABILITIES_PART_1 } from './catalog-data/capabilities-1';
import { ASSISTANT_CAPABILITIES_PART_2 } from './catalog-data/capabilities-2';
import { ASSISTANT_FAQ_PART_1 } from './catalog-data/faq-1';
import { ASSISTANT_FAQ_PART_2 } from './catalog-data/faq-2';
import type { AssistantCapability, AssistantFaqItem, TerminologyAlias } from './types';

/**
 * Curated Civi capability registry.
 * Status must describe the current application, not a roadmap hope.
 * Prefer deriving routes and names from live product surfaces.
 */
export const ASSISTANT_CAPABILITIES: AssistantCapability[] = [
  ...ASSISTANT_CAPABILITIES_PART_1,
  ...ASSISTANT_CAPABILITIES_PART_2,
];

export const ASSISTANT_FAQ: AssistantFaqItem[] = [
  ...ASSISTANT_FAQ_PART_1,
  ...ASSISTANT_FAQ_PART_2,
];

export const ASSISTANT_ALIASES: TerminologyAlias[] = [
  { current: 'Opportunities', aliases: ['professional listings', 'open tasks', 'tasks'] },
  { current: 'Community Challenges', aliases: ['challenges', 'community problem-solving lab'] },
  { current: 'Learning Commons', aliases: ['shared knowledge', 'knowledge commons'] },
  { current: 'Prototype credits', aliases: ['luma', 'luma wallet', 'wallet'] },
  { current: 'Community Governance Charter', aliases: ['civizen constitution', 'constitution v0.1'] },
  { current: 'Agreements', aliases: ['contracts', 'collaboration agreement'] },
  { current: 'Happiness & Fulfillment', aliases: ['happiness score', 'wellbeing', 'mental health score'] },
  { current: 'Work Fulfillment', aliases: ['occupational fit', 'work joy'] },
  { current: 'Wellbeing Insights', aliases: ['group insights', 'organization happiness'] }, { current: 'Human Outcome Review', aliases: ['outcome review', 'happiness impact'] },
  { current: 'My Contributions', aliases: ['impact ledger'] },
  { current: 'Civizen', aliases: ['levela'] },
];
