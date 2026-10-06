import { describe, expect, it, vi } from 'vitest';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/integrations/supabase/types';

import {
  applyContentReviewExecution,
  applyMonetaryPolicyExecution,
  applyStudyCertificationExecution,
} from './apply-policy';
import type { GovernanceProposalExecutionSpec } from './types';

type MonetarySpec = Extract<
  GovernanceProposalExecutionSpec,
  { actionType: 'activate_monetary_policy' | 'deactivate_monetary_policy' }
>;

const activatePolicySpec: MonetarySpec = {
  actionType: 'activate_monetary_policy',
  autoExecutable: true,
  requestedUnitKey: 'treasury_finance',
  policyProfileId: 'policy-1',
  notes: 'Go live',
};

const deactivatePolicySpec: MonetarySpec = {
  actionType: 'deactivate_monetary_policy',
  autoExecutable: true,
  requestedUnitKey: 'treasury_finance',
  policyProfileId: 'policy-1',
  notes: null,
};

type StudyCertSpec = Extract<
  GovernanceProposalExecutionSpec,
  { actionType: 'award_study_certification' | 'revoke_study_certification' }
>;

const awardCertSpec: StudyCertSpec = {
  actionType: 'award_study_certification',
  autoExecutable: true,
  requestedUnitKey: 'civic_operations',
  profileId: 'profile-1',
  certificationKey: 'constitution_core',
  notes: 'Exam passed',
};

const revokeCertSpec: StudyCertSpec = {
  actionType: 'revoke_study_certification',
  autoExecutable: true,
  requestedUnitKey: 'civic_operations',
  profileId: 'profile-1',
  certificationKey: 'constitution_core',
  notes: null,
};

type ContentReviewSpec = Extract<
  GovernanceProposalExecutionSpec,
  { actionType: 'approve_content_item' | 'reject_content_item' | 'archive_content_item' }
>;

const approveContentSpec: ContentReviewSpec = {
  actionType: 'approve_content_item',
  autoExecutable: true,
  requestedUnitKey: 'policy_legal',
  contentItemId: 'content-1',
  reviewStatus: 'approved',
  notes: 'Looks good',
};

function buildMonetaryPolicyClient(options: {
  mode: 'activate' | 'deactivate';
  policyRow?: { id: string; policy_name: string; version: string } | null;
  policyLookupError?: { message: string } | null;
  bulkDeactivateError?: { message: string } | null;
  targetUpdateError?: { message: string } | null;
  auditInsertError?: { message: string } | null;
}) {
  const policyRow =
    options.policyRow === undefined
      ? { id: 'policy-1', policy_name: 'Treasury baseline', version: '2026.04' }
      : options.policyRow;

  const maybeSingle = vi.fn().mockResolvedValue({
    data: policyRow,
    error: options.policyLookupError ?? null,
  });

  const bulkNeq = vi.fn().mockResolvedValue({ error: options.bulkDeactivateError ?? null });
  const bulkSecondEq = vi.fn().mockReturnValue({ neq: bulkNeq });
  const bulkUpdate = vi.fn().mockReturnValue({ eq: bulkSecondEq });

  const targetEq = vi.fn().mockResolvedValue({ error: options.targetUpdateError ?? null });
  const targetUpdate = vi.fn().mockReturnValue({ eq: targetEq });

  const insert = vi.fn().mockResolvedValue({ error: options.auditInsertError ?? null });

  let monetaryProfilesFromCount = 0;

  const client = {
    from: vi.fn((table: string) => {
      if (table === 'monetary_policy_audit_events') {
        return { insert };
      }
      if (table === 'monetary_policy_profiles') {
        monetaryProfilesFromCount += 1;
        if (monetaryProfilesFromCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle,
          };
        }
        if (options.mode === 'activate' && monetaryProfilesFromCount === 2) {
          return { update: bulkUpdate };
        }
        return { update: targetUpdate };
      }
      throw new Error(`unexpected table ${table}`);
    }),
  };

  return {
    client: client as unknown as SupabaseClient<Database>,
    bulkUpdate,
    targetUpdate,
    targetEq,
    insert,
  };
}

function buildStudyCertClient(upsertError?: { message: string } | null) {
  const upsert = vi.fn().mockResolvedValue({ error: upsertError ?? null });
  const client = {
    from: vi.fn((table: string) => {
      if (table !== 'study_certifications') throw new Error(`unexpected table ${table}`);
      return { upsert };
    }),
  };
  return { client: client as unknown as SupabaseClient<Database>, upsert };
}

function buildContentReviewClient(updateError?: { message: string } | null) {
  const updateEq = vi.fn().mockResolvedValue({ error: updateError ?? null });
  const client = {
    from: vi.fn((table: string) => {
      if (table !== 'content_items') throw new Error(`unexpected table ${table}`);
      return {
        update: vi.fn().mockReturnValue({ eq: updateEq }),
      };
    }),
  };
  return { client: client as unknown as SupabaseClient<Database>, updateEq };
}

