import { describe, expect, it, vi } from 'vitest';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/integrations/supabase/types';

import { applyGovernanceProposalExecution } from './apply';
import type { GovernanceProposalExecutionSpec } from './types';

const manualSpec: GovernanceProposalExecutionSpec = {
  actionType: 'manual_follow_through',
  autoExecutable: false,
  requestedUnitKey: 'civic_operations',
};

const grantSpec = {
  actionType: 'grant_role_permission',
  autoExecutable: true,
  requestedUnitKey: 'policy_legal',
  role: 'moderator',
  permission: 'law.review',
} as const satisfies Extract<GovernanceProposalExecutionSpec, { actionType: 'grant_role_permission' | 'revoke_role_permission' }>;

function buildGrantOnlyClient() {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const client = {
    from: vi.fn((table: string) => {
      if (table !== 'role_permissions') throw new Error(`unexpected table ${table}`);
      return { upsert };
    }),
  };
  return { client: client as unknown as SupabaseClient<Database>, upsert };
}

describe('applyGovernanceProposalExecution', () => {
  it('returns manual follow-through guidance for non-automatic specs', async () => {
    const client = { from: vi.fn() } as unknown as SupabaseClient<Database>;

    const result = await applyGovernanceProposalExecution({
      client,
      spec: manualSpec,
      actorId: null,
      unitsByKey: {},
    });

    expect(result.status).toBe('blocked');
    expect(result.summary).toContain('manual follow-through');
    expect(client.from).not.toHaveBeenCalled();
  });

  it('dispatches grant_role_permission to the role permission executor', async () => {
    const { client, upsert } = buildGrantOnlyClient();

    const result = await applyGovernanceProposalExecution({
      client,
      spec: grantSpec,
      actorId: 'actor-1',
      unitsByKey: {},
    });

    expect(result.status).toBe('completed');
    expect(upsert).toHaveBeenCalledWith(
      { role: 'moderator', permission: 'law.review' },
      { onConflict: 'role,permission' },
    );
  });
});
