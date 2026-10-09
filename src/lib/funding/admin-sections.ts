/** Funding admin sections. Budget remains the default landing section; the legacy capital-ledger tools are retired (Phase 6 step 6.4). */
export const FUNDING_ADMIN_SECTIONS = [
  'budget',
  'program-plan',
  'economics',
  'overview',
  'sources',
  'interest',
] as const;

/** Kept as an alias so callers that distinguished primary sections keep compiling. */
export const FUNDING_ADMIN_PRIMARY_SECTIONS = FUNDING_ADMIN_SECTIONS;

export type FundingAdminSection = (typeof FUNDING_ADMIN_SECTIONS)[number];
export type FundingAdminPrimarySection = FundingAdminSection;

/** Default landing remains Budget (not Overview). */
export const FUNDING_ADMIN_DEFAULT_SECTION: FundingAdminSection = 'budget';

export const FUNDING_ADMIN_BASE_PATH = '/settings/admin/funding';

/** Source detail progressive-disclosure panels (one task family at a time). */
export const FUNDING_SOURCE_WORK_PANELS = [
  'outreach',
  'commitments',
  'receipts',
  'allocations',
  'fees',
] as const;

export type FundingSourceWorkPanel = (typeof FUNDING_SOURCE_WORK_PANELS)[number];

export const FUNDING_SOURCE_WORK_PANEL_DEFAULT: FundingSourceWorkPanel = 'outreach';

/** Old deep links; the retired ledger, audit, compliance and contributors paths land on Sources. */
const LEGACY_PATH_TO_SECTION: Record<string, FundingAdminSection> = {
  '/settings/admin/funding-interest': 'interest',
  '/settings/admin/funding-ledger': 'sources',
  '/settings/admin/funding-audit': 'sources',
  '/settings/admin/funding-compliance': 'sources',
  '/settings/admin/funding-contributors': 'sources',
};

export function isFundingAdminSection(value: string | null | undefined): value is FundingAdminSection {
  return FUNDING_ADMIN_SECTIONS.includes(value as FundingAdminSection);
}

export function isFundingSourceWorkPanel(value: string | null | undefined): value is FundingSourceWorkPanel {
  return FUNDING_SOURCE_WORK_PANELS.includes(value as FundingSourceWorkPanel);
}

export function fundingAdminPath(section: FundingAdminSection = FUNDING_ADMIN_DEFAULT_SECTION): string {
  const params = new URLSearchParams();
  if (section !== FUNDING_ADMIN_DEFAULT_SECTION) params.set('section', section);
  const qs = params.toString();
  return qs ? `${FUNDING_ADMIN_BASE_PATH}?${qs}` : FUNDING_ADMIN_BASE_PATH;
}

export function parseFundingAdminSection(value: string | null | undefined): FundingAdminSection {
  return isFundingAdminSection(value) ? value : FUNDING_ADMIN_DEFAULT_SECTION;
}

export function parseFundingSourceWorkPanel(value: string | null | undefined): FundingSourceWorkPanel {
  return isFundingSourceWorkPanel(value) ? value : FUNDING_SOURCE_WORK_PANEL_DEFAULT;
}

/** Resolve the visible section; an unknown or retired section name falls back to Budget. */
export function resolveFundingAdminSection(args: { sectionParam: string | null | undefined }): { section: FundingAdminSection; redirected: boolean } {
  const requested = args.sectionParam ?? '';
  if (isFundingAdminSection(requested)) return { section: requested, redirected: false };
  return { section: FUNDING_ADMIN_DEFAULT_SECTION, redirected: requested !== '' };
}

export function fundingAdminSectionFromLegacyPath(pathname: string): FundingAdminSection | null {
  return LEGACY_PATH_TO_SECTION[pathname] ?? null;
}

export function visibleFundingAdminSections(): FundingAdminSection[] {
  return [...FUNDING_ADMIN_SECTIONS];
}