describe('apply-policy applyMonetaryPolicyExecution', () => {
  it('blocks when the policy profile cannot be loaded', async () => {
    const { client } = buildMonetaryPolicyClient({
      mode: 'activate',
      policyLookupError: { message: 'timeout' },
    });

    const result = await applyMonetaryPolicyExecution({
      client,
      actorId: 'actor-1',
      spec: activatePolicySpec,
    });

    expect(result.status).toBe('blocked');
    expect(result.summary).toContain('Could not load the target monetary policy profile');
  });

  it('blocks activation when bulk deactivation of other policies fails', async () => {
    const { client, targetUpdate, insert } = buildMonetaryPolicyClient({
      mode: 'activate',
      bulkDeactivateError: { message: 'concurrent edit' },
    });

    const result = await applyMonetaryPolicyExecution({
      client,
      actorId: 'actor-1',
      spec: activatePolicySpec,
    });

    expect(result.status).toBe('blocked');
    expect(result.summary).toContain('Could not deactivate the existing active monetary policies');
    expect(targetUpdate).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('completes activation after bulk deactivate, target update, and audit insert', async () => {
    const { client, insert, bulkUpdate, targetUpdate } = buildMonetaryPolicyClient({ mode: 'activate' });

    const result = await applyMonetaryPolicyExecution({
      client,
      actorId: 'actor-2',
      spec: activatePolicySpec,
    });

    expect(result.status).toBe('completed');
    expect(result.summary).toContain('Activated monetary policy');
    expect(bulkUpdate).toHaveBeenCalledWith({ is_active: false });
    expect(targetUpdate).toHaveBeenCalledWith({ is_active: true });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'governance_policy_activated',
        actor_id: 'actor-2',
        payload: expect.objectContaining({ notes: 'Go live' }),
      }),
    );
  });

  it('completes deactivation without running bulk deactivate', async () => {
    const { client, bulkUpdate, targetUpdate, insert } = buildMonetaryPolicyClient({ mode: 'deactivate' });

    const result = await applyMonetaryPolicyExecution({
      client,
      actorId: 'actor-3',
      spec: deactivatePolicySpec,
    });

    expect(result.status).toBe('completed');
    expect(result.summary).toContain('Deactivated monetary policy');
    expect(bulkUpdate).not.toHaveBeenCalled();
    expect(targetUpdate).toHaveBeenCalledWith({ is_active: false });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'governance_policy_deactivated',
        actor_id: 'actor-3',
      }),
    );
  });

  it('blocks when audit insert fails', async () => {
    const { client } = buildMonetaryPolicyClient({ mode: 'deactivate', auditInsertError: { message: 'rls' } });

    const result = await applyMonetaryPolicyExecution({
      client,
      actorId: 'actor-1',
      spec: deactivatePolicySpec,
    });

    expect(result.status).toBe('blocked');
    expect(result.summary).toContain('Could not record the monetary policy audit event');
  });
});

describe('apply-policy applyStudyCertificationExecution', () => {
  it('awards certification with earned status metadata', async () => {
    const { client, upsert } = buildStudyCertClient();

    const result = await applyStudyCertificationExecution({ client, spec: awardCertSpec });

    expect(result.status).toBe('completed');
    expect(result.summary).toContain('Awarded');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        profile_id: 'profile-1',
        certification_key: 'constitution_core',
        status: 'earned',
        metadata: expect.objectContaining({
          governance_action: 'award_study_certification',
          governance_notes: 'Exam passed',
        }),
      }),
      { onConflict: 'profile_id,certification_key' },
    );
    expect(result.details).toMatchObject({ status: 'earned' });
  });

  it('revokes certification back to pending', async () => {
    const { client, upsert } = buildStudyCertClient();

    const result = await applyStudyCertificationExecution({ client, spec: revokeCertSpec });

    expect(result.status).toBe('completed');
    expect(result.summary).toContain('Revoked');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pending',
        earned_at: null,
        metadata: expect.objectContaining({ governance_action: 'revoke_study_certification' }),
      }),
      { onConflict: 'profile_id,certification_key' },
    );
  });

  it('blocks when upsert fails', async () => {
    const { client } = buildStudyCertClient({ message: 'denied' });

    const result = await applyStudyCertificationExecution({ client, spec: awardCertSpec });

    expect(result.status).toBe('blocked');
    expect(result.summary).toContain('Could not update the study certification record');
  });
});

describe('apply-policy applyContentReviewExecution', () => {
  it('updates the content item review state', async () => {
    const { client, updateEq } = buildContentReviewClient();

    const result = await applyContentReviewExecution({
      client,
      actorId: 'reviewer-1',
      spec: approveContentSpec,
    });

    expect(result.status).toBe('completed');
    expect(result.summary).toContain('approved');
    expect(updateEq).toHaveBeenCalledWith('id', 'content-1');
    expect(client.from).toHaveBeenCalledWith('content_items');
  });

  it('blocks when the content update fails', async () => {
    const { client } = buildContentReviewClient({ message: 'missing row' });

    const result = await applyContentReviewExecution({
      client,
      actorId: 'reviewer-1',
      spec: approveContentSpec,
    });

    expect(result.status).toBe('blocked');
    expect(result.summary).toContain('Could not update the content review state');
  });
});
