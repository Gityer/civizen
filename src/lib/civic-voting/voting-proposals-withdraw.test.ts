import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: (...args: unknown[]) => rpc(...args) } }));

import { withdrawVotingProposal } from './voting-proposals';

describe('withdrawVotingProposal', () => {
  beforeEach(() => rpc.mockReset());

  it('calls the server withdraw function with the proposal id', async () => {
    rpc.mockResolvedValue({ data: 'withdrawn', error: null });
    await withdrawVotingProposal('p-1');
    expect(rpc).toHaveBeenCalledWith('withdraw_voting_proposal', { p_proposal_id: 'p-1' });
  });

  it('surfaces the server refusal', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'proposal_not_draft' } });
    await expect(withdrawVotingProposal('p-1')).rejects.toThrow('proposal_not_draft');
  });
});
