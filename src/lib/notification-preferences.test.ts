import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/untyped', () => ({ supabaseUntyped: {} }));

import { DEFAULT_NOTIFICATION_PREFERENCES, toNotificationPreferences } from './notification-preferences';

describe('toNotificationPreferences', () => {
  it('defaults every kind to on when there is no row', () => {
    expect(toNotificationPreferences(null)).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
  });

  it('keeps only explicit opt-outs', () => {
    expect(toNotificationPreferences({ messages: false, comments: null })).toEqual({
      messages: false,
      endorsements: true,
      comments: true,
      governance: true,
    });
  });
});
