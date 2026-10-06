import { describe, expect, it } from 'vitest';

import { formatUnreadBadge } from '@/lib/user-notifications';

describe('formatUnreadBadge', () => {
  it('hides the badge when nothing is unread', () => {
    expect(formatUnreadBadge(0)).toBeNull();
  });

  it('shows small counts and caps large ones', () => {
    expect(formatUnreadBadge(7)).toBe('7');
    expect(formatUnreadBadge(150)).toBe('99+');
  });
});
