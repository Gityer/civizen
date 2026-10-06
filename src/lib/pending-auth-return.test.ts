// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearPendingAuthReturn,
  peekPendingAuthReturn,
  resolvePostAuthPath,
  savePendingAuthReturn,
} from './pending-auth-return';

const ballotState = { from: { pathname: '/governance/voting/abc', search: '?x=1' } };

describe('pending auth return', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('remembers a safe in-app path and returns it', () => {
    expect(savePendingAuthReturn(ballotState)).toBe('/governance/voting/abc?x=1');
    expect(peekPendingAuthReturn()).toBe('/governance/voting/abc?x=1');
  });

  it('ignores auth-only and unsafe paths', () => {
    expect(savePendingAuthReturn({ from: { pathname: '/login' } })).toBeNull();
    expect(savePendingAuthReturn({ from: { pathname: '//evil.example' } })).toBeNull();
    expect(peekPendingAuthReturn()).toBeNull();
  });

  it('expires after a day', () => {
    savePendingAuthReturn(ballotState, 1_000);
    expect(peekPendingAuthReturn(1_000 + 25 * 60 * 60 * 1000)).toBeNull();
  });

  it('prefers router state, then the remembered path, then the fallback, and clears once used', () => {
    savePendingAuthReturn(ballotState);
    expect(resolvePostAuthPath({ from: { pathname: '/market' } })).toBe('/market');
    expect(peekPendingAuthReturn()).toBeNull();

    savePendingAuthReturn(ballotState);
    expect(resolvePostAuthPath(null)).toBe('/governance/voting/abc?x=1');
    expect(peekPendingAuthReturn()).toBeNull();

    expect(resolvePostAuthPath(null)).toBe('/');
    clearPendingAuthReturn();
  });

  it('rejects a tampered stored value', () => {
    window.localStorage.setItem(
      'civizen.pendingAuthReturn',
      JSON.stringify({ pathname: 'https://evil.example/x', search: '', savedAt: Date.now() }),
    );
    expect(peekPendingAuthReturn()).toBeNull();
  });
});
