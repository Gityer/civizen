import {
  BookOpen,
  ChevronRight,
  FileSignature,
  Globe2,
  Heart,
  Landmark,
  Layers,
  Leaf,
  MessageCircle,
  PlusCircle,
  Scale,
  ShieldCheck,
  Store,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  onboardingGroupClass,
  onboardingGroupGridClass,
  onboardingGroupGridItemClass,
  onboardingIconTile,
  onboardingRowDetailClass,
  onboardingRowClass,
  onboardingSectionLeadClass,
  onboardingSectionTitleClass,
} from '@/components/public/onboarding-styles';
import { APP_VERSION } from '@/lib/app-release';
import { PUBLIC_JOBS_PATH } from '@/lib/public-jobs-path';
import { cn } from '@/lib/utils';

const productModules = [
  {
    icon: BookOpen,
    titleKey: 'onboarding.productStudyTitle',
    descriptionKey: 'onboarding.productStudyDescription',
    tone: 'bg-pillar-education text-white',
  },
  {
    icon: UserRound,
    titleKey: 'onboarding.productProfileTitle',
    descriptionKey: 'onboarding.productProfileDescription',
    tone: 'bg-pillar-culture text-white',
  },
  {
    icon: Landmark,
    titleKey: 'onboarding.productGovernanceTitle',
    descriptionKey: 'onboarding.productGovernanceDescription',
    tone: 'bg-pillar-responsibility text-white',
    href: '/governance',
  },
  {
    icon: Store,
    titleKey: 'onboarding.productMarketTitle',
    descriptionKey: 'onboarding.productMarketDescription',
    tone: 'bg-pillar-economy text-white',
    href: PUBLIC_JOBS_PATH,
  },
  {
    icon: FileSignature,
    titleKey: 'onboarding.productAgreementsTitle',
    descriptionKey: 'onboarding.productAgreementsDescription',
    tone: 'bg-primary/12 text-primary',
    href: '/agreements',
  },
  {
    icon: MessageCircle,
    titleKey: 'onboarding.productMessagingTitle',
    descriptionKey: 'onboarding.productMessagingDescription',
    tone: 'bg-primary/12 text-primary',
  },
  {
    icon: PlusCircle,
    titleKey: 'onboarding.productContributeTitle',
    descriptionKey: 'onboarding.productContributeDescription',
    tone: 'bg-pillar-environment text-white',
  },
] as const;

const outcomeItems = [
  { key: 'onboarding.outcomeWellbeing', icon: Heart },
  { key: 'onboarding.outcomePeace', icon: Globe2 },
  { key: 'onboarding.outcomeIntegrity', icon: ShieldCheck },
  { key: 'onboarding.outcomeFairness', icon: Scale },
  { key: 'onboarding.outcomeStewardship', icon: Leaf },
  { key: 'onboarding.outcomeStandards', icon: Layers },
] as const;

const comingStatusKeys = [
  'onboarding.statusComingIos',
  'onboarding.statusComingFederation',
  'onboarding.statusComingInsurance',
] as const;

/** Outcomes as a compact icon list (body of the "Outcomes we pursue" deep dive). */
export function OnboardingOutcomes() {
  const { t } = useLanguage();

  return (
    <div className="space-y-3">
      <p className={onboardingSectionLeadClass}>{t('onboarding.outcomesLead')}</p>
      <ul className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
        {outcomeItems.map((item) => (
          <li key={item.key} className="flex items-start gap-2.5 text-sm leading-snug text-foreground/90">
            <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
            <span>{t(item.key)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** "What Civizen is today": one grouped list, one module per row, plus build status. */
export function OnboardingProductModules() {
  const { t } = useLanguage();

  return (
    <section className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className={onboardingSectionTitleClass}>{t('onboarding.productTitle')}</h2>
          <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary">
            {t('onboarding.statusBadge')}
          </Badge>
        </div>
        <p className={onboardingSectionLeadClass}>{t('onboarding.productLead')}</p>
      </div>

      <ul className={cn(onboardingGroupClass, onboardingGroupGridClass)}>
        {productModules.map((module) => {
          const href = 'href' in module ? module.href : undefined;
          const body = (
            <>
              <span className={onboardingIconTile(cn('h-9 w-9 rounded-xl', module.tone))}>
                <module.icon className="h-[1.1rem] w-[1.1rem]" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-snug text-foreground">{t(module.titleKey)}</span>
                <span className={cn('mt-0.5 line-clamp-2', onboardingRowDetailClass)}>
                  {t(module.descriptionKey)}
                </span>
              </span>
              {href ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
            </>
          );
          return (
            <li key={module.titleKey} className={onboardingGroupGridItemClass}>
              {href ? (
                <Link to={href} className={cn(onboardingRowClass, 'hover:bg-primary/5')}>
                  {body}
                </Link>
              ) : (
                <div className={onboardingRowClass}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="px-1 text-xs leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground/80">{t('onboarding.statusVersion', { version: APP_VERSION })}</span>
        {' · '}
        {t('onboarding.statusComingLabel')}: {comingStatusKeys.map((key) => t(key)).join(', ')}
      </p>
    </section>
  );
}
