import { describe, expect, it } from 'vitest';
import { organisationErrorKey, parseChart, parsePositionDetail, personName } from './organisation';
import { notificationRoute } from './notifications';

describe('organisation', () => {
  it('parses the chart with holders, vacancies and open counts', () => {
    const chart = parseChart([{ unit_key: 'policy_legal', name: 'Policy and Legal Unit', description: '', domain_key: 'policy_legal', positions: [
      { position_key: 'data_protection_officer', title: 'Data Protection Officer', mandate: 'Answers for personal data.', parent_position_key: 'policy_legal_lead',
        seats: 1, contact_topic: 'privacy', open_items: 2, holders: [{ profile_id: 'p1', username: 'ani', full_name: null, kind: 'acting', since: '2026-10-28' }] },
      { position_key: 'policy_counsel', title: 'Policy Counsel', mandate: 'Prepares decisions.', holders: [], open_items: 0 },
    ] }]);
    expect(chart[0].positions[0]).toMatchObject({ contactTopic: 'privacy', openItems: 2, holders: [{ kind: 'acting', username: 'ani' }] });
    expect(chart[0].positions[1]).toMatchObject({ holders: [], seats: 1, parentPositionKey: null });
    expect(parseChart(null)).toEqual([]);
  });

  it('parses a position with its queue, contact sender and handover notes', () => {
    const detail = parsePositionDetail({
      position_key: 'member_support', title: 'Member Support Coordinator', mandate: 'Answers members.', duties: ['Answer messages'],
      vacant: false, can_work: true, can_appoint: false, is_holder: true, open_items: 1,
      terms: [{ id: 't1', profile_id: 'p1', username: 'old', kind: 'holder', started_at: '2026-01-01', ended_at: '2026-10-01', handover_note: 'See item 1' }],
      items: [{ id: 'i1', kind: 'inquiry', title: 'Contact: hi', status: 'open', priority: 'normal', created_at: '2026-10-28',
                metadata: { email: 'a@example.org', name: 'Ani', topic: 'general' } }],
      log: [{ id: 3, event: 'note', body: 'Context', created_at: '2026-10-28', actor: 'old' }],
    });
    expect(detail?.terms[0].handoverNote).toBe('See item 1');
    expect(detail?.items[0]).toMatchObject({ kind: 'inquiry', contact: { email: 'a@example.org', name: 'Ani' }, claimedBy: null });
    expect(detail?.log[0].body).toBe('Context');
    expect(parsePositionDetail(null)).toBeNull();
  });

  it('names people and maps errors', () => {
    expect(personName({ username: 'ani', fullName: null })).toBe('@ani');
    expect(personName({ username: 'ani', fullName: 'Ani K' })).toBe('Ani K');
    expect(organisationErrorKey('handover_note_required')).toBe('organisation.errors.handover_note_required');
    expect(organisationErrorKey('boom')).toBe('organisation.errors.generic');
  });

  it('routes position notifications to the position', () => {
    expect(notificationRoute({ entityType: 'org_position_item', entityId: 'i1', metadata: { position_key: 'release_manager' } })).toBe('/organisation/release_manager');
    expect(notificationRoute({ entityType: 'org_position', entityId: null, metadata: {} })).toBe('/organisation');
  });
});
