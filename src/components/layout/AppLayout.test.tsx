import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppLayout } from '@/components/layout/AppLayout';

vi.mock('@/components/layout/SkipToContentLink', () => ({
  SkipToContentLink: () => null,
  MAIN_CONTENT_ID: 'main-content',
}));

vi.mock('@/components/layout/AppTopChrome', () => ({
  AppTopChrome: () => <div data-testid="app-top-chrome" />,
}));

vi.mock('@/components/layout/MobileNav', () => ({
  MobileNav: () => <nav data-testid="mobile-nav" />,
}));

vi.mock('@/components/layout/AppSideNav', () => ({
  AppSideNav: () => <aside data-testid="app-side-nav" />,
}));

vi.mock('@/components/layout/NavSecondaryDesktop', () => ({
  NavSecondaryDesktop: () => <div data-testid="nav-secondary-desktop" />,
}));

function mockDesktop(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: matches && String(query).includes('1024'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('AppLayout', () => {
  afterEach(() => {
    mockDesktop(false);
  });

  it('renders phone bottom nav below the desktop breakpoint', () => {
    mockDesktop(false);
    render(
      <AppLayout>
        <div>content</div>
      </AppLayout>,
    );

    expect(screen.getByTestId('app-top-chrome')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-nav')).toBeInTheDocument();
    expect(screen.queryByTestId('app-side-nav')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nav-secondary-desktop')).not.toBeInTheDocument();
  });

  it('renders the side rail on large screens', () => {
    mockDesktop(true);
    render(
      <AppLayout>
        <div>content</div>
      </AppLayout>,
    );

    expect(screen.getByTestId('app-side-nav')).toBeInTheDocument();
    expect(screen.getByTestId('nav-secondary-desktop')).toBeInTheDocument();
    expect(screen.queryByTestId('mobile-nav')).not.toBeInTheDocument();
  });

  it('hides floating top chrome when hideTopChrome is set', () => {
    mockDesktop(false);
    render(
      <AppLayout hideTopChrome>
        <div>content</div>
      </AppLayout>,
    );

    expect(screen.queryByTestId('app-top-chrome')).not.toBeInTheDocument();
    expect(screen.getByTestId('mobile-nav')).toBeInTheDocument();
  });

  it('hides all navigation when hideNav is set', () => {
    mockDesktop(true);
    render(
      <AppLayout hideNav>
        <div>content</div>
      </AppLayout>,
    );

    expect(screen.queryByTestId('mobile-nav')).not.toBeInTheDocument();
    expect(screen.queryByTestId('app-side-nav')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nav-secondary-desktop')).not.toBeInTheDocument();
  });
});
