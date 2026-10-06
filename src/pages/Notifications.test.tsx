import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AppNotification } from '@/lib/notifications';
import { NotificationList } from './Notifications';

const row = (overrides: Partial<AppNotification>): AppNotification => ({
  id: 'n1',
  type: 'civic_consultation_published',
  title: 'A Single World Citizenship',
  body: 'A consultation you follow is open for voting.',
  entityType: 'civic_election',
  entityId: 'e1',
  readAt: null,
  createdAt: '2026-10-06T05:00:00Z',
  metadata: {},
  ...overrides,
});

describe('NotificationList', () => {
  it('shows the empty state', () => {
    render(<NotificationList t={(k) => k} language="en" rows={[]} onOpen={vi.fn()} />);
    expect(screen.getByText('notificationCenter.empty')).toBeTruthy();
  });

  it('marks unread rows and opens the chosen notification', () => {
    const onOpen = vi.fn();
    render(
      <NotificationList
        t={(k) => k}
        language="en"
        rows={[row({}), row({ id: 'n2', readAt: '2026-10-06T06:00:00Z', title: 'Older' })]}
        onOpen={onOpen}
      />,
    );
    expect(screen.getAllByTestId('notification-unread')).toHaveLength(1);
    expect(screen.getAllByTestId('notification-read')).toHaveLength(1);
    fireEvent.click(screen.getByText('A Single World Citizenship'));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'n1' }));
  });
});
