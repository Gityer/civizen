import { type ComponentType } from 'react';
import { Building2, Coins, Gavel, Globe, GraduationCap, Landmark, Leaf, Scale, ShieldCheck, Sparkles } from 'lucide-react';

export type StudyDomain = {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: ComponentType<{ className?: string }>;
  availableNow: boolean;
  launchPath?: string;
};

export const studyDomains: StudyDomain[] = [
  {
    id: 'constitution',
    titleKey: 'study.domains.constitution.title',
    descriptionKey: 'study.domains.constitution.description',
    icon: Landmark,
    availableNow: true,
  },
  {
    id: 'laws',
    titleKey: 'study.domains.laws.title',
    descriptionKey: 'study.domains.laws.description',
    icon: Gavel,
    availableNow: true,
    launchPath: '/law',
  },
  {
    id: 'citizenship',
    titleKey: 'study.domains.citizenship.title',
    descriptionKey: 'study.domains.citizenship.description',
    icon: ShieldCheck,
    availableNow: true,
    launchPath: '/terms',
  },
  {
    id: 'economy',
    titleKey: 'study.domains.economy.title',
    descriptionKey: 'study.domains.economy.description',
    icon: Coins,
    availableNow: true,
    launchPath: '/study?domain=economy',
  },
  {
    id: 'aiEthics',
    titleKey: 'study.domains.aiEthics.title',
    descriptionKey: 'study.domains.aiEthics.description',
    icon: Sparkles,
    availableNow: false,
  },
  {
    id: 'rights',
    titleKey: 'study.domains.rights.title',
    descriptionKey: 'study.domains.rights.description',
    icon: Scale,
    availableNow: false,
  },
  {
    id: 'environment',
    titleKey: 'study.domains.environment.title',
    descriptionKey: 'study.domains.environment.description',
    icon: Leaf,
    availableNow: false,
  },
  {
    id: 'cultureEducation',
    titleKey: 'study.domains.cultureEducation.title',
    descriptionKey: 'study.domains.cultureEducation.description',
    icon: GraduationCap,
    availableNow: false,
  },
  {
    id: 'judicial',
    titleKey: 'study.domains.judicial.title',
    descriptionKey: 'study.domains.judicial.description',
    icon: Building2,
    availableNow: false,
  },
  {
    id: 'proposals',
    titleKey: 'study.domains.proposals.title',
    descriptionKey: 'study.domains.proposals.description',
    icon: Globe,
    availableNow: true,
    launchPath: '/governance',
  },
];
