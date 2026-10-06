import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import Messaging from '@/pages/Messaging';

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({
    children,
    hideTopChrome,
  }: {
    children: React.ReactNode;
    hideTopChrome?: boolean;
  }) => (
    <div data-testid="app-layout" data-hide-top-chrome={hideTopChrome ? 'true' : 'false'}>
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/chat-bar', () => ({
  ChatBar: () => (
    <div data-testid="chat-bar">
      <button type="button" aria-label="Search chats">
        Search
      </button>
      <div data-testid="messaging-page-profile" />
    </div>
  ),
}));

describe('Messaging', () => {
  it('hides app-wide top chrome so page Search and Profile are not duplicated', async () => {
    render(
      <MemoryRouter initialEntries={['/messaging']}>
        <Routes>
          <Route path="/messaging" element={<Messaging />} />
          <Route path="/messaging/:conversationId" element={<Messaging />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('app-layout')).toHaveAttribute('data-hide-top-chrome', 'true');
    expect(await screen.findByTestId('chat-bar')).toBeInTheDocument();
    expect(screen.getByLabelText('Search chats')).toBeInTheDocument();
    expect(screen.getByTestId('messaging-page-profile')).toBeInTheDocument();
  });
});
