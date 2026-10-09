import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/integrations/supabase/client-type', () => ({ supabase: {} }));

import { civicEventsFromRows } from './civizen-contributions-civic-sources';

describe('civic contribution sources', () => {
  it('turns Matters and knowledge resources into ledger events', () => {
    const events = civicEventsFromRows(
      'me',
      [{ id: 'm1', title: 'Shade at bus stops', description: 'No shade.', visibility: 'public', lifecycle_status: 'open', created_at: '2026-10-01T00:00:00Z' }],
      [{ id: 'r1', title: 'Guide', summary: 'How to', status: 'published', proposed_by_profile_id: 'me', created_at: '2026-10-02T00:00:00Z' }],
    );
    expect(events.map((e) => [e.eventType, e.sourceTable, e.sourceId, e.verified])).toEqual([
      ['matter_raised', 'matters', 'm1', true],
      ['knowledge_resource', 'knowledge_resources', 'r1', true],
    ]);
    expect(events[0].title).toBe('Shade at bus stops');
    expect(events[1].rawMeta.proposed).toBe(true);
    expect(events.every((e) => e.profileId === 'me' && e.capacityEstimate > 0)).toBe(true);
  });
});
