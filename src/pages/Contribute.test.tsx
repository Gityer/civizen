import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import Contribute from '@/pages/Contribute';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <div {...props}>{children}</div>,
    section: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <section {...props}>{children}</section>
    ),
  },
}));

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="app-layout">{children}</div>,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

describe('Contribute hub', () => {
  it('renders section headings and contribution lanes', () => {
    render(
      <MemoryRouter>
        <Contribute />
      </MemoryRouter>,
    );

    expect(screen.getByText('contribute.title')).toBeInTheDocument();
    expect(screen.getByText('contribute.subtitle')).toBeInTheDocument();
    expect(screen.getByText('contribute.sections.ways')).toBeInTheDocument();
    expect(screen.getByText('contribute.sections.community')).toBeInTheDocument();
    expect(screen.getByText('contribute.sections.knowledge')).toBeInTheDocument();
    expect(screen.getByText('contribute.sections.impact')).toBeInTheDocument();
    expect(screen.getByText('contribute.lanes.challenges.title')).toBeInTheDocument();
    expect(screen.getByText('contribute.lanes.matters.title')).toBeInTheDocument();
    expect(screen.getByText('contribute.lanes.professional.title')).toBeInTheDocument();
    expect(screen.getByText('contribute.lanes.financial.title')).toBeInTheDocument();
    expect(screen.queryByText('contribute.actions.endorse.title')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'contribute.related.areas' })).toHaveAttribute(
      'href',
      '/areas',
    );
  });
});

