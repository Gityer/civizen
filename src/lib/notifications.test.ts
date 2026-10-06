import { describe, expect, it } from 'vitest';

import { notificationRoute } from './notifications';

describe('notificationRoute', () => {
  it('opens the ballot for consultation notifications', () => {
    expect(notificationRoute({ entityType: 'civic_election', entityId: 'e1', metadata: {} })).toBe('/governance/voting/e1');
  });

  it('opens the Matter, proposal and agreement pages', () => {
    expect(notificationRoute({ entityType: 'matter', entityId: 'm1', metadata: {} })).toBe('/contribute/matters/m1');
    expect(notificationRoute({ entityType: 'civic_voting_proposal', entityId: 'p1', metadata: {} })).toBe('/governance/voting/proposals/p1');
    expect(notificationRoute({ entityType: 'agreement', entityId: 'a1', metadata: {} })).toBe('/agreements/a1');
  });

  it('has no destination for unknown entity types', () => {
    expect(notificationRoute({ entityType: 'something_else', entityId: 'x', metadata: {} })).toBeNull();
  });
});
