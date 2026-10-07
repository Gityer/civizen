import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { CivicElection } from '@/lib/civic-voting';
import { OpenConsultationBannerView } from './OpenConsultationBanner';

const t = (key: string, params?: Record<string, string>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const election = {
  id: 'e-swc',
  title: 'A Single World Citizenship',
  summary: 'Should humanity work toward a single world citizenship?',
  status: 'open',
  votingClosesAt: '2027-09-30T00:00:00Z',
  metadata: {},
} as unknown as CivicElection;

describe('OpenConsultationBannerView', () => {
  it('names the open consultation, its question, the closing date and links to the ballot', () => {
    render(
      <MemoryRouter>
        <OpenConsultationBannerView t={t} language="en" election={election} countable={12} moreCount={0} />
      </MemoryRouter>,
    );
    expect(screen.getByText('A Single World Citizenship').closest('a')?.getAttribute('href')).toBe('/governance/voting/e-swc');
    expect(screen.getByText('Should humanity work toward a single world citizenship?')).toBeTruthy();
    expect(screen.getByText(/openConsultation\.closes:/).textContent).toContain('2027');
    expect(screen.getByText('openConsultation.ballots:12')).toBeTruthy();
    expect(screen.getByText('openConsultation.cta').closest('a')?.getAttribute('href')).toBe('/governance/voting/e-swc');
    expect(screen.getByText('openConsultation.hub').closest('a')?.getAttribute('href')).toBe('/governance/voting');
  });

  it('hides the count until there is a ballot and points to the other open votes', () => {
    render(
      <MemoryRouter>
        <OpenConsultationBannerView t={t} language="hy" election={election} countable={0} moreCount={2} />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/openConsultation\.ballots/)).toBeNull();
    expect(screen.getByText('openConsultation.more:2')).toBeTruthy();
  });
});
