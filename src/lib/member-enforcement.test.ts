import { describe, expect, it } from 'vitest';
import {
  enforcementErrorKey,
  highestAllowedStep,
  isStanding,
  isSuspendedSignInError,
  restrictionMessage,
  type EnforcementAction,
} from './member-enforcement';
import { writeRefusalMessage } from './write-refusal';

const t = (key: string, vars?: Record<string, string | number>) => `${key}|${vars ? Object.values(vars).join(',') : ''}`;

function action(step: EnforcementAction['step'], extra: Partial<EnforcementAction> = {}): EnforcementAction {
  return {
    id: step, profileId: 'p', username: null, step, reasonCode: 'spam', note: null, moderatorProfileId: null,
    createdAt: '2026-10-27T00:00:00Z', endsAt: null, liftedAt: null, appealText: null, appealedAt: null,
    appealDecision: null, appealNote: null, appealDecidedAt: null, ...extra,
  };
}

describe('member enforcement', () => {
  it('allows a note or a warning first, then one rung above the highest standing step', () => {
    expect(highestAllowedStep([])).toBe('warning');
    expect(highestAllowedStep([action('note')])).toBe('warning');
    expect(highestAllowedStep([action('warning')])).toBe('content_restriction');
    expect(highestAllowedStep([action('warning'), action('content_restriction', { endsAt: '2020-01-01T00:00:00Z' })])).toBe('messaging_restriction');
    expect(highestAllowedStep([action('suspension')])).toBe('suspension');
  });

  it('does not count overturned or lifted steps', () => {
    expect(highestAllowedStep([action('warning', { appealDecision: 'overturned', liftedAt: '2026-10-27T01:00:00Z' })])).toBe('warning');
  });

  it('knows whether a step still stands', () => {
    const now = new Date('2026-10-27T12:00:00Z');
    expect(isStanding(action('warning'), now)).toBe(true);
    expect(isStanding(action('content_restriction', { endsAt: '2026-10-30T00:00:00Z' }), now)).toBe(true);
    expect(isStanding(action('content_restriction', { endsAt: '2026-10-20T00:00:00Z' }), now)).toBe(false);
    expect(isStanding(action('suspension', { endsAt: '2026-11-20T00:00:00Z', liftedAt: '2026-10-27T00:00:00Z' }), now)).toBe(false);
  });

  it('explains a refused write by the restriction, and ignores other errors', () => {
    expect(restrictionMessage({ code: 'PT403', details: 'messaging_restriction', hint: '2026-11-03T10:00:00Z' }, t)).toMatch(/^memberEnforcement\.refused\.messaging_restriction\|/);
    expect(restrictionMessage({ code: 'PT403', details: 'anything', hint: null }, t)).toBe('memberEnforcement.refused.content_restriction|—');
    expect(restrictionMessage({ code: '42501' }, t)).toBeNull();
    expect(writeRefusalMessage({ code: 'PT403', details: 'suspension', hint: '2026-11-03T10:00:00Z' }, t)).toMatch(/^memberEnforcement\.refused\.suspension/);
    expect(writeRefusalMessage({ code: 'PT429', details: 'post', hint: '2026-11-03T10:00:00Z' }, t)).toMatch(/^rateLimit\.post/);
    expect(writeRefusalMessage(new Error('boom'), t)).toBeNull();
  });

  it('recognises a suspended sign-in and maps the ladder errors', () => {
    expect(isSuspendedSignInError({ code: 'user_banned', message: 'User is banned' })).toBe(true);
    expect(isSuspendedSignInError({ message: 'user_banned' })).toBe(true);
    expect(isSuspendedSignInError({ message: 'Invalid login credentials' })).toBe(false);
    expect(enforcementErrorKey('step_too_high', () => 'fallback')).toBe('memberEnforcement.errors.step_too_high');
    expect(enforcementErrorKey('already_appealed', (m) => `moderation.errors.${m}`)).toBe('moderation.errors.already_appealed');
  });
});
