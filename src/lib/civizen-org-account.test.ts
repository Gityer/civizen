// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import {
  canShowPublishToSocial,
  isSocialProvider,
  profileLooksLikeOfficialCivizenOrg,
} from '@/lib/civizen-org-account';

describe('civizen-org-account', () => {
  it('recognizes official org username', () => {
    expect(profileLooksLikeOfficialCivizenOrg({ username: 'civizen' })).toBe(true);
    expect(profileLooksLikeOfficialCivizenOrg({ username: 'Civizen' })).toBe(true);
    expect(profileLooksLikeOfficialCivizenOrg({ username: 'biz_civizen' })).toBe(false);
    expect(profileLooksLikeOfficialCivizenOrg({ username: 'armen' })).toBe(false);
    expect(profileLooksLikeOfficialCivizenOrg(null)).toBe(false);
  });

  it('validates social providers', () => {
    expect(isSocialProvider('linkedin')).toBe(true);
    expect(isSocialProvider('facebook')).toBe(true);
    expect(isSocialProvider('x')).toBe(true);
    expect(isSocialProvider('instagram')).toBe(false);
  });

  it('gates Publish to… for org-authored posts only', () => {
    expect(
      canShowPublishToSocial({
        isOfficialOrg: true,
        viewerProfileId: 'org-1',
        postAuthorId: 'org-1',
      }),
    ).toBe(true);

    expect(
      canShowPublishToSocial({
        isOfficialOrg: true,
        viewerProfileId: 'org-1',
        postAuthorId: 'other',
      }),
    ).toBe(false);

    expect(
      canShowPublishToSocial({
        isOfficialOrg: false,
        viewerProfileId: 'org-1',
        postAuthorId: 'org-1',
      }),
    ).toBe(false);
  });
});
