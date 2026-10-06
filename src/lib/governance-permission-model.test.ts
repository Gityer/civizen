import { describe, expect, it } from 'vitest';

import { deriveGovernancePermissions } from '@/lib/governance-permission-model';

const base = {
  permissions: [] as string[],
  eligible: true,
  voteBlockedBySanction: false,
  proposalBlockedBySanction: false,
  activeOfficeKeys: [] as ('founder')[],
};

describe('deriveGovernancePermissions', () => {
  it('lets an eligible, unsanctioned member vote and propose, but not manage offices', () => {
    expect(deriveGovernancePermissions(base)).toEqual({
      canVote: true,
      canCreateProposals: true,
      canManageOffices: false,
      isOfficeHolder: false,
      canAccessStewardConsole: false,
    });
  });

  it('denies voting and proposing to members who are not eligible', () => {
    const result = deriveGovernancePermissions({ ...base, eligible: false });
    expect(result.canVote).toBe(false);
    expect(result.canCreateProposals).toBe(false);
  });

  it('blocks only the sanctioned action', () => {
    const noVote = deriveGovernancePermissions({ ...base, voteBlockedBySanction: true });
    expect(noVote.canVote).toBe(false);
    expect(noVote.canCreateProposals).toBe(true);

    const noPropose = deriveGovernancePermissions({ ...base, proposalBlockedBySanction: true });
    expect(noPropose.canVote).toBe(true);
    expect(noPropose.canCreateProposals).toBe(false);
  });

  it.each(['role.assign', 'settings.manage'])('allows office management with %s (as the database policy does)', (permission) => {
    const result = deriveGovernancePermissions({ ...base, permissions: [permission] });
    expect(result.canManageOffices).toBe(true);
    expect(result.canAccessStewardConsole).toBe(true);
  });

  it('shows the steward console to office holders without letting them manage offices', () => {
    const result = deriveGovernancePermissions({ ...base, activeOfficeKeys: ['founder'] });
    expect(result.isOfficeHolder).toBe(true);
    expect(result.canManageOffices).toBe(false);
    expect(result.canAccessStewardConsole).toBe(true);
  });

  it('ignores unrelated permissions and tolerates a missing list', () => {
    expect(deriveGovernancePermissions({ ...base, permissions: ['post.create'] }).canManageOffices).toBe(false);
    expect(deriveGovernancePermissions({ ...base, permissions: null }).canManageOffices).toBe(false);
  });
});
