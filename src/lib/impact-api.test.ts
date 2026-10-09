import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

import { mapMyKnowledgeResource } from './impact-api';

describe('impact api', () => {
  it('marks resources the member proposed but did not publish', () => {
    const proposed = mapMyKnowledgeResource({ id: 'r1', space_id: 's1', title: 'Guide', status: 'published', publisher_profile_id: 'org', proposed_by_profile_id: 'me' }, 'me');
    expect(proposed).toEqual({ id: 'r1', spaceId: 's1', title: 'Guide', status: 'published', proposed: true });
    const own = mapMyKnowledgeResource({ id: 'r2', space_id: 's1', title: 'Own', status: null, publisher_profile_id: 'me', proposed_by_profile_id: null }, 'me');
    expect(own.proposed).toBe(false);
    expect(own.status).toBe('draft');
  });
});
