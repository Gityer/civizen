import { beforeEach, describe, expect, it, vi } from 'vitest';

const toastError = vi.hoisted(() => vi.fn());
vi.mock('sonner', () => ({ toast: { error: toastError } }));

import { toastChatFailure } from './chat-bar-errors';

const t = (key: string, vars?: Record<string, string | number>) => (vars ? `${key}:${Object.values(vars).join(',')}` : key);

describe('toastChatFailure', () => {
  beforeEach(() => toastError.mockReset());

  it('shows the rate-limit sentence when the server refused for that reason', () => {
    toastChatFailure({ message: 'rate_limited', code: 'PT429', details: 'message', hint: '2026-10-27T18:05:00Z' } as never, t, 'failed', 'failedWith');
    expect(toastError.mock.calls[0][0]).toMatch(/^rateLimit\.message:/);
  });

  it('keeps the server reason when there is one, else the plain failure', () => {
    toastChatFailure({ message: 'blocked pair' }, t, 'failed', 'failedWith');
    toastChatFailure({ message: '  ' }, t, 'failed', 'failedWith');
    toastChatFailure({ message: 'anything' }, t, 'failed');
    expect(toastError.mock.calls.map((c) => c[0])).toEqual(['failedWith:blocked pair', 'failed', 'failed']);
  });
});
