import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { ChatMessageRow, type ChatMessageRowData } from '@/components/ui/chat-message-row';
import { baseTranslations, translateMessage } from '@/lib/i18n';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, string | number>) => translateMessage(baseTranslations, key, vars),
    language: 'en',
  }),
}));

const message: ChatMessageRowData = {
  id: 'msg-1',
  content: 'How can I sign an agreement with anyone through Civizen?',
  created_at: '2026-08-13T22:02:00.000Z',
  sender_id: 'profile-armen',
  is_edited: false,
  sender: {
    id: 'profile-armen',
    username: 'armen',
    full_name: 'Armen Yeremyan',
    avatar_url: null,
  },
};

const labels = {
  openProfile: 'Open profile',
  anonymous: 'Anonymous',
  edited: 'Edited',
  retry: 'Retry',
};

function renderRow(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('ChatMessageRow selection', () => {
  it('selects the message on click without a checkbox', () => {
    const onSelect = vi.fn();

    const { rerender } = renderRow(
      <ChatMessageRow
        message={message}
        selectionMode={false}
        selected={false}
        senderInitials="AY"
        formattedTime="3:02 PM"
        labels={labels}
        onSelect={onSelect}
      />,
    );

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(message.content));
    expect(onSelect).toHaveBeenCalledWith('msg-1');

    rerender(
      <MemoryRouter>
        <ChatMessageRow
          message={message}
          selectionMode
          selected
          senderInitials="AY"
          formattedTime="3:02 PM"
          labels={labels}
          onSelect={onSelect}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByTestId('chat-message-row')).toHaveAttribute('data-selected', 'true');
    expect(screen.getByRole('option')).toHaveAttribute('aria-selected', 'true');
  });

  it('toggles selection when an already selected message is clicked', () => {
    const onSelect = vi.fn();

    renderRow(
      <ChatMessageRow
        message={message}
        selectionMode
        selected
        senderInitials="AY"
        formattedTime="3:02 PM"
        labels={labels}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByTestId('chat-message-row'));
    expect(onSelect).toHaveBeenCalledWith('msg-1');
  });

  it('wraps whole words instead of breaking mid-word', () => {
    renderRow(
      <ChatMessageRow
        message={message}
        selectionMode={false}
        selected={false}
        senderInitials="AY"
        formattedTime="3:02 PM"
        labels={labels}
        onSelect={vi.fn()}
      />,
    );

    const primary = screen.getByTestId('chat-message-primary');
    expect(primary.className).not.toContain('break-all');
    expect(primary.className).toContain('wrap-break-word');
    expect(primary.className).toContain('[word-break:normal]');
  });

  it('makes visible page trails clickable without selecting the message', () => {
    const onSelect = vi.fn();
    renderRow(
      <ChatMessageRow
        message={{ ...message, content: 'Open Market > Agreements and tap +.' }}
        selectionMode={false}
        selected={false}
        senderInitials="N"
        formattedTime="5:11 PM"
        labels={labels}
        onSelect={onSelect}
      />,
    );

    const agreements = screen.getByRole('link', { name: 'Agreements' });
    expect(agreements).toHaveAttribute('href', '/agreements');
    expect(screen.getByRole('link', { name: 'Market' })).toHaveAttribute('href', '/market');
    fireEvent.click(agreements);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('links agreement types in Civi’s main answer to New agreement', () => {
    const onSelect = vi.fn();
    renderRow(
      <ChatMessageRow
        message={{
          ...message,
          sender_id: 'a0000000-0000-4000-8000-000000000001',
          content:
            'Yes. Open Market > Agreements and tap + beside the title. Choose a type such as General, Partnership / Collaboration, Employment, Service / Contribution, Sale / Purchase, or Funding / Sponsorship.\n\nSupported types open a readable agreement document. Ordinary Marketplace purchases stay as orders and do not automatically create a Sale / Purchase Agreement.',
        }}
        selectionMode={false}
        selected={false}
        senderInitials="C"
        formattedTime="5:35 PM"
        labels={labels}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByRole('link', { name: 'General' })).toHaveAttribute('href', '/agreements/new?type=general');
    expect(screen.getByRole('link', { name: 'Partnership / Collaboration' })).toHaveAttribute(
      'href',
      '/agreements/new?type=partnership',
    );
    expect(screen.getByRole('link', { name: 'Employment' })).toHaveAttribute(
      'href',
      '/agreements/new?type=employment',
    );
    expect(screen.getByRole('link', { name: 'Service / Contribution' })).toHaveAttribute(
      'href',
      '/agreements/new?type=service_contribution',
    );
    expect(screen.getByRole('link', { name: 'Sale / Purchase' })).toHaveAttribute(
      'href',
      '/agreements/new?type=sale_purchase',
    );
    expect(screen.getByRole('link', { name: 'Funding / Sponsorship' })).toHaveAttribute(
      'href',
      '/agreements/new?type=funding',
    );
    expect(screen.queryByRole('link', { name: 'Sale / Purchase Agreement' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Partnership / Collaboration' }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows Civi extra notes smaller and dimmed', () => {
    renderRow(
      <ChatMessageRow
        message={{
          ...message,
          sender_id: 'a0000000-0000-4000-8000-000000000001',
          content:
            'Yes. Open Market > Agreements and tap + beside the title. Supported types open a readable agreement document.',
        }}
        selectionMode={false}
        selected={false}
        senderInitials="C"
        formattedTime="5:28 PM"
        labels={labels}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByTestId('chat-message-primary')).toHaveTextContent('Open Market > Agreements');
    const detail = screen.getByTestId('chat-message-detail');
    expect(detail).toHaveTextContent('Supported types open a readable agreement document.');
    expect(detail.className).toContain('text-xs');
    expect(detail.className).toContain('text-muted-foreground');
  });
});
