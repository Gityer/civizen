import {
  ChevronRight,
  ExternalLink,
  FileText,
  GitBranch,
  Globe2,
  HandCoins,
  Landmark,
  Layers,
  Leaf,
  Scale,
  Store,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { useLanguage } from '@/contexts/LanguageContext';
import {
  onboardingGroupClass,
  onboardingRowClass,
  onboardingSectionLeadClass,
  onboardingSectionTitleClass,
} from '@/components/public/onboarding-styles';
import {
  CIVIZEN_CHARTER_URL,
  CIVIZEN_GOVERNANCE_DOCS_URL,
  CIVIZEN_REPO_URL,
} from '@/lib/onboarding-links';
import { cn } from '@/lib/utils';

const systemLayers = [
  {
    icon: UserRound,
    titleKey: 'onboarding.systemMapIdentity',
    descriptionKey: 'onboarding.systemMapIdentityDescription',
    tone: 'bg-primary/12 text-primary',
  },
  {
    icon: Landmark,
    titleKey: 'onboarding.systemMapGovernance',
    descriptionKey: 'onboarding.systemMapGovernanceDescription',
    tone: 'bg-pillar-culture text-white',
    href: '/governance',
  },
  {
    icon: Store,
    titleKey: 'onboarding.systemMapEconomy',
    descriptionKey: 'onboarding.systemMapEconomyDescription',
    tone: 'bg-pillar-economy text-white',
  },
  {
    icon: Leaf,
    titleKey: 'onboarding.systemMapStewardship',
    descriptionKey: 'onboarding.systemMapStewardshipDescription',
    tone: 'bg-pillar-environment text-white',
  },
  {
    icon: Layers,
    titleKey: 'onboarding.systemMapStandards',
    descriptionKey: 'onboarding.systemMapStandardsDescription',
    tone: 'bg-accent text-accent-foreground',
  },
] as const;

const learnMoreLinks = [
  { icon: Globe2, labelKey: 'onboarding.learnMoreWhy', href: '/why-this-exists', external: false },
  { icon: HandCoins, labelKey: 'onboarding.learnMoreFund', href: '/fund', external: false },
  { icon: GitBranch, labelKey: 'onboarding.learnMoreRepo', href: CIVIZEN_REPO_URL, external: true },
  { icon: FileText, labelKey: 'onboarding.learnMoreCharter', href: CIVIZEN_CHARTER_URL, external: false },
  { icon: Scale, labelKey: 'onboarding.learnMoreTerms', href: '/terms', external: false },
  { icon: Landmark, labelKey: 'onboarding.learnMoreGovernanceDocs', href: CIVIZEN_GOVERNANCE_DOCS_URL, external: false },
] as const;

/** Layered system map as a connected vertical list (body of its deep dive). */
export function OnboardingSystemMap() {
  const { t } = useLanguage();

  return (
    <div className="space-y-3">
      <p className={onboardingSectionLeadClass}>{t('onboarding.systemMapLead')}</p>
      <ol className="relative space-y-3 pl-1">
        <span aria-hidden className="absolute bottom-4 left-[1.05rem] top-4 w-px bg-border" />
        {systemLayers.map((layer) => {
          const body = (
            <>
              <span className={cn('relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', layer.tone)}>
                <layer.icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-snug text-foreground">{t(layer.titleKey)}</span>
                <span className="block text-xs leading-snug text-muted-foreground">{t(layer.descriptionKey)}</span>
              </span>
            </>
          );
          return (
            <li key={layer.titleKey}>
              {'href' in layer && layer.href ? (
                <Link to={layer.href} className="flex items-center gap-3 hover:opacity-90">
                  {body}
                </Link>
              ) : (
                <div className="flex items-center gap-3">{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Mission documents and source: one grouped link list. */
export function OnboardingLearnMore() {
  const { t } = useLanguage();

  return (
    <section className="space-y-4">
      <div className="space-y-1.5">
        <h2 className={onboardingSectionTitleClass}>{t('onboarding.learnMoreTitle')}</h2>
        <p className={onboardingSectionLeadClass}>{t('onboarding.learnMoreLead')}</p>
      </div>

      <ul className={cn(onboardingGroupClass, 'sm:grid sm:grid-cols-2 sm:divide-y-0')}>
        {learnMoreLinks.map((link) => {
          const className = cn(onboardingRowClass, 'text-sm font-medium text-foreground hover:bg-primary/5');
          const content = (
            <>
              <link.icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 flex-1">{t(link.labelKey)}</span>
              {link.external ? (
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
            </>
          );

          return (
            <li key={link.labelKey} className="sm:border-b sm:border-border/50">
              {link.external ? (
                <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
                  {content}
                </a>
              ) : (
                <Link to={link.href} className={className}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
