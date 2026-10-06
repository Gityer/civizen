import type { ReactNode } from 'react';
import { Compass, GitBranch, Globe2, Lock, Network, Target, Umbrella } from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useLanguage } from '@/contexts/LanguageContext';
import { OnboardingOutcomes } from '@/components/public/OnboardingProductOverview';
import { OnboardingSystemMap } from '@/components/public/OnboardingSystemAndTrust';
import { onboardingSectionLeadClass } from '@/components/public/onboarding-styles';
import { cn } from '@/lib/utils';

const harmGroups = [
  {
    titleKey: 'onboarding.harmGroupConflict',
    evilKeys: ['onboarding.evilWar', 'onboarding.evilRivalry', 'onboarding.evilDivision'],
  },
  {
    titleKey: 'onboarding.harmGroupIntegrity',
    evilKeys: ['onboarding.evilFraud', 'onboarding.evilLies', 'onboarding.evilIrresponsibility'],
  },
  {
    titleKey: 'onboarding.harmGroupJustice',
    evilKeys: ['onboarding.evilPoverty', 'onboarding.evilUnfairness', 'onboarding.evilDoubleStandards'],
  },
] as const;

const approachPillars = [
  {
    icon: GitBranch,
    titleKey: 'onboarding.pillarUnifiedTitle',
    descriptionKey: 'onboarding.pillarUnifiedDescription',
    tone: 'bg-primary/12 text-primary',
  },
  {
    icon: Globe2,
    titleKey: 'onboarding.pillarCitizenshipTitle',
    descriptionKey: 'onboarding.pillarCitizenshipDescription',
    tone: 'bg-pillar-education text-white',
  },
  {
    icon: Umbrella,
    titleKey: 'onboarding.pillarInsuranceTitle',
    descriptionKey: 'onboarding.pillarInsuranceDescription',
    tone: 'bg-pillar-environment text-white',
  },
  {
    icon: Lock,
    titleKey: 'onboarding.pillarPrivacyTitle',
    descriptionKey: 'onboarding.pillarPrivacyDescription',
    tone: 'bg-accent text-accent-foreground',
  },
] as const;

function HarmToEnd() {
  const { t } = useLanguage();

  return (
    <div className="mt-4 rounded-xl border border-destructive/15 bg-destructive/5 px-3.5 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-destructive/80">{t('onboarding.evilsTitle')}</p>
      <div className="mt-1.5 space-y-1">
        {harmGroups.map((group) => (
          <p key={group.titleKey} className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-destructive/70">{t(group.titleKey)}</span>{' '}
            {group.evilKeys.map((key) => t(key)).join(', ')}
          </p>
        ))}
      </div>
    </div>
  );
}

function ApproachPillars() {
  const { t } = useLanguage();

  return (
    <div className="space-y-3">
      <p className={onboardingSectionLeadClass}>{t('onboarding.approachLead')}</p>
      <ul className="space-y-3">
        {approachPillars.map((pillar) => (
          <li key={pillar.titleKey} className="flex items-start gap-3">
            <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', pillar.tone)}>
              <pillar.icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-snug text-foreground">{t(pillar.titleKey)}</span>
              <span className="block text-xs leading-relaxed text-muted-foreground">{t(pillar.descriptionKey)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type DeepDiveItem = { value: string; icon: typeof Target; titleKey: string; body: ReactNode };

/** Mission depth on demand: closed by default so the landing stays short on phones. */
export function OnboardingDeepDive() {
  const { t } = useLanguage();

  const items: DeepDiveItem[] = [
    {
      value: 'long-term',
      icon: Compass,
      titleKey: 'onboarding.longTermTitle',
      body: <p className={onboardingSectionLeadClass}>{t('onboarding.longTermDescription')}</p>,
    },
    {
      value: 'outcomes',
      icon: Target,
      titleKey: 'onboarding.outcomesTitle',
      body: (
        <>
          <OnboardingOutcomes />
          <HarmToEnd />
        </>
      ),
    },
    { value: 'approach', icon: GitBranch, titleKey: 'onboarding.approachTitle', body: <ApproachPillars /> },
    { value: 'system', icon: Network, titleKey: 'onboarding.systemMapTitle', body: <OnboardingSystemMap /> },
  ];

  return (
    <Accordion type="multiple" className="overflow-hidden rounded-2xl border border-border/50 bg-card/50">
      {items.map((item) => (
        <AccordionItem key={item.value} value={item.value} className="border-border/50 last:border-b-0">
          <AccordionTrigger className="gap-3 px-4 py-3.5 text-left text-sm font-semibold hover:no-underline">
            <span className="flex min-w-0 flex-1 items-center gap-3">
              <item.icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>{t(item.titleKey)}</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">{item.body}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
