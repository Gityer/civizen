import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { authLinkState } from './auth-link-state';

describe('authLinkState', () => {
  it('keeps a pending return path', () => {
    const state = { from: { pathname: '/contribute/matters/m1', search: '' } };
    expect(authLinkState({ pathname: '/onboarding', search: '', state })).toEqual(state);
  });

  it('returns to the current page only when asked', () => {
    expect(authLinkState({ pathname: '/governance/voting/e1', search: '?x=1' }, true)).toEqual({
      from: { pathname: '/governance/voting/e1', search: '?x=1' },
    });
    expect(authLinkState({ pathname: '/why-this-exists', search: '' })).toBeUndefined();
  });
});

// v2 step B1: every guest CTA into sign-in or sign-up carries router state, so the return path survives.
const AUTH_PAGES = /src\/pages\/auth\//;
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.tsx$/.test(name) && !/\.test\.tsx$/.test(name) ? [path] : [];
  });
}

describe('guest calls to action', () => {
  it('never navigate to /login or /signup without router state', () => {
    const offenders: string[] = [];
    for (const file of files(join(process.cwd(), 'src'))) {
      if (AUTH_PAGES.test(file.split('\\').join('/'))) continue;
      const source = readFileSync(file, 'utf8');
      if (/navigate\('\/(signup|login)'\)/.test(source) || /<Link to="\/(signup|login)">/.test(source)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});
