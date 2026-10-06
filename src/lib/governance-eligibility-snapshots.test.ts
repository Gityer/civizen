import { describe, expect, it, vi } from 'vitest';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/integrations/supabase/types';

import {
  buildGovernanceEligibilityProfilePatch,
  buildGovernanceEligibilitySnapshot,
  persistGovernanceEligibilitySnapshot,
  sameGovernanceEligibilitySnapshot,
} from './governance-eligibility-snapshots';

type GovernanceSnapshotClient = SupabaseClient<Database>;

function createRpcClient(error: { message: string } | null = null) {
  const rpc = vi.fn().mockResolvedValue({ data: null, error });
  return { client: { rpc } as unknown as GovernanceSnapshotClient, rpc };
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

  it('asks the server to recompute eligibility for the profile', async () => {
    const { client, rpc } = createRpcClient();

    const result = await persistGovernanceEligibilitySnapshot(client, payload);

    expect(result.error).toBeNull();
    expect(rpc).toHaveBeenCalledWith('refresh_governance_eligibility', { p_profile_id: 'profile-1' });
  });

  it('returns the server error', async () => {
    const serverErr = { message: 'refresh failed' };
    const { client } = createRpcClient(serverErr);

    const result = await persistGovernanceEligibilitySnapshot(client, payload);

    expect(result.error).toBe(serverErr);
  });
});
