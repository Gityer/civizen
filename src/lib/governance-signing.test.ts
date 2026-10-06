// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import {
  CITIZEN_SIGNING_ALGORITHM,
  clearStoredCitizenSigningKey,
  generateCitizenSigningKey,
  hashGovernanceIntent,
  readStoredCitizenSigningKey,
  signGovernanceIntent,
  stableStringify,
  storeCitizenSigningKey,
  verifyGovernanceIntentSignature,
} from './governance-signing';

describe('governance-signing', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('stableStringify sorts object keys recursively', () => {
    expect(
      stableStringify({
        z: 1,
        a: {
          d: true,
          c: ['x', { y: 2, x: 1 }],
        },
      }),
    ).toBe('{"a":{"c":["x",{"x":1,"y":2}],"d":true},"z":1}');
  });

  it('stableStringify omits undefined object entries and handles primitives', () => {
    expect(stableStringify({ b: 1, a: undefined })).toBe('{"b":1}');
    expect(stableStringify([1, 2, 3])).toBe('[1,2,3]');
    expect(stableStringify(true)).toBe('true');
    expect(stableStringify(null)).toBe('null');
    expect(stableStringify({})).toBe('{}');
    expect(stableStringify({ nested: {}, z: 0 })).toBe('{"nested":{},"z":0}');
    expect(stableStringify(42)).toBe('42');
  });

  it('produces the same hash for equivalent payloads with different key order', async () => {
    const left = await hashGovernanceIntent({
      actorProfileId: 'profile-1',
      actionScope: 'monetary_policy.save',
      clientCreatedAt: '2026-04-16T00:00:00.000Z',
      payload: {
        b: 2,
        a: 1,
      },
    });

    const right = await hashGovernanceIntent({
      actorProfileId: 'profile-1',
      actionScope: 'monetary_policy.save',
      clientCreatedAt: '2026-04-16T00:00:00.000Z',
      payload: {
        a: 1,
        b: 2,
      },
    });

    expect(left).toBe(right);
  });

  it('signs and verifies governance intents', async () => {
    const signingKey = await generateCitizenSigningKey();

    expect(signingKey.algorithm).toBe(CITIZEN_SIGNING_ALGORITHM);

    const intent = await signGovernanceIntent(
      {
        actorProfileId: 'profile-1',
        actionScope: 'monetary_policy.approval',
        targetId: 'policy-1',
        payload: {
          approval_class: 'ordinary',
          decision: 'approved',
        },
      },
      signingKey,
    );

    await expect(verifyGovernanceIntentSignature(intent)).resolves.toBe(true);
  });

  it('stores and clears local citizen signing keys', async () => {
    const signingKey = await generateCitizenSigningKey();

    storeCitizenSigningKey('profile-1', signingKey);
    expect(readStoredCitizenSigningKey('profile-1')).toEqual(signingKey);

    clearStoredCitizenSigningKey('profile-1');
    expect(readStoredCitizenSigningKey('profile-1')).toBeNull();
  });
});
