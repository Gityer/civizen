import currentLegalStatus from '../../docs/02-policies/institutional/current-legal-status-notice.md?raw';
import institutionalIdentity from '../../docs/02-policies/institutional/institutional-identity-and-relationship.md?raw';
import missionIndependence from '../../docs/02-policies/institutional/mission-and-independence-charter.md?raw';
import missionIndependenceHy from '../../docs/02-policies/institutional/mission-and-independence-charter.hy.md?raw';
import missionIndependenceRu from '../../docs/02-policies/institutional/mission-and-independence-charter.ru.md?raw';
import governanceOversight from '../../docs/02-policies/institutional/governance-and-human-oversight.md?raw';
import fundingIntegrity from '../../docs/02-policies/institutional/funding-and-financial-integrity.md?raw';
import investorNotice from '../../docs/02-policies/institutional/investor-interest-non-offering-notice.md?raw';
import contributorPolicy from '../../docs/02-policies/institutional/contributor-participation-and-recognition.md?raw';
import openSourceIp from '../../docs/02-policies/institutional/open-source-ip-brand-stewardship.md?raw';
import transparencyStandard from '../../docs/02-policies/institutional/transparency-and-accountability-standard.md?raw';
import partnerships from '../../docs/02-policies/institutional/international-partnerships-and-chapters.md?raw';
import worldCitizenship from '../../docs/02-policies/institutional/world-citizenship-and-civic-status-notice.md?raw';
import planetaryCitizenshipPathway from '../../docs/00-foundation/recognized-planetary-citizenship-pathway.md?raw';
import planetaryCitizenshipPathwayHy from '../../docs/00-foundation/recognized-planetary-citizenship-pathway.hy.md?raw';
import planetaryCitizenshipPathwayRu from '../../docs/00-foundation/recognized-planetary-citizenship-pathway.ru.md?raw';
import aiAuthority from '../../docs/02-policies/institutional/ai-advisory-and-human-authority.md?raw';
import communityCharter from '../../docs/02-policies/governance/civizen-community-governance-charter.md?raw';

export type InstitutionalDocSection =
  | 'about'
  | 'mission'
  | 'legal'
  | 'governance'
  | 'funding'
  | 'contributor'
  | 'openSource'
  | 'transparency'
  | 'partners'
  | 'worldCitizenship'
  | 'ai'
  | 'communityGovernance';

export type InstitutionalDoc = {
  id: string;
  path: string;
  title: string;
  version: string;
  reviewStatus: string;
  section: InstitutionalDocSection;
  markdown: string;
  publicationDate?: string;
  effectiveDate?: string;
  lastUpdated?: string;
  professionalReviewRequired: boolean;
  supersededBy?: string;
  archivedDate?: string;
  /** Hand-written translations of the body, keyed by primary language subtag; English stays the reference text. */
  translations?: Partial<Record<TranslatedDocLanguage, { title: string; markdown: string }>>;
};

export type TranslatedDocLanguage = 'hy' | 'ru';

