/**
 * Canonical copy for Civizen's first real public consultation.
 * Persisted through the existing Matter → voting proposal → publish path.
 * Stable key: metadata.consultation_key = SINGLE_WORLD_CITIZENSHIP_KEY.
 */
export const SINGLE_WORLD_CITIZENSHIP_KEY = 'single-world-citizenship';

export const SINGLE_WORLD_CITIZENSHIP_TITLE = 'A Single World Citizenship';

export const SINGLE_WORLD_CITIZENSHIP_QUESTION =
  'Should humanity work toward establishing a single world citizenship, shared by all people regardless of nationality?';

export const SINGLE_WORLD_CITIZENSHIP_BODY = [
  'This consultation asks whether humanity should work toward establishing a single world citizenship shared by all people, regardless of their existing nationality or country of residence.',
  'A Support vote expresses support for working toward such a citizenship. An Oppose vote expresses opposition to that direction. Abstain records participation without supporting either position.',
  'This consultation is nonbinding. It does not itself create a new citizenship, replace any existing nationality or citizenship, establish a government, or confer any legal status.',
].join('\n\n');

/** Topics that must stay off this ballot and be asked, if ever, as separate consultations. */
export const SINGLE_WORLD_CITIZENSHIP_EXCLUDED_TOPICS = [
  'shared land',
  'shared resources',
  'common currency',
  'cashless',
  'world government',
  'constitution',
  'Join the world citizenship',
  'Vote for one world',
  'Help us make this happen',
] as const;

export function singleWorldCitizenshipCopyIsNeutral(text: string): boolean {
  const haystack = text.toLowerCase();
  return SINGLE_WORLD_CITIZENSHIP_EXCLUDED_TOPICS.every(
    (topic) => !haystack.includes(topic.toLowerCase()),
  );
}
