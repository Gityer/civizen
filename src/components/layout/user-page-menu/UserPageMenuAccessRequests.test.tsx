import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UserPageMenuAccessRequests } from '@/components/layout/user-page-menu/UserPageMenuAccessRequests';
import { baseTranslations, translateMessage } from '@/lib/i18n';

const t = (key: string, vars?: Record<string, string | number>) => translateMessage(baseTranslations, key, vars);

const request = {
  id: 'req-1',
  targetProfileId: 'biz-a',
  requesterProfileId: 'p1',
  createdAt: '2026-10-07T10:00:00Z',
  requesterName: 'Ada Example',
  requesterUsername: 'ada',
  requesterAvatarUrl: null,
  businessName: 'Acme LLC',
};

describe('UserPageMenuAccessRequests', () => {
  it('renders nothing when the owner has no pending requests', () => {
    const { container } = render(
      <UserPageMenuAccessRequests requests={[]} reviewingId={null} onReview={() => {}} t={t} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('lets a business owner approve or decline a pending request', () => {
    const onReview = vi.fn();
    render(<UserPageMenuAccessRequests requests={[request]} reviewingId={null} onReview={onReview} t={t} />);

    expect(screen.getByText('Access requests')).toBeInTheDocument();
    expect(screen.getByText('Ada Example asks to manage Acme LLC')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(onReview).toHaveBeenCalledWith('req-1', 'approved');

    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
    expect(onReview).toHaveBeenCalledWith('req-1', 'rejected');
  });

  it('disables both actions while a review is in flight', () => {
    render(<UserPageMenuAccessRequests requests={[request]} reviewingId="req-1" onReview={() => {}} t={t} />);
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Decline' })).toBeDisabled();
  });
});
