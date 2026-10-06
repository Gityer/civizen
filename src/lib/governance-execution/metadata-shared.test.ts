import { describe, expect, it } from 'vitest';

import { getActionMetadataPayload } from './metadata-shared';
import { emptyGovernanceExecutionDraft, type GovernanceExecutionDraft } from './types';

function draft(partial: Partial<GovernanceExecutionDraft>): GovernanceExecutionDraft {
  return { ...emptyGovernanceExecutionDraft, ...partial };
}

describe('getActionMetadataPayload', () => {
  it('returns role and permission when both are valid', () => {
    const payload = getActionMetadataPayload(
      draft({
        actionType: 'grant_role_permission',
        targetRole: 'moderator',
        targetPermission: 'law.review',
      }),
    );

    expect(payload).toEqual({ role: 'moderator', permission: 'law.review' });
  });

  it('returns an empty payload when role or permission is invalid', () => {
    const payload = getActionMetadataPayload(
      draft({
        actionType: 'grant_role_permission',
        targetRole: 'not_a_real_role' as never,
        targetPermission: 'law.review',
      }),
    );

    expect(payload).toEqual({});
  });

  it('includes trimmed notes for unit membership actions', () => {
    const payload = getActionMetadataPayload(
      draft({
        actionType: 'assign_unit_member',
        targetUnitKey: 'security_response',
        targetProfileId: 'profile-9',
        membershipRole: 'lead',
        notes: '  onboarded  ',
      }),
    );

    expect(payload).toEqual({
      target_unit_key: 'security_response',
      profile_id: 'profile-9',
      membership_role: 'lead',
      notes: 'onboarded',
    });
  });

  it('omits notes when the draft notes are blank', () => {
    const payload = getActionMetadataPayload(
      draft({
        actionType: 'revoke_identity_verification',
        targetProfileId: 'profile-2',
        notes: '   ',
      }),
    );

    expect(payload).toEqual({
      profile_id: 'profile-2',
      notes: undefined,
    });
  });

  it('normalizes country code for scoped activation metadata', () => {
    const payload = getActionMetadataPayload(
      draft({
        actionType: 'activate_citizen_scope',
        targetProfileId: 'profile-3',
        activationScopeType: 'country',
        activationCountryCode: ' am ',
        notes: 'Declared',
      }),
    );

    expect(payload).toEqual({
      profile_id: 'profile-3',
      scope_type: 'country',
      country_code: 'AM',
      notes: 'Declared',
    });
  });

  it('uses empty country code for world scope activation', () => {
    const payload = getActionMetadataPayload(
      draft({
        actionType: 'deactivate_citizen_scope',
        targetProfileId: 'profile-4',
        activationScopeType: 'world',
        activationCountryCode: 'ZZ',
      }),
    );

    expect(payload).toMatchObject({
      profile_id: 'profile-4',
      scope_type: 'world',
      country_code: '',
    });
  });

  it('maps study certification and content review drafts', () => {
    expect(
      getActionMetadataPayload(
        draft({
          actionType: 'award_study_certification',
          targetProfileId: 'p1',
          studyCertificationKey: 'constitution_core',
          notes: 'ok',
        }),
      ),
    ).toEqual({
      profile_id: 'p1',
      certification_key: 'constitution_core',
      notes: 'ok',
    });

    expect(
      getActionMetadataPayload(
        draft({
          actionType: 'reject_content_item',
          contentItemId: 'c99',
          notes: '',
        }),
      ),
    ).toEqual({
      content_item_id: 'c99',
      review_status: 'rejected',
      notes: undefined,
    });
  });

  it('returns an empty object for manual follow-through', () => {
    expect(getActionMetadataPayload(draft({ actionType: 'manual_follow_through' }))).toEqual({});
  });
});
