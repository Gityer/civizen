import type { AgreementListItem } from '@/lib/agreements-api';

/** Party roles in which the member provides work, goods or property (counts as earning activity). */
export const PROVIDING_ROLES = new Set([
  'employee', 'seller', 'lessor', 'contractor', 'provider', 'service_provider', 'consultant', 'contributor', 'volunteer', 'freelancer', 'supplier',
]);

export type EarningsFilter = 'all' | 'providing' | 'active' | 'awaiting' | 'completed';
export const EARNINGS_FILTERS: EarningsFilter[] = ['all', 'providing', 'active', 'awaiting', 'completed'];

export type EarningsSummary = { providing: number; active: number; awaiting: number; completed: number };

const normalizeRole = (role: string | null | undefined): string => (role ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');

/** True when the member is a party in a providing role. Parties without a recorded role do not count. */
export function providesInAgreement(row: Pick<AgreementListItem, 'parties'>, profileId: string): boolean {
  return row.parties.some((party) => party.profileId === profileId && PROVIDING_ROLES.has(normalizeRole(party.roleInAgreement)));
}

export type EarningsStage = 'active' | 'awaiting' | 'completed' | 'other';

export function earningsStage(row: Pick<AgreementListItem, 'bucket'>): EarningsStage {
  switch (row.bucket) {
    case 'active': return 'active';
    case 'needs_action':
    case 'awaiting_signatures':
    case 'in_review': return 'awaiting';
    case 'completed': return 'completed';
    default: return 'other';
  }
}

export function summarizeEarnings(rows: AgreementListItem[], profileId: string): EarningsSummary {
  const summary: EarningsSummary = { providing: 0, active: 0, awaiting: 0, completed: 0 };
  for (const row of rows) {
    const stage = earningsStage(row);
    if (stage === 'active' || stage === 'completed') {
      if (providesInAgreement(row, profileId)) summary.providing += 1;
    }
    if (stage !== 'other') summary[stage] += 1;
  }
  return summary;
}

export function filterEarningsRows(rows: AgreementListItem[], filter: EarningsFilter, profileId: string): AgreementListItem[] {
  if (filter === 'all') return rows;
  if (filter === 'providing') return rows.filter((row) => providesInAgreement(row, profileId) && earningsStage(row) !== 'other');
  return rows.filter((row) => earningsStage(row) === filter);
}

export function earningsActivityDate(row: Pick<AgreementListItem, 'effectiveAt' | 'createdAt'>): string {
  return row.effectiveAt || row.createdAt;
}

/** The other parties' names, for the row subtitle. */
export function counterpartyNames(row: Pick<AgreementListItem, 'parties'>, profileId: string): string[] {
  return row.parties.filter((party) => party.profileId !== profileId).map((party) => party.displayName).filter(Boolean);
}
