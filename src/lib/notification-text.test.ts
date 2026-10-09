import { describe, expect, it } from 'vitest';

import { describeNotification } from './notification-text';

const t = (key: string, params?: Record<string, string>) => {
  const table: Record<string, string> = {
    'notificationTypes.civic_consultation_closing_soon.title': 'Voting closes in {hours} hours: {title}',
    'notificationTypes.civic_consultation_closing_soon.body': 'Cast your ballot before the window ends.',
    'notificationTypes.agreement_signature_required.title': 'Your signature is needed: {title}',
  };
  const text = table[key];
  if (!text) return key;
  return text.replace(/\{(\w+)\}/g, (_, name) => params?.[name] ?? `{${name}}`);
};

describe('describeNotification', () => {
  it('renders known types from i18n keys with the stored parameters', () => {
    expect(
      describeNotification(
        { type: 'civic_consultation_closing_soon', title: 'Shade trees', body: 'Voting closes in 24 hours on a consultation you follow.', metadata: { title: 'Shade trees', hours: 24 } },
        t,
      ),
    ).toEqual({ title: 'Voting closes in 24 hours: Shade trees', body: 'Cast your ballot before the window ends.' });
  });

  it('uses the stored title as the parameter when older rows have no metadata', () => {
    const out = describeNotification({ type: 'agreement.signature_required', title: 'Lease', body: 'Sign now.', metadata: {} }, t);
    expect(out.title).toBe('Your signature is needed: Lease');
    expect(out.body).toBe('Sign now.');
  });

  it('falls back to the stored English text for unknown types', () => {
    expect(describeNotification({ type: 'post_repost', title: 'Someone reposted your post', body: null, metadata: {} }, t)).toEqual({
      title: 'Someone reposted your post',
      body: null,
    });
  });
});
