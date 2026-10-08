import { describe, expect, it } from 'vitest';

import { selectOwnedPendingAccessRequests } from '@/lib/linked-business-accounts';

const rows = [
  {
    id: 'r1',
    target_profile_id: 'biz-a',
    requester_profile_id: 'p1',
    created_at: '2026-10-07T10:00:00Z',
    requester: { id: 'p1', full_name: 'Ada Example', username: 'ada', avatar_url: null },
    target: { id: 'biz-a', full_name: 'Acme LLC', username: 'biz_acme' },
  },
  {
    id: 'r2',
    target_profile_id: 'biz-b',
    requester_profile_id: 'p2',
    created_at: '2026-10-07T11:00:00Z',
    requester: [{ id: 'p2', full_name: null, username: 'bob', avatar_url: null }],
    target: [{ id: 'biz-b', full_name: null, username: 'biz_other' }],
  },
  {
    id: 'r3',
    target_profile_id: 'biz-a',
    requester_profile_id: 'p3',
    created_at: '2026-10-07T12:00:00Z',
    requester: null,
    target: null,
  },
];

describe('selectOwnedPendingAccessRequests', () => {
  it('keeps only requests aimed at businesses the viewer owns, newest first', () => {
    const selected = selectOwnedPendingAccessRequests(rows, ['biz-a']);
    expect(selected.map((r) => r.id)).toEqual(['r3', 'r1']);
    expect(selected[1]).toMatchObject({ requesterName: 'Ada Example', requesterUsername: 'ada', businessName: 'Acme LLC' });
    expect(selected[0]).toMatchObject({ requesterName: null, businessName: null });
  });

  it('accepts PostgREST array-shaped embeds and returns nothing for non-owners', () => {
    const selected = selectOwnedPendingAccessRequests(rows, ['biz-b']);
    expect(selected).toHaveLength(1);
    expect(selected[0]).toMatchObject({ id: 'r2', requesterUsername: 'bob', businessName: 'biz_other' });
    expect(selectOwnedPendingAccessRequests(rows, [])).toEqual([]);
  });
});
