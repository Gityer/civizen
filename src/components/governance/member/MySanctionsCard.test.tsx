import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const rows: Record<string, unknown[]> = { governance_sanctions: [], governance_sanction_appeals: [] };
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({ eq: () => ({ order: async () => ({ data: rows[table], error: null }) }) }),
      insert: async () => ({ error: null }),
    }),
  },
}));

import { MySanctionsCard } from './MySanctionsCard';

const t = (key: string) => key;

describe('MySanctionsCard', () => {
  beforeEach(() => {
    rows.governance_sanctions = [];
    rows.governance_sanction_appeals = [];
  });

  it('renders nothing for a member without sanctions or appeals', async () => {
    const { container } = render(<MySanctionsCard profileId="p-1" t={t} language="en" />);
    await waitFor(() => expect(container.innerHTML).toBe(''));
  });

  it('shows an active sanction with the appeal form', async () => {
    rows.governance_sanctions = [
      {
        id: 's-1',
        profile_id: 'p-1',
        reason: 'Repeated spam',
        starts_at: new Date(Date.now() - 86_400_000).toISOString(),
        ends_at: null,
        is_active: true,
        blocks_governance_all: false,
        blocks_voting: true,
        blocks_proposal_creation: false,
        blocks_execution: false,
        blocks_verification_review: false,
        metadata: {},
        created_at: new Date().toISOString(),
      },
    ];
    render(<MySanctionsCard profileId="p-1" t={t} language="en" />);
    expect(await screen.findByTestId('governance-my-sanctions')).toBeTruthy();
    expect(screen.getByText(/Repeated spam/)).toBeTruthy();
    expect(screen.getByText('governanceHub.appealSubmit')).toBeTruthy();
  });
});
