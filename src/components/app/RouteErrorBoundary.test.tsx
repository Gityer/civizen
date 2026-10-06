import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { RouteErrorBoundary } from '@/components/app/RouteErrorBoundary';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

let shouldThrow = true;
function Flaky() {
  if (shouldThrow) throw new Error('boom');
  return <p>page ok</p>;
}

describe('RouteErrorBoundary', () => {
  it('shows the page error in place and recovers on retry', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <MemoryRouter>
        <RouteErrorBoundary>
          <Flaky />
        </RouteErrorBoundary>
      </MemoryRouter>,
    );
    expect(screen.getByRole('alert').textContent).toContain('settings.routeError.title');
    shouldThrow = false;
    fireEvent.click(screen.getByText('settings.routeError.retry'));
    expect(screen.getByText('page ok')).toBeTruthy();
  });
});
