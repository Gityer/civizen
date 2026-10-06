import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AppPageHeader } from '@/components/layout/AppPageHeader';

vi.mock('@/contexts/LanguageContext', async () => {
  const { baseTranslations, translateMessage } = await import('@/lib/i18n');
  return {
    useLanguage: () => ({
      language: 'en',
      setLanguage: async () => {},
      t: (key: string, vars?: Record<string, string | number>) => translateMessage(baseTranslations, key, vars),
      getNode: (key: string) => key,
      languageOptions: [{ code: 'en', label: 'English' }],
      isLoadingLanguage: false,
    }),
  };
});

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-path">{location.pathname}</div>;
}

describe('AppPageHeader', () => {
  it('puts Back and title on the same row and navigates back', () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <AppPageHeader title="Settings" />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    const header = screen.getByTestId('app-page-header');
    const back = screen.getByTestId('app-page-header-back');
    const title = screen.getByTestId('app-page-header-title');
    expect(header.className).toContain('items-center');
    expect(header.className).toContain('flex-wrap');
    expect(back).toBeInTheDocument();
    expect(title).toHaveTextContent('Settings');
    expect(back.parentElement).toContainElement(title);

    fireEvent.click(back);
    expect(screen.getByTestId('location-path')).toHaveTextContent('/');
  });

  it('hides Back on bottom-nav hubs', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppPageHeader title="Home" />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('app-page-header-back')).not.toBeInTheDocument();
    expect(screen.getByTestId('app-page-header-title')).toHaveTextContent('Home');
  });

  it('calls onBack instead of navigating when provided', () => {
    const onBack = vi.fn();
    render(
      <MemoryRouter initialEntries={['/endorse/abc']}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <AppPageHeader title="Endorse" onBack={onBack} />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('app-page-header-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('location-path')).toHaveTextContent('/endorse/abc');
  });

  it('places a title accessory immediately beside the title', () => {
    render(
      <MemoryRouter initialEntries={['/agreements']}>
        <AppPageHeader
          title="Agreements"
          titleAccessory={<button type="button" aria-label="Create agreement">+</button>}
        />
      </MemoryRouter>,
    );

    const title = screen.getByTestId('app-page-header-title');
    const create = screen.getByRole('button', { name: 'Create agreement' });
    expect(title.parentElement).toContainElement(create);
    expect(title).toHaveTextContent('Agreements');
  });

  it('keeps title readable when actions and a subtitle share a narrow header', () => {
    render(
      <MemoryRouter initialEntries={['/agreements']}>
        <AppPageHeader
          title="Agreements"
          subtitle="Create, review, sign, and manage agreements with people and organizations."
          leading={<span data-testid="header-leading">icon</span>}
          actions={<button type="button">Create agreement</button>}
        />
      </MemoryRouter>,
    );

    const header = screen.getByTestId('app-page-header');
    const title = screen.getByTestId('app-page-header-title');
    const actions = screen.getByTestId('app-page-header-actions');
    expect(header.className).toContain('flex-wrap');
    expect(header.className).toContain('items-start');
    expect(title.className).not.toContain('break-words');
    expect(actions.className).toContain('w-full');
    expect(title).toHaveTextContent('Agreements');
  });
});
