import { describe, expect, it } from 'vitest';

import { buildGovernanceExecutionTasksForUser } from '@/lib/governance-execution-tasks';
import type { GovernanceExecutionUnitRow } from '@/lib/governance-implementation';
import type { GovernanceProposalRow } from '@/lib/governance-proposals';
import type { Database } from '@/integrations/supabase/types';

type ImplementationRow = Database['public']['Tables']['governance_proposal_implementations']['Row'];

function proposal(id: string, title: string): GovernanceProposalRow {
  return {
    id,
    title,
    summary: '',
    body: '',
    decision_class: 'ordinary',
    proposal_type: 'test',
    proposer_id: 'user-1',
    status: 'approved',
    final_decision_summary: null,
    opens_at: '2026-04-01T00:00:00.000Z',
    closes_at: '2026-04-03T00:00:00.000Z',
    resolved_at: null,
    approval_threshold: 0.5,
    required_quorum: 1,
    eligible_voter_count_snapshot: 1,
    bootstrap_mode: false,
    metadata: {},
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-01T00:00:00.000Z',
  };
}

function unit(id: string, name: string, unitKey: string): GovernanceExecutionUnitRow {
  return {
    id,
    name,
    unit_key: unitKey,
    domain_key: unitKey,
    description: '',
    is_system_unit: true,
    is_active: true,
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-01T00:00:00.000Z',
  };
}

function implementation(overrides: Partial<ImplementationRow>): ImplementationRow {
  return {
    id: 'impl-1',
    proposal_id: 'proposal-1',
    unit_id: 'unit-1',
    status: 'queued',
    implementation_summary: 'Do implementation',
    metadata: {},
    created_by: 'user-1',
    assigned_at: '2026-04-02T00:00:00.000Z',
    started_at: null,
    completed_at: null,
    created_at: '2026-04-02T00:00:00.000Z',
    updated_at: '2026-04-02T00:00:00.000Z',
    ...overrides,
  };
}

describe('governance-execution-tasks', () => {
  it('returns actionable tasks for user-owned units sorted by latest assignment', () => {
    const tasks = buildGovernanceExecutionTasksForUser({
      implementations: [
        implementation({ id: 'impl-old', proposal_id: 'proposal-1', assigned_at: '2026-04-02T00:00:00.000Z' }),
        implementation({ id: 'impl-new', proposal_id: 'proposal-2', assigned_at: '2026-04-03T00:00:00.000Z', status: 'blocked' }),
      ],
      proposalsById: {
        'proposal-1': proposal('proposal-1', 'Old proposal'),
        'proposal-2': proposal('proposal-2', 'New proposal'),
      },
      unitsById: {
        'unit-1': unit('unit-1', 'Civic Operations Unit', 'civic_operations'),
      },
      currentUserUnitIds: new Set(['unit-1']),
    });

    expect(tasks.map((item) => item.implementationId)).toEqual(['impl-new', 'impl-old']);
    expect(tasks[0]).toMatchObject({
      proposalTitle: 'New proposal',
      implementationStatus: 'blocked',
    });
  });

  it('ignores completed/cancelled tasks and non-member units', () => {
    const tasks = buildGovernanceExecutionTasksForUser({
      implementations: [
        implementation({ id: 'impl-completed', status: 'completed' }),
        implementation({ id: 'impl-cancelled', status: 'cancelled' }),
        implementation({ id: 'impl-other-unit', unit_id: 'unit-2' }),
      ],
      proposalsById: { 'proposal-1': proposal('proposal-1', 'Proposal 1') },
      unitsById: {
        'unit-1': unit('unit-1', 'Unit 1', 'civic_operations'),
        'unit-2': unit('unit-2', 'Unit 2', 'policy_legal'),
      },
      currentUserUnitIds: new Set(['unit-1']),
    });

    expect(tasks).toEqual([]);
  });

  it('applies configurable limits', () => {
    const tasks = buildGovernanceExecutionTasksForUser({
      implementations: [
        implementation({ id: 'impl-1', proposal_id: 'proposal-1', assigned_at: '2026-04-01T00:00:00.000Z' }),
        implementation({ id: 'impl-2', proposal_id: 'proposal-2', assigned_at: '2026-04-02T00:00:00.000Z' }),
        implementation({ id: 'impl-3', proposal_id: 'proposal-3', assigned_at: '2026-04-03T00:00:00.000Z' }),
      ],
      proposalsById: {
        'proposal-1': proposal('proposal-1', 'Proposal 1'),
        'proposal-2': proposal('proposal-2', 'Proposal 2'),
        'proposal-3': proposal('proposal-3', 'Proposal 3'),
      },
      unitsById: { 'unit-1': unit('unit-1', 'Unit 1', 'civic_operations') },
      currentUserUnitIds: new Set(['unit-1']),
      limit: 2,
    });

    expect(tasks).toHaveLength(2);
    expect(tasks.map((item) => item.implementationId)).toEqual(['impl-3', 'impl-2']);
  });
});
