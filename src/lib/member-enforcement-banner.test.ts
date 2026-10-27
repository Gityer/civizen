import { describe, expect, it } from 'vitest';
import type { EnforcementAction } from '@/lib/member-enforcement';
import { strongestRestriction } from '@/lib/member-enforcement';

function action(step: EnforcementAction['step'], endsAt: string | null, extra: Partial<EnforcementAction> = {}): EnforcementAction {
  return {
    id: `${step}-${endsAt}`, profileId: 'p', username: null, step, reasonCode: 'spam', note: null, moderatorProfileId: null,
    createdAt: '2026-10-27T00:00:00Z', endsAt, liftedAt: null, appealText: null, appealedAt: null, appealDecision: null,
    appealNote: null, appealDecidedAt: null, confirmedBy: 'm', confirmedAt: '2026-10-27T00:00:00Z', closedAt: null, ...extra,
  };
}

const now = new Date('2026-10-27T12:00:00Z');

describe('strongestRestriction', () => {
  it('shows a suspension before a messaging or content restriction', () => {
    const picked = strongestRestriction([
      action('content_restriction', '2026-11-01T00:00:00Z'),
      action('suspension', '2026-11-20T00:00:00Z'),
      action('messaging_restriction', '2026-11-02T00:00:00Z'),
    ], now);
    expect(picked?.step).toBe('suspension');
  });

  it('ignores warnings, ended restrictions and overturned ones', () => {
    expect(strongestRestriction([
      action('warning', null),
      action('content_restriction', '2026-10-20T00:00:00Z'),
      action('suspension', '2026-11-20T00:00:00Z', { liftedAt: '2026-10-27T10:00:00Z', appealDecision: 'overturned' }),
    ], now)).toBeNull();
  });
});
