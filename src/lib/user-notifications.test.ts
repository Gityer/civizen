import { describe, expect, it } from 'vitest';

import { countUnread, notificationLink, notificationTitle, toUserNotification } from './user-notifications';

describe('notificationLink', () => {
  it('links agreements and matters to their pages', () => {
    expect(notificationLink({ entityType: 'agreement', entityId: 'a1' })).toBe('/agreements/a1');
    expect(notificationLink({ entityType: 'matter', entityId: 'm1' })).toBe('/contribute/matters/m1');
  });

  it('falls back to list pages when there is no id', () => {
    expect(notificationLink({ entityType: 'agreement', entityId: null })).toBe('/agreements');
  });

  it('sends post notifications to the feed and unknown types nowhere', () => {
    expect(notificationLink({ entityType: 'post', entityId: 'p1' })).toBe('/');
    expect(notificationLink({ entityType: 'something_new', entityId: 'x' })).toBeNull();
    expect(notificationLink({ entityType: null, entityId: null })).toBeNull();
  });

  it('opens conversations, the profile and proposals', () => {
    expect(notificationLink({ entityType: 'conversation', entityId: 'c1' })).toBe('/messaging/c1');
    expect(notificationLink({ entityType: 'profile', entityId: 'p1' })).toBe('/profile');
    expect(notificationLink({ entityType: 'governance_proposal', entityId: 'g1' })).toBe('/governance/voting/proposals/g1');
  });
});

describe('notificationTitle', () => {
  const t = (key: string, vars?: Record<string, string | number>) => `${key}:${vars?.name ?? ''}`;

  it('translates known types that name who acted', () => {
    expect(notificationTitle({ notificationType: 'endorsement_received', title: 'Ana endorsed you', actorName: 'Ana' }, t))
      .toBe('settings.notificationText.endorsement:Ana');
  });

  it('keeps the stored title otherwise', () => {
    expect(notificationTitle({ notificationType: 'post_repost', title: 'Ana reposted', actorName: 'Ana' }, t)).toBe('Ana reposted');
    expect(notificationTitle({ notificationType: 'post_comment', title: 'Someone commented', actorName: null }, t)).toBe('Someone commented');
  });
});

describe('countUnread', () => {
  it('counts rows without read_at', () => {
    expect(countUnread([{ readAt: null }, { readAt: '2026-10-06T00:00:00Z' }, { readAt: null }])).toBe(2);
  });
});

describe('toUserNotification', () => {
  it('maps database columns', () => {
    expect(
      toUserNotification({
        id: 'n1',
        recipient_profile_id: 'p1',
        notification_type: 'post_repost',
        title: 'Ana reposted your post',
        body: null,
        entity_type: 'post',
        entity_id: 'post1',
        read_at: null,
        metadata: {},
        created_at: '2026-10-06T00:00:00Z',
      }),
    ).toEqual({
      id: 'n1',
      notificationType: 'post_repost',
      title: 'Ana reposted your post',
      body: null,
      entityType: 'post',
      entityId: 'post1',
      readAt: null,
      createdAt: '2026-10-06T00:00:00Z',
      actorName: null,
    });
  });
});
