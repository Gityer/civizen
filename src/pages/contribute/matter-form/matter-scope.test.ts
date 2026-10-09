import { describe, expect, it } from 'vitest';

import { EMPTY_MATTER_SCOPE, matterScopeForSubmit, matterScopeMissingKey } from './matter-scope';

describe('matter scope', () => {
  it('needs nothing for a global Matter', () => {
    expect(matterScopeMissingKey(EMPTY_MATTER_SCOPE)).toBeNull();
    expect(matterScopeForSubmit(EMPTY_MATTER_SCOPE)).toEqual({
      scopeKind: 'global',
      scopeCountryCode: null,
      scopeRegionCode: null,
      scopeLocalityCode: null,
    });
  });

  it('asks for country, then region, then city as the scope narrows', () => {
    expect(matterScopeMissingKey({ ...EMPTY_MATTER_SCOPE, scopeKind: 'country' })).toBe('contribute.matters.scopeCountryRequired');
    expect(matterScopeMissingKey({ ...EMPTY_MATTER_SCOPE, scopeKind: 'region', scopeCountryCode: 'am' })).toBe(
      'contribute.matters.scopeRegionRequired',
    );
    expect(
      matterScopeMissingKey({ ...EMPTY_MATTER_SCOPE, scopeKind: 'locality', scopeCountryCode: 'AM', scopeRegionCode: 'ER' }),
    ).toBe('contribute.matters.scopeLocalityRequired');
    expect(
      matterScopeMissingKey({ scopeKind: 'locality', scopeCountryCode: 'AM', scopeRegionCode: 'ER', scopeLocalityCode: 'Yerevan' }),
    ).toBeNull();
  });

  it('sends region and city codes only for the levels the kind uses', () => {
    expect(
      matterScopeForSubmit({ scopeKind: 'country', scopeCountryCode: 'am', scopeRegionCode: 'ER', scopeLocalityCode: 'Yerevan' }),
    ).toEqual({ scopeKind: 'country', scopeCountryCode: 'AM', scopeRegionCode: null, scopeLocalityCode: null });
    expect(
      matterScopeForSubmit({ scopeKind: 'locality', scopeCountryCode: 'am', scopeRegionCode: 'ER', scopeLocalityCode: 'Yerevan' }),
    ).toEqual({ scopeKind: 'locality', scopeCountryCode: 'AM', scopeRegionCode: 'ER', scopeLocalityCode: 'Yerevan' });
  });
});
