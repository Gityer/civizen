export const CANONICAL_CIVIZEN_IDENTITY =
  'Civizen is an open participatory system for organizing how humanity learns, contributes, collaborates, governs, shares resources, solves common challenges, and continuously improves the systems we live and work within.';

/** Hand-written renderings of the canonical sentence; the English text stays the source of truth. */
export const CANONICAL_CIVIZEN_IDENTITY_LOCALIZED = {
  hy: 'Civizen-ը բաց մասնակցային համակարգ է, որը կազմակերպում է, թե ինչպես է մարդկությունը սովորում, ներդրում կատարում, համագործակցում, կառավարում, կիսվում ռեսուրսներով, լուծում ընդհանուր մարտահրավերները և շարունակաբար բարելավում այն համակարգերը, որոնցում ապրում և աշխատում ենք։',
  ru: 'Civizen — это открытая система участия, которая организует то, как человечество учится, вносит вклад, сотрудничает, управляет, делится ресурсами, решает общие проблемы и постоянно улучшает системы, в которых мы живём и работаем.',
} as const;

export const IDENTITY_SOURCE_PATH = 'docs/assistant/civizen-identity.md';

export const IDENTITY_FAQ_IDS = new Set([
  'what_is_civizen',
  'what_civizen_trying_to_accomplish',
  'is_civizen_a_social_network',
  'is_civizen_a_project_collaboration_platform',
]);

export type AssistantQueryTopic = 'identity' | 'current_capability' | 'other';

const CAPABILITY_NOW_RE =
  /\b(what can i (currently )?do|what (can|does) (?:i|civizen) (currently )?(do|support|offer|include)|right now|current(ly)? (features|capabilities|functionality)|what works (today|now)|what(?:'s| is) (?:implemented|available) (?:now|today|in this (?:app|build)))\b/i;

const IDENTITY_RE =
  /\b(what(?:'s| is|s) civizen|describe civizen|define civizen|civizen in one sentence|what kind of (system|platform|app) is civizen|what is the purpose of civizen|civizen(?:'s)? (overall )?(identity|purpose|mission|scope)|why (does )?civizen exist)\b/i;

const NARROW_REDEFINITION_RE =
  /\b(basically|just|mainly|merely|only|simply)\b.{0,40}\b(project|projects|challenge|collaboration|marketplace|social|learning|governance app|pm |jira|asana)\b/i;

export function classifyAssistantTopic(query: string): AssistantQueryTopic {
  const text = query.trim();
  if (!text) return 'other';
  if (CAPABILITY_NOW_RE.test(text)) return 'current_capability';
  if (NARROW_REDEFINITION_RE.test(text) || IDENTITY_RE.test(text)) return 'identity';
  return 'other';
}

export function isIdentitySourcePath(path: string): boolean {
  return path === IDENTITY_SOURCE_PATH || path.endsWith('/civizen-identity.md');
}

export function isFoundationIdentityPath(path: string): boolean {
  return (
    path.startsWith('docs/00-foundation/') ||
    path === 'docs/02-policies/governance/civizen-community-governance-charter.md'
  );
}
