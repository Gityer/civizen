import { describe, expect, it } from 'vitest';

import {
  canSubmitIdentityVerification,
  hasArtifactKind,
  isContactInfoCompleted,
  isPersonalInfoCompleted,
  latestArtifactOfKind,
} from '@/lib/identity-verification';

describe('identity verification helpers', () => {
  it('requires name, country, and date of birth for personal info', () => {
    expect(
      isPersonalInfoCompleted({
        full_name: 'Ada Lovelace',
        country: 'United Kingdom',
        date_of_birth: '1815-12-10',
      }),
    ).toBe(true);

    expect(
      isPersonalInfoCompleted({
        full_name: 'Ada Lovelace',
        country: 'United Kingdom',
        date_of_birth: null,
      }),
    ).toBe(false);
  });

  it('accepts username or phone for contact info', () => {
    expect(isContactInfoCompleted({ username: 'ada' })).toBe(true);
    expect(isContactInfoCompleted({ phone_e164: '+15551212' })).toBe(true);
    expect(isContactInfoCompleted({ phone_number: '555-1212' })).toBe(true);
    expect(isContactInfoCompleted({ username: '  ' })).toBe(false);
  });

  it('detects stored artifacts by kind', () => {
    const artifacts = [
      { artifact_kind: 'supporting_document' as const, storage_path: 'a/b/id.jpg' },
      { artifact_kind: 'live_presence' as const, storage_path: null },
    ];

    expect(hasArtifactKind(artifacts, 'supporting_document')).toBe(true);
    expect(hasArtifactKind(artifacts, 'live_presence')).toBe(false);
  });

  it('allows submit only when checklist is complete and case is open', () => {
    expect(
      canSubmitIdentityVerification({
        personalInfoCompleted: true,
        contactInfoCompleted: true,
        hasIdDocument: true,
        hasSelfie: true,
        status: 'draft',
      }),
    ).toBe(true);

    expect(
      canSubmitIdentityVerification({
        personalInfoCompleted: true,
        contactInfoCompleted: true,
        hasIdDocument: true,
        hasSelfie: true,
        status: 'submitted',
      }),
    ).toBe(false);

    expect(
      canSubmitIdentityVerification({
        personalInfoCompleted: true,
        contactInfoCompleted: true,
        hasIdDocument: true,
        hasSelfie: false,
        status: 'rejected',
      }),
    ).toBe(false);
  });

  it('returns the newest matching artifact with a storage path', () => {
    const artifacts = [
      {
        id: '1',
        case_id: 'c1',
        artifact_kind: 'supporting_document' as const,
        storage_path: 'path/id.jpg',
        artifact_hash: null,
        metadata: {},
        created_by: null,
        created_at: '2026-09-07T12:00:00Z',
      },
      {
        id: '2',
        case_id: 'c1',
        artifact_kind: 'live_presence' as const,
        storage_path: null,
        artifact_hash: null,
        metadata: {},
        created_by: null,
        created_at: '2026-09-07T12:01:00Z',
      },
    ];

    expect(latestArtifactOfKind(artifacts, 'supporting_document')?.id).toBe('1');
    expect(latestArtifactOfKind(artifacts, 'live_presence')).toBeNull();
  });
});
