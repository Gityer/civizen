import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { settingsItems } from '@/pages/settings-items';
import { HelpSupportLinks } from './HelpSupport';
import { HELP_SUPPORT_LINKS } from './help-support-links';

describe('HelpSupport', () => {
  it('lists every help destination and opens the chosen one', () => {
    const onOpen = vi.fn();
    render(<HelpSupportLinks t={(key) => key} onOpen={onOpen} />);
    for (const link of HELP_SUPPORT_LINKS) {
      expect(screen.getByText(link.labelKey)).toBeTruthy();
    }
    fireEvent.click(screen.getByText('settings.helpCivi'));
    expect(onOpen).toHaveBeenCalledWith('/messaging');
  });

  it('keeps the Settings list free of rows that have no page', () => {
    const paths = settingsItems.map((item) => item.path);
    expect(paths).toContain('/settings/help');
    expect(paths).not.toContain('/settings/notifications');
    expect(paths).toContain('/notifications');
    expect(paths).not.toContain('/settings/safety');
  });
});
