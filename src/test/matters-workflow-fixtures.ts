import { createMatterEngineContext } from '@/lib/matters-workflow';

export const personA = { kind: 'person' as const, profileId: 'a', displayName: 'User A' };
export const personB = { kind: 'person' as const, profileId: 'b', displayName: 'User B' };
export const orgB = { kind: 'organization' as const, profileId: 'org-b', displayName: 'Civizen Product Team' };
export const personC = { kind: 'person' as const, profileId: 'c', displayName: 'User C' };

export function start(now = new Date('2026-09-01T12:00:00.000Z')) {
  return createMatterEngineContext(now);
}
