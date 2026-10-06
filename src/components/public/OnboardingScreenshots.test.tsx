import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { OnboardingScreenshots } from '@/components/public/OnboardingScreenshots';

vi.mock('@/contexts/LanguageContext', async () => {
  const { baseTranslations, translateMessage } = await import('@/lib/i18n');
  return {
    useLanguage: () => ({
      language: 'en',
      t: (key: string, vars?: Record<string, string | number>) => translateMessage(baseTranslations, key, vars),
    }),
  };
});

describe('OnboardingScreenshots', () => {
  it('links each screenshot to its real public page with a Light and a Dark image', () => {
    render(
      <MemoryRouter>
        <OnboardingScreenshots />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'See it in action' })).toBeInTheDocument();

    const expected = [
      { id: 'voting', href: '/governance/voting', title: 'Civic voting' },
      { id: 'documents', href: '/documents', title: 'Public documents' },
      { id: 'areas', href: '/areas', title: 'Areas' },
    ];

    for (const { id, href, title } of expected) {
      const link = screen.getByTestId(`onboarding-screen-${id}`);
      expect(link).toHaveAttribute('href', href);
      const images = within(link).getAllByAltText(`Screenshot of ${title}`);
      expect(images.map((image) => image.getAttribute('src'))).toEqual([
        `/landing/${id}-light.jpg`,
        `/landing/${id}-dark.jpg`,
      ]);
      // Dimensions are set so the strip does not shift while lazy images load.
      images.forEach((image) => {
        expect(image).toHaveAttribute('width', '750');
        expect(image).toHaveAttribute('height', '1520');
        expect(image).toHaveAttribute('loading', 'lazy');
      });
    }
  });
});
