import { describe, expect, it } from 'vitest';

import {
  getAdminCardTitle,
  getDisplayNameParts,
  getEffectiveCitizenshipStatus,
  getEffectiveVerificationStatus,
  getInitials,
  getNextUserExperienceLevel,
  getOrganizationDisplayName,
  groupUsersWithOrganizations,
  humanizeBusinessName,
  type ProfileRow,
} from '@/lib/users-admin';

function makeUser(overrides: Partial<ProfileRow> & Pick<ProfileRow, 'id'>): ProfileRow {
  return {
    user_id: overrides.user_id ?? `user-${overrides.id}`,
    username: null,
    full_name: null,
    avatar_url: null,
    country: null,
    country_code: null,
    language_code: null,
    official_id: null,
    social_security_number: null,
    is_verified: false,
    is_admin: false,
    citizenship_status: 'registered_member',
    citizenship_accepted_at: null,
    citizenship_acceptance_mode: null,
    citizenship_review_cleared_at: null,
    is_active_citizen: false,
    active_citizen_since: null,
    is_governance_eligible: false,
    governance_eligible_at: null,
    experience_level: 'entry',
    role: 'member',
    custom_permissions: [],
    granted_permissions: [],
    denied_permissions: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_active_at: null,
    ...overrides,
  };
}

describe('users-admin helpers', () => {
  it('derives initials from name or username', () => {
    expect(getInitials('Ada Lovelace', null)).toBe('AL');
    expect(getInitials('Marie Skłodowska Curie', null)).toBe('MS');
    expect(getInitials(null, 'countess')).toBe('C');
    expect(getInitials('  ', null)).toBe('?');
  });

  it('advances experience level cyclically', () => {
    expect(getNextUserExperienceLevel('entry')).toBe('junior');
    expect(getNextUserExperienceLevel('mid')).toBe('senior');
    expect(getNextUserExperienceLevel('professional')).toBe('entry');
    expect(getNextUserExperienceLevel(null)).toBe('junior');
    expect(getNextUserExperienceLevel(undefined)).toBe('junior');
  });

  it('prefers verification case status when present', () => {
    expect(getEffectiveVerificationStatus({ is_verified: false }, { status: 'pending_review' as never })).toBe('pending_review');
    expect(getEffectiveVerificationStatus({ is_verified: true }, { status: 'rejected' })).toBe('rejected');
  });

  it('falls back to verified flag when no case status', () => {
    expect(getEffectiveVerificationStatus({ is_verified: true }, null)).toBe('approved');
    expect(getEffectiveVerificationStatus({ is_verified: false }, null)).toBe('draft');
  });

  it('strips trailing professional suffix from display names', () => {
    expect(getDisplayNameParts({ full_name: 'Ada Lovelace Professional', username: null })).toEqual({
      name: 'Ada Lovelace',
      hasProfessionalSuffix: true,
    });
    expect(getDisplayNameParts({ full_name: 'Ada Lovelace', username: 'ada' })).toEqual({
      name: 'Ada Lovelace',
      hasProfessionalSuffix: false,
    });
    expect(getDisplayNameParts({ full_name: null, username: 'ada' })).toEqual({
      name: null,
      hasProfessionalSuffix: false,
    });
    expect(getDisplayNameParts({ full_name: 'Ada Lovelace professional', username: null })).toEqual({
      name: 'Ada Lovelace',
      hasProfessionalSuffix: true,
    });
  });

  it('handles edge cases in initials and display names', () => {
    expect(getInitials('  Ada   Lovelace  ', null)).toBe('AL');
    expect(getDisplayNameParts({ full_name: 'Professional', username: null })).toEqual({
      name: 'Professional',
      hasProfessionalSuffix: false,
    });
  });

  it('falls back to verified flag when verification case has no status', () => {
    expect(getEffectiveVerificationStatus({ is_verified: true }, {})).toBe('approved');
    expect(getEffectiveVerificationStatus({ is_verified: false }, { status: undefined })).toBe('draft');
  });

  it('coerces citizenship using stored status and role projection', () => {
    expect(
      getEffectiveCitizenshipStatus({
        citizenship_status: 'registered_member',
        is_verified: false,
        role: 'member',
      }),
    ).toBe('registered_member');

    expect(
      getEffectiveCitizenshipStatus({
        citizenship_status: 'registered_member',
        is_verified: false,
        role: 'citizen',
      }),
    ).toBe('citizen');

    expect(
      getEffectiveCitizenshipStatus({
        citizenship_status: 'citizen',
        is_verified: true,
        role: 'member',
      }),
    ).toBe('citizen');
  });

  it('humanizes business name slugs and prefers org display names', () => {
    expect(humanizeBusinessName('arts_and_culture')).toBe('Arts And Culture');
    expect(getOrganizationDisplayName({ full_name: 'Arts and Culture', username: 'biz_arts' }, 'arts_and_culture')).toBe(
      'Arts and Culture',
    );
    expect(getOrganizationDisplayName({ full_name: null, username: 'biz_econ' }, 'economics')).toBe('Economics');
    expect(
      getAdminCardTitle(
        { full_name: 'Owner Name', username: 'biz_arts' },
        {
          isOrganization: true,
          organizationName: 'Arts and Culture',
        },
      ),
    ).toBe('Arts and Culture');
  });

  it('groups personal accounts with their organization profiles', () => {
    const owner = makeUser({ id: 'p-owner', full_name: 'Armen Yeremyan', username: 'armen' });
    const orgA = makeUser({ id: 'p-org-a', full_name: 'Arts and Culture', username: 'biz_arts' });
    const orgB = makeUser({ id: 'p-org-b', full_name: 'Economics', username: 'biz_econ' });
    const solo = makeUser({ id: 'p-solo', full_name: 'Solo User', username: 'solo' });

    const groups = groupUsersWithOrganizations(
      [owner, orgA, orgB, solo],
      [
        {
          owner_profile_id: 'p-owner',
          linked_profile_id: 'p-org-a',
          relationship_type: 'business',
          business_name_normalized: 'arts_and_culture',
        },
        {
          owner_profile_id: 'p-owner',
          linked_profile_id: 'p-org-b',
          relationship_type: 'business',
          business_name_normalized: 'economics',
        },
      ],
    );

    expect(groups).toHaveLength(2);
    expect(groups[0]?.owner?.id).toBe('p-owner');
    expect(groups[0]?.organizations.map((item) => item.organizationName)).toEqual([
      'Arts and Culture',
      'Economics',
    ]);
    expect(groups[1]?.owner?.id).toBe('p-solo');
    expect(groups[1]?.organizations).toEqual([]);
  });

  it('keeps orphan organization profiles as standalone groups', () => {
    const orphan = makeUser({ id: 'p-orphan', full_name: 'Orphan Org', username: 'biz_orphan' });
    const groups = groupUsersWithOrganizations(
      [orphan],
      [
        {
          owner_profile_id: 'missing-owner',
          linked_profile_id: 'p-orphan',
          relationship_type: 'business',
          business_name_normalized: 'orphan_org',
        },
      ],
    );

    expect(groups).toEqual([
      {
        owner: null,
        organizations: [{ profile: orphan, organizationName: 'Orphan Org' }],
      },
    ]);
  });
});
