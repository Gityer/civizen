import { describe, expect, it } from 'vitest';
import { errorWithFields, rateLimitInfo, rateLimitMessage } from './rate-limit';

const t = (key: string, vars?: Record<string, string | number>) => `${key}|${vars?.time ?? ''}`;

describe('rate-limit errors', () => {
  it('recognises a PT429 refusal and reads the action and retry time', () => {
    const info = rateLimitInfo({ code: 'PT429', details: 'post', hint: '2026-10-27T18:05:00Z' });
    expect(info?.action).toBe('post');
    expect(info?.retryAt?.toISOString()).toBe('2026-10-27T18:05:00.000Z');
  });

  it('ignores other errors', () => {
    expect(rateLimitInfo({ code: '42501', details: null, hint: null })).toBeNull();
    expect(rateLimitInfo(null)).toBeNull();
    expect(rateLimitMessage({ code: '23505' }, t)).toBeNull();
  });

  it('picks the sentence for the action, with a fallback for unknown actions', () => {
    expect(rateLimitMessage({ code: 'PT429', details: 'comment', hint: '2026-10-27T18:05:00Z' }, t, 'en')).toMatch(/^rateLimit\.comment\|\d{2}:\d{2}/);
    expect(rateLimitMessage({ code: 'PT429', details: 'something-new', hint: 'not a date' }, t)).toBe('rateLimit.generic|—');
  });

  it('keeps the fields on a rethrown Error', () => {
    const error = errorWithFields('rate_limited', { code: 'PT429', details: 'report', hint: '2026-10-27T18:05:00Z' });
    expect(error.message).toBe('rate_limited');
    expect(rateLimitInfo(error)?.action).toBe('report');
  });
});
