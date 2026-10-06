export type StudyDomainId =
  | 'constitution'
  | 'laws'
  | 'rights'
  | 'economy'
  | 'aiEthics'
  | 'citizenship'
  | 'environment'
  | 'cultureEducation'
  | 'judicial'
  | 'proposals';

export type StudyDocument = {
  key: string;
  domainId: StudyDomainId;
  titleKey: string;
  summaryKey: string;
  keywords: string[];
  availableNow: boolean;
  route?: string;
  estimatedMinutes: number;
};

export type StudyCertificationStatus = 'pending' | 'eligible' | 'earned';
export type StudyMaterialType = 'constitution' | 'summary' | 'legalText' | 'guide';

export type StudyMaterial = {
  key: string;
  domainId: StudyDomainId;
  titleKey: string;
  summaryKey: string;
  materialType: StudyMaterialType;
  route: string;
  availableNow: boolean;
};

export const FOUNDATION_STUDY_DOCUMENT_KEYS = [
  'constitution',
  'laws',
  'citizenship',
  'economy',
] as const;

export const STUDY_DOCUMENTS: StudyDocument[] = [
  {
    key: 'constitution',
    domainId: 'constitution',
    titleKey: 'study.domains.constitution.title',
    summaryKey: 'study.domains.constitution.description',
    keywords: ['constitution', 'charter', 'foundations', 'civic principles'],
    availableNow: true,
    route: '/study?domain=constitution&material=constitution-core',
    estimatedMinutes: 18,
  },
  {
    key: 'laws',
    domainId: 'laws',
    titleKey: 'study.domains.laws.title',
    summaryKey: 'study.domains.laws.description',
    keywords: ['law', 'governance', 'policy', 'legal framework'],
    availableNow: true,
    route: '/law',
    estimatedMinutes: 20,
  },
  {
    key: 'citizenship',
    domainId: 'citizenship',
    titleKey: 'study.domains.citizenship.title',
    summaryKey: 'study.domains.citizenship.description',
    keywords: ['citizenship', 'participation', 'levels', 'civic'],
    availableNow: true,
    route: '/terms',
    estimatedMinutes: 15,
  },
  {
    key: 'economy',
    domainId: 'economy',
    titleKey: 'study.domains.economy.title',
    summaryKey: 'study.domains.economy.description',
    keywords: ['economy', 'luma', 'monetary', 'issuance', 'stability'],
    availableNow: true,
    route: '/study?domain=economy',
    estimatedMinutes: 16,
  },
  {
    key: 'rights',
    domainId: 'rights',
    titleKey: 'study.domains.rights.title',
    summaryKey: 'study.domains.rights.description',
    keywords: ['rights', 'responsibilities', 'duties'],
    availableNow: false,
    estimatedMinutes: 14,
  },
  {
    key: 'aiEthics',
    domainId: 'aiEthics',
    titleKey: 'study.domains.aiEthics.title',
    summaryKey: 'study.domains.aiEthics.description',
    keywords: ['ai', 'ethics', 'oversight', 'transparency'],
    availableNow: false,
    estimatedMinutes: 12,
  },
  {
    key: 'environment',
    domainId: 'environment',
    titleKey: 'study.domains.environment.title',
    summaryKey: 'study.domains.environment.description',
    keywords: ['environment', 'stewardship', 'sustainability'],
    availableNow: false,
    estimatedMinutes: 12,
  },
  {
    key: 'cultureEducation',
    domainId: 'cultureEducation',
    titleKey: 'study.domains.cultureEducation.title',
    summaryKey: 'study.domains.cultureEducation.description',
    keywords: ['culture', 'education', 'knowledge', 'development'],
    availableNow: false,
    estimatedMinutes: 13,
  },
  {
    key: 'judicial',
    domainId: 'judicial',
    titleKey: 'study.domains.judicial.title',
    summaryKey: 'study.domains.judicial.description',
    keywords: ['judicial', 'justice', 'dispute', 'resolution'],
    availableNow: false,
    estimatedMinutes: 14,
  },
  {
    key: 'proposals',
    domainId: 'proposals',
    titleKey: 'study.domains.proposals.title',
    summaryKey: 'study.domains.proposals.description',
    keywords: ['proposals', 'archive', 'votes', 'review'],
    availableNow: true,
    route: '/governance',
    estimatedMinutes: 10,
  },
];