function stripFrontMatter(raw: string): { meta: Record<string, string>; body: string } {
  if (!raw.startsWith('---\n')) {
    return { meta: {}, body: raw };
  }
  const end = raw.indexOf('\n---\n', 4);
  if (end < 0) {
    return { meta: {}, body: raw };
  }
  const yaml = raw.slice(4, end);
  const body = raw.slice(end + 5).trimStart();
  const meta: Record<string, string> = {};
  for (const line of yaml.split('\n')) {
    const match = line.match(/^([a-zA-Z0-9_]+):\s*(.+)$/);
    if (match) {
      meta[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
    }
  }
  return { meta, body };
}

function parseYesTrue(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'yes' || normalized === 'true' || normalized === '1';
}

function optionalMeta(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function docFrom(
  id: string,
  path: string,
  section: InstitutionalDocSection,
  raw: string,
  fallbackTitle: string,
  translatedRaw?: Partial<Record<TranslatedDocLanguage, string>>,
): InstitutionalDoc {
  const { meta, body } = stripFrontMatter(raw);
  const translations = translatedRaw
    ? Object.fromEntries(
        Object.entries(translatedRaw).map(([language, text]) => {
          const parsed = stripFrontMatter(text);
          return [language, { title: parsed.meta.title || meta.title || fallbackTitle, markdown: parsed.body }];
        }),
      )
    : undefined;
  return {
    translations,
    id,
    path,
    title: meta.title || fallbackTitle,
    version: meta.version || '1.0',
    reviewStatus: meta.review_status || 'interim',
    section,
    markdown: body,
    publicationDate: optionalMeta(meta.publication_date),
    effectiveDate: optionalMeta(meta.effective_date),
    lastUpdated: optionalMeta(meta.last_updated),
    professionalReviewRequired: parseYesTrue(meta.professional_review_required),
    supersededBy: optionalMeta(meta.superseded_by),
    archivedDate: optionalMeta(meta.archived_date),
  };
}

export const INSTITUTIONAL_DOCS: InstitutionalDoc[] = [
  docFrom('institutional-identity', '/about', 'about', institutionalIdentity, 'Mature Humanity and Civizen'),
  docFrom('mission', '/about/mission', 'mission', missionIndependence, 'Mission and Independence Charter', { hy: missionIndependenceHy, ru: missionIndependenceRu }),
  docFrom('legal-status', '/about/legal-status', 'legal', currentLegalStatus, 'Current Legal Status'),
  docFrom('open-source', '/about/open-source', 'openSource', openSourceIp, 'Open Source, Intellectual Property, and Brand Stewardship'),
  docFrom('ai', '/about/ai', 'ai', aiAuthority, 'AI Advisory and Human Authority'),
  docFrom('world-citizenship', '/about/world-citizenship', 'worldCitizenship', worldCitizenship, 'World Citizenship: Present Status and Long-Term Aim'),
  docFrom(
    'planetary-citizenship-pathway',
    '/about/planetary-citizenship-pathway',
    'worldCitizenship',
    planetaryCitizenshipPathway,
    'From Voluntary World Citizenship to Recognized Planetary Citizenship',
    { hy: planetaryCitizenshipPathwayHy, ru: planetaryCitizenshipPathwayRu },
  ),
  docFrom('governance-about', '/governance/about', 'governance', governanceOversight, 'Governance and Human Oversight'),
  docFrom('governance-charter', '/governance/charter', 'communityGovernance', communityCharter, 'Civizen Community Governance Charter'),
  docFrom(
    'funding-integrity',
    '/documents/funding-and-financial-integrity',
    'funding',
    fundingIntegrity,
    'Funding and Financial Integrity',
  ),
  docFrom(
    'investor-notice',
    '/documents/investor-interest-non-offering',
    'funding',
    investorNotice,
    'Investor Interest and Non-Offering Notice',
  ),
  docFrom('contributor-policy', '/contribute/policy', 'contributor', contributorPolicy, 'Contributor Participation and Recognition Policy'),
  docFrom('transparency', '/transparency', 'transparency', transparencyStandard, 'Transparency and Accountability Standard'),
  docFrom('partners', '/partners', 'partners', partnerships, 'International Partnerships and Chapters'),
];

export const DOCUMENTS_INDEX_SECTIONS: InstitutionalDocSection[] = [
  'about',
  'mission',
  'legal',
  'governance',
  'funding',
  'contributor',
  'openSource',
  'transparency',
  'partners',
  'worldCitizenship',
  'ai',
  'communityGovernance',
];

export function getInstitutionalDocByPath(pathname: string): InstitutionalDoc | undefined {
  const normalized = pathname.replace(/\/$/, '') || '/';
  return INSTITUTIONAL_DOCS.find((doc) => doc.path === normalized);
}

/** The body to show for a language: the hand-written translation when one exists, otherwise the English reference. */
export function docTextFor(doc: InstitutionalDoc, language: string): { title: string; markdown: string; translated: boolean } {
  const primary = language.toLowerCase().split(/[-_]/)[0] as TranslatedDocLanguage;
  const translation = doc.translations?.[primary];
  if (translation) return { title: translation.title, markdown: translation.markdown, translated: true };
  return { title: doc.title, markdown: doc.markdown, translated: false };
}

export function docsForSection(section: InstitutionalDocSection): InstitutionalDoc[] {
  return INSTITUTIONAL_DOCS.filter((doc) => doc.section === section);
}
