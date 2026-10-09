import { agreementsCreatePath } from '@/lib/agreements-model';

/** Visible in-app paths Civi should speak, longest labels first for link matching. */
export const NELA_PAGE_LINKS: readonly { label: string; href: string }[] = [
  { label: 'Why Civizen Exists', href: '/why-this-exists' },
  { label: 'Community Governance Charter', href: '/governance/charter' },
  { label: 'Organization Partnership', href: '/partners' },
  { label: 'Governance Solutions', href: '/governance/solutions' },
  { label: 'Community Challenges', href: '/contribute/challenges' },
  { label: 'make a contribution', href: '/contribute' },
  { label: 'Questions, Issues & Ideas', href: '/contribute/matters' },
  { label: 'Suggest Improvements', href: '/contribute/improvements' },
  { label: 'Learning Commons', href: '/contribute/knowledge' },
  { label: 'My Contributions', href: '/contribute/impact' },
  { label: 'Financial Support', href: '/fund' },
  { label: 'Governance workspace', href: '/governance' },
  { label: 'Member workspace', href: '/governance' },
  { label: 'Help and support', href: '/settings/help' },
  { label: 'Governance page', href: '/governance' },
  { label: 'Notifications', href: '/notifications' },
  { label: 'Edit Profile', href: '/settings/profile' },
  { label: 'Civic voting', href: '/governance/voting' },
  { label: 'Opportunities', href: '/contribute/professional' },
  { label: 'Agreements', href: '/agreements' },
  { label: 'Contribute', href: '/contribute' },
  { label: 'Messaging', href: '/messaging' },
  { label: 'Governance', href: '/governance' },
  { label: 'Documents', href: '/documents' },
  { label: 'Partners', href: '/partners' },
  { label: 'Settings', href: '/settings' },
  { label: 'Profile', href: '/profile' },
  { label: 'Jobs', href: '/jobs' },
  { label: 'Market', href: '/market' },
  { label: 'Study', href: '/study' },
  { label: 'signing up', href: '/signup' },
  { label: 'Sign up', href: '/signup' },
  { label: 'Areas', href: '/areas' },
  { label: 'Home', href: '/' },
];

/** Selectable agreement types in Civi’s main answer → New agreement for that type. */
export const NELA_CHOICE_LINKS: readonly { label: string; href: string; listItem?: boolean }[] = [
  { label: 'Partnership / Collaboration', href: agreementsCreatePath({ agreementType: 'partnership' }) },
  { label: 'Service / Contribution', href: agreementsCreatePath({ agreementType: 'service_contribution' }) },
  { label: 'Funding / Sponsorship', href: agreementsCreatePath({ agreementType: 'funding' }) },
  { label: 'Sale / Purchase Agreement', href: agreementsCreatePath({ agreementType: 'sale_purchase' }) },
  { label: 'Employment Agreement', href: agreementsCreatePath({ agreementType: 'employment' }) },
  { label: 'General Agreement', href: agreementsCreatePath({ agreementType: 'general' }) },
  { label: 'Residential lease', href: agreementsCreatePath({ agreementType: 'lease' }) },
  { label: 'Commercial lease', href: agreementsCreatePath({ agreementType: 'lease' }) },
  { label: 'Equipment lease', href: agreementsCreatePath({ agreementType: 'lease' }) },
  { label: 'Property rental', href: agreementsCreatePath({ agreementType: 'lease' }) },
  { label: 'Vehicle lease', href: agreementsCreatePath({ agreementType: 'lease' }) },
  { label: 'Office lease', href: agreementsCreatePath({ agreementType: 'lease' }) },
  { label: 'Lease Agreement', href: agreementsCreatePath({ agreementType: 'lease' }) },
  { label: 'Car lease', href: agreementsCreatePath({ agreementType: 'lease' }) },
  { label: 'Sale / Purchase', href: agreementsCreatePath({ agreementType: 'sale_purchase' }) },
  { label: 'Confidentiality / NDA', href: agreementsCreatePath({ agreementType: 'nda' }) },
  { label: 'Data / Research', href: agreementsCreatePath({ agreementType: 'data_research' }) },
  { label: 'Memorandum of Understanding', href: agreementsCreatePath({ agreementType: 'mou' }) },
  { label: 'Employment', href: agreementsCreatePath({ agreementType: 'employment' }), listItem: true },
  { label: 'General', href: agreementsCreatePath({ agreementType: 'general' }), listItem: true },
  { label: 'Lease', href: agreementsCreatePath({ agreementType: 'lease' }), listItem: true },
];

export function nelaOpenPath(...screens: string[]): string {
  return `Open ${screens.join(' > ')}`;
}