export const FOUNDATION_STUDY_MATERIALS: StudyMaterial[] = [
  {
    key: 'constitution-core',
    domainId: 'constitution',
    titleKey: 'study.materials.constitutionCore.title',
    summaryKey: 'study.materials.constitutionCore.summary',
    materialType: 'constitution',
    route: '/study?domain=constitution&material=constitution-core',
    availableNow: true,
  },
  {
    key: 'constitution-summary',
    domainId: 'constitution',
    titleKey: 'study.materials.constitutionSummary.title',
    summaryKey: 'study.materials.constitutionSummary.summary',
    materialType: 'summary',
    route: '/study?domain=constitution&material=constitution-summary',
    availableNow: true,
  },
  {
    key: 'law-framework',
    domainId: 'laws',
    titleKey: 'study.materials.lawFramework.title',
    summaryKey: 'study.materials.lawFramework.summary',
    materialType: 'legalText',
    route: '/law',
    availableNow: true,
  },
  {
    key: 'law-citizen-guide',
    domainId: 'laws',
    titleKey: 'study.materials.lawCitizenGuide.title',
    summaryKey: 'study.materials.lawCitizenGuide.summary',
    materialType: 'guide',
    route: '/law',
    availableNow: true,
  },
  {
    key: 'citizenship-pathways',
    domainId: 'citizenship',
    titleKey: 'study.materials.citizenshipPathways.title',
    summaryKey: 'study.materials.citizenshipPathways.summary',
    materialType: 'guide',
    route: '/terms',
    availableNow: true,
  },
  {
    key: 'citizenship-rights-summary',
    domainId: 'citizenship',
    titleKey: 'study.materials.citizenshipRightsSummary.title',
    summaryKey: 'study.materials.citizenshipRightsSummary.summary',
    materialType: 'summary',
    route: '/terms',
    availableNow: true,
  },
  {
    key: 'economy-policy-baseline',
    domainId: 'economy',
    titleKey: 'study.materials.economyPolicyBaseline.title',
    summaryKey: 'study.materials.economyPolicyBaseline.summary',
    materialType: 'legalText',
    route: '/study?domain=economy&material=economy-policy-baseline',
    availableNow: true,
  },
  {
    key: 'economy-citizen-guide',
    domainId: 'economy',
    titleKey: 'study.materials.economyCitizenGuide.title',
    summaryKey: 'study.materials.economyCitizenGuide.summary',
    materialType: 'guide',
    route: '/study?domain=economy',
    availableNow: true,
  },
  {
    key: 'economy-constitutional-tokenomics-governance',
    domainId: 'economy',
    titleKey: 'study.materials.economyConstitutionalTokenomicsGovernance.title',
    summaryKey: 'study.materials.economyConstitutionalTokenomicsGovernance.summary',
    materialType: 'legalText',
    route: '/study?domain=economy&material=economy-constitutional-tokenomics-governance',
    availableNow: true,
  },
];

export function createFoundationProgressMap(
  values: Partial<Record<(typeof FOUNDATION_STUDY_DOCUMENT_KEYS)[number], number>> = {},
) {
  return FOUNDATION_STUDY_DOCUMENT_KEYS.reduce<Record<string, number>>((accumulator, key) => {
    accumulator[key] = values[key] ?? 0;
    return accumulator;
  }, {});
}

export function getFoundationCompletionMetrics(progressByDocumentKey: Record<string, number>) {
  const completed = FOUNDATION_STUDY_DOCUMENT_KEYS.filter(
    (key) => (progressByDocumentKey[key] ?? 0) >= 100,
  ).length;

  const total = FOUNDATION_STUDY_DOCUMENT_KEYS.length;
  const percent = Math.round((completed / total) * 100);

  return {
    completed,
    total,
    percent,
    isComplete: completed === total,
  };
}

export function deriveFoundationCertificationStatus(
  progressByDocumentKey: Record<string, number>,
  currentStatus: StudyCertificationStatus = 'pending',
): StudyCertificationStatus {
  if (currentStatus === 'earned') return 'earned';
  return getFoundationCompletionMetrics(progressByDocumentKey).isComplete ? 'eligible' : 'pending';
}

export function filterStudyDocumentsByQuery(
  documents: StudyDocument[],
  query: string,
  resolveTitle: (document: StudyDocument) => string,
  resolveSummary: (document: StudyDocument) => string,
) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return documents;

  return documents.filter((document) => {
    const haystack = [
      resolveTitle(document),
      resolveSummary(document),
      ...document.keywords,
      document.key,
      document.domainId,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

export function buildStudyAiExplanation(args: {
  title: string;
  summary: string;
  domainLabel: string;
  estimatedMinutes: number;
}) {
  const { title, summary, domainLabel, estimatedMinutes } = args;

  return [
    `${title} belongs to the ${domainLabel} learning domain.`,
    summary,
    `Read this module in about ${estimatedMinutes} minutes, then record completion to keep your civic learning path current.`,
    'Focus on definitions, governance boundaries, and how the module connects to real participation decisions.',
  ].join(' ');
}

export function getFoundationMaterialsForDomain(domainId: StudyDomainId) {
  return FOUNDATION_STUDY_MATERIALS.filter((material) => material.domainId === domainId);
}

export function isMissingStudyBackend(error: { code?: string | null; message?: string | null; details?: string | null } | null) {
  if (!error) return false;
  const message = `${error.code || ''} ${error.message || ''} ${error.details || ''}`.toLowerCase();
  return (
    error.code === '42P01'
    || error.code === 'PGRST205'
    || message.includes('study_')
    || message.includes('monetary_policy_')
  );
}
