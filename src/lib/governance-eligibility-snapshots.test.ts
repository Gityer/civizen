import { describe, expect, it, vi } from 'vitest';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/integrations/supabase/types';

import {
  buildGovernanceEligibilityProfilePatch,
  buildGovernanceEligibilitySnapshot,
  canPersistGovernanceEligibilitySnapshot,
  persistGovernanceEligibilitySnapshot,
  sameGovernanceEligibilitySnapshot,
} from './governance-eligibility-snapshots';

type GovernanceSnapshotClient = SupabaseClient<Database>;

function createSnapshotClient(stubs: { snapshotError?: { message: string } | null; profileError?: { message: string } | null }) {
  const upsert = vi.fn().mockResolvedValue({ error: stubs.snapshotError ?? null });
  const eq = vi.fn().mockResolvedValue({ error: stubs.profileError ?? null });
  const update = vi.fn().mockReturnValue({ eq });

  const client = {
    from: vi.fn((table: string) => {
      if (table === 'governance_eligibility_snapshots') return { upsert };
      if (table === 'profiles') return { update };
      throw new Error(`unexpected table ${table}`);
    }),
  };

  return { client: client as unknown as GovernanceSnapshotClient, upsert, update, eq };
}

describe('governance-eligibility-snapshots', () => {
  const payload = {
    profileId: 'profile-1',
    citizenshipStatus: 'citizen' as const,
    isVerified: true,
    isActiveCitizen: true,
    civizenScore: 72.345,
    governanceScore: 80.111,
    eligible: true,
    influenceWeight: 1,
    reasons: [] as const,
    calculatedAt: '2026-04-18T12:00:00.000Z',
  };

  it('builds a normalized snapshot row', () => {
    expect(buildGovernanceEligibilitySnapshot(payload)).toEqual({
      profile_id: 'profile-1',
      citizenship_status: 'citizen',
      is_verified: true,
      is_active_citizen: true,
      civizen_score: 72.35,
      governance_score: 80.11,
      influence_weight: 1,
      eligible: true,
      reason_codes: [],
      calculated_at: '2026-04-18T12:00:00.000Z',
      calculation_version: 'phase1-v1',
      source: 'client_projection',
    });
  });

  it('honors optional calculationVersion and source on snapshot rows', () => {
    expect(
      buildGovernanceEligibilitySnapshot({
        ...payload,
        calculationVersion: 'phase2-v0',
        source: 'server_recompute',
      }),
    ).toMatchObject({
      calculation_version: 'phase2-v0',
      source: 'server_recompute',
    });
  });

  it('builds a matching profile patch', () => {
    expect(buildGovernanceEligibilityProfilePatch(payload)).toEqual({
      is_governance_eligible: true,
      governance_eligible_at: '2026-04-18T12:00:00.000Z',
    });
  });

  it('clears governance_eligible_at when the steward is not eligible', () => {
    expect(
      buildGovernanceEligibilityProfilePatch({
        ...payload,
        eligible: false,
      }),
    ).toEqual({
      is_governance_eligible: false,
      governance_eligible_at: null,
    });
  });

  it('normalizes non-finite scores to zero in snapshot rows', () => {
    expect(
      buildGovernanceEligibilitySnapshot({
        ...payload,
        civizenScore: Number.NaN,
        governanceScore: Number.POSITIVE_INFINITY,
      }),
    ).toMatchObject({
      civizen_score: 0,
      governance_score: 0,
    });
  });

  it('compares snapshots without caring about reason order', () => {
    expect(
      sameGovernanceEligibilitySnapshot(
        { ...payload, reasons: ['verified_required', 'mobile_app_required'] },
        { ...payload, reasons: ['mobile_app_required', 'verified_required'] },
      ),
    ).toBe(true);
  });

  it('treats differing profile ids as different snapshots', () => {
    expect(
      sameGovernanceEligibilitySnapshot(payload, {
        ...payload,
        profileId: 'profile-2',
      }),
    ).toBe(false);
  });

  it('treats differing citizenship or eligibility flags as different snapshots', () => {
    expect(sameGovernanceEligibilitySnapshot(payload, { ...payload, citizenshipStatus: 'registered_member' })).toBe(
      false,
    );
    expect(sameGovernanceEligibilitySnapshot(payload, { ...payload, eligible: false })).toBe(false);
    expect(sameGovernanceEligibilitySnapshot(payload, { ...payload, isVerified: false })).toBe(false);
    expect(sameGovernanceEligibilitySnapshot(payload, { ...payload, isActiveCitizen: false })).toBe(false);
    expect(sameGovernanceEligibilitySnapshot(payload, { ...payload, influenceWeight: 2 })).toBe(false);
  });

  it('treats score differences inside rounding precision as equal snapshots', () => {
    expect(
      sameGovernanceEligibilitySnapshot(
        { ...payload, civizenScore: 70.234, governanceScore: 80.114 },
        { ...payload, civizenScore: 70.23, governanceScore: 80.11 },
      ),
    ).toBe(true);
  });

  it('treats score differences beyond rounding precision as different snapshots', () => {
    expect(
      sameGovernanceEligibilitySnapshot(
        { ...payload, civizenScore: 70.225, governanceScore: 80.105 },
        { ...payload, civizenScore: 70.21, governanceScore: 80.09 },
      ),
    ).toBe(false);
  });

  it('persists snapshot then profile patch when both backends succeed', async () => {
    const { client, upsert, update, eq } = createSnapshotClient({});

    const result = await persistGovernanceEligibilitySnapshot(client, payload);

    expect(result.error).toBeNull();
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ profile_id: 'profile-1', eligible: true }),
      { onConflict: 'profile_id' },
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ is_governance_eligible: true, governance_eligible_at: '2026-04-18T12:00:00.000Z' }),
    );
    expect(eq).toHaveBeenCalledWith('id', 'profile-1');
  });

  it('returns snapshot error without updating the profile', async () => {
    const snapshotErr = { message: 'snapshot failed' };
    const { client, upsert, update } = createSnapshotClient({ snapshotError: snapshotErr });

    const result = await persistGovernanceEligibilitySnapshot(client, payload);

    expect(result.error).toBe(snapshotErr);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(update).not.toHaveBeenCalled();
  });

  it('returns profile error after a successful snapshot upsert', async () => {
    const profileErr = { message: 'profile failed' };
    const { client, upsert, update } = createSnapshotClient({ profileError: profileErr });

    const result = await persistGovernanceEligibilitySnapshot(client, payload);

    expect(result.error).toBe(profileErr);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('skips persistence for members without staff permissions (database rejects those writes)', async () => {
    const { client, upsert, update } = createSnapshotClient({});

    const result = await persistGovernanceEligibilitySnapshot(client, payload, {
      effectivePermissions: ['profile.read', 'post.create'],
    });

    expect(result).toEqual({ error: null, skipped: true });
    expect(upsert).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('persists for staff holding role.assign or settings.manage', async () => {
    const { client, upsert, update } = createSnapshotClient({});

    const result = await persistGovernanceEligibilitySnapshot(client, payload, {
      effectivePermissions: ['settings.manage'],
    });

    expect(result.error).toBeNull();
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(canPersistGovernanceEligibilitySnapshot(['role.assign'])).toBe(true);
    expect(canPersistGovernanceEligibilitySnapshot(['profile.read'])).toBe(false);
  });
});
