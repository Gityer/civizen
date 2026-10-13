/** Owner targets for 2026-12-22 (decision E7). */
export const PARTICIPATION_TARGETS = {
  members: 200,
  countries: 10,
  ballotsCountable: 50,
  publicMattersByMembers: 20,
  verificationHours: 48,
  oldestReportHours: 24,
} as const;

export type ParticipationFunnel = {
  days: number;
  totals: {
    members: number; countries: number; signups: number; confirmed: number; active7d: number; active30d: number;
    returnedAfterSignup: number; signedUpOver7dAgo: number; tookFirstAction: number; verificationRequested: number;
    verified: number; verificationMedianHours: number | null; ballotsAdvisory: number; ballotsCountable: number;
    publicMattersByMembers: number; openReports: number; oldestOpenReportHours: number | null;
  };
  daily: Array<{ day: string; pageViews: number; signups: number; ballots: number; matters: number; posts: number }>;
  topPages: Array<{ path: string; views: number }>;
};

const num = (value: unknown): number => (typeof value === 'number' ? value : Number(value ?? 0) || 0);
const numOrNull = (value: unknown): number | null => (value === null || value === undefined ? null : num(value));

/** Maps participation_funnel() (snake_case jsonb) to the page's shape. */
export function mapParticipationFunnel(data: unknown): ParticipationFunnel | null {
  if (!data || typeof data !== 'object') return null;
  const row = data as Record<string, unknown>;
  const t = (row.totals ?? {}) as Record<string, unknown>;
  const daily = Array.isArray(row.daily) ? (row.daily as Record<string, unknown>[]) : [];
  const top = Array.isArray(row.top_pages) ? (row.top_pages as Record<string, unknown>[]) : [];
  return {
    days: num(row.days),
    totals: {
      members: num(t.members), countries: num(t.countries), signups: num(t.signups), confirmed: num(t.confirmed),
      active7d: num(t.active_7d), active30d: num(t.active_30d), returnedAfterSignup: num(t.returned_after_signup),
      signedUpOver7dAgo: num(t.signed_up_over_7d_ago), tookFirstAction: num(t.took_first_action),
      verificationRequested: num(t.verification_requested), verified: num(t.verified),
      verificationMedianHours: numOrNull(t.verification_median_hours), ballotsAdvisory: num(t.ballots_advisory),
      ballotsCountable: num(t.ballots_countable), publicMattersByMembers: num(t.public_matters_by_members),
      openReports: num(t.open_reports), oldestOpenReportHours: numOrNull(t.oldest_open_report_hours),
    },
    daily: daily.map((d) => ({
      day: String(d.day ?? ''), pageViews: num(d.page_views), signups: num(d.signups), ballots: num(d.ballots), matters: num(d.matters), posts: num(d.posts),
    })),
    topPages: top.map((p) => ({ path: String(p.path ?? ''), views: num(p.views) })),
  };
}
