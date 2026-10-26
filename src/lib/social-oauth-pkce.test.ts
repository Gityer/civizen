import { describe, expect, it } from 'vitest';

import { codeChallengeS256, newCodeVerifier } from '../../supabase/functions/social-accounts/pkce';

describe('X OAuth PKCE (security finding L3)', () => {
  it('computes the RFC 7636 S256 challenge', async () => {
    // RFC 7636 Appendix B example.
    expect(await codeChallengeS256('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('makes a fresh 43-character verifier each time, never derived from the public state', () => {
    const a = newCodeVerifier();
    const b = newCodeVerifier();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });
});
