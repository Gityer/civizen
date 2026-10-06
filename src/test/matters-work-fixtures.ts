import { asWorkState } from '@/lib/matters-work-workflow';
import { createMatter, createMatterEngineContext } from '@/lib/matters-workflow';

export const initiator = { kind: 'person' as const, profileId: 'init', displayName: 'Initiator' };
export const product = { kind: 'organization' as const, profileId: 'product', displayName: 'Civizen Product' };
export const anna = { kind: 'person' as const, profileId: 'anna', displayName: 'Anna' };
export const david = { kind: 'person' as const, profileId: 'david', displayName: 'David' };
export const developer = { kind: 'person' as const, profileId: 'dev', displayName: 'Developer' };
export const tester = { kind: 'person' as const, profileId: 'tester', displayName: 'Tester' };
export const stranger = { kind: 'person' as const, profileId: 'stranger', displayName: 'Stranger' };

export function startIssue(now = new Date('2026-09-01T12:00:00.000Z')) {
  const ctx = createMatterEngineContext(now);
  const state = createMatter(
    {
      title: 'Contribution assessment workflow is difficult to understand.',
      description: 'People get lost during contribution assessment.',
      matterType: 'issue',
      initiator,
      addressee: product,
      createdByProfileId: 'init',
    },
    ctx,
  );
  return { ctx, state: asWorkState(state) };
}
