import { describe, expect, it } from 'vitest';

import { EMPTY_AREA_ACTIVITY, hasAreaActivity, mapAreaActivity } from './area-activity';

describe('area activity', () => {
  it('maps the server payload', () => {
    const activity = mapAreaActivity({
      programs: [{ id: 'p1', title: 'Program', summary: null, status: 'active' }],
      challenges: [{ id: 'c1', title: 'Challenge', problem_statement: 'Shade', status: 'implementation' }],
      matters: [{ id: 'm1', title: 'Matter', matter_type: 'suggestion', lifecycle_status: 'active', updated_at: '2026-10-09T00:00:00Z' }],
    });
    expect(activity.programs[0]).toEqual({ id: 'p1', title: 'Program', summary: null, status: 'active' });
    expect(activity.challenges[0].problemStatement).toBe('Shade');
    expect(activity.matters[0]).toMatchObject({ matterType: 'suggestion', lifecycleStatus: 'active' });
    expect(hasAreaActivity(activity)).toBe(true);
  });

  it('is empty for junk and says so', () => {
    expect(mapAreaActivity(null)).toEqual(EMPTY_AREA_ACTIVITY);
    expect(mapAreaActivity({ programs: 'x', challenges: [null], matters: undefined })).toEqual(EMPTY_AREA_ACTIVITY);
    expect(hasAreaActivity(EMPTY_AREA_ACTIVITY)).toBe(false);
  });
});
