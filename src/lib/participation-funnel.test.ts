import { describe, expect, it } from 'vitest';

import { PARTICIPATION_TARGETS, mapParticipationFunnel } from './participation-funnel';

describe('participation funnel', () => {
  it('maps the server totals, daily rows and top pages', () => {
    const funnel = mapParticipationFunnel({
      days: 30,
      totals: { members: 31, countries: 9, ballots_countable: 4, verification_median_hours: null, oldest_open_report_hours: 2.5 },
      daily: [{ day: '2026-10-13', page_views: 12, signups: 1, ballots: 0, matters: 1, posts: 2 }],
      top_pages: [{ path: '/matters', views: 7 }],
    });
    expect(funnel?.totals.members).toBe(31);
    expect(funnel?.totals.verificationMedianHours).toBeNull();
    expect(funnel?.totals.oldestOpenReportHours).toBe(2.5);
    expect(funnel?.daily[0]).toEqual({ day: '2026-10-13', pageViews: 12, signups: 1, ballots: 0, matters: 1, posts: 2 });
    expect(funnel?.topPages).toEqual([{ path: '/matters', views: 7 }]);
    expect(mapParticipationFunnel(null)).toBeNull();
  });

  it('keeps the owner targets of decision E7', () => {
    expect(PARTICIPATION_TARGETS).toMatchObject({ members: 200, countries: 10, ballotsCountable: 50, publicMattersByMembers: 20 });
  });
});
