import { type ReactNode, type RefObject, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { motion, useReducedMotion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { AppDownloadCard } from '@/components/download/AppDownloadCard';
import { OnboardingDeepDive } from '@/components/public/OnboardingDeepDive';
import { OnboardingGetStartedHub } from '@/components/public/OnboardingGetStartedHub';
import { OnboardingHero } from '@/components/public/OnboardingHero';
import { OnboardingProductModules } from '@/components/public/OnboardingProductOverview';
import { OnboardingScreenshots } from '@/components/public/OnboardingScreenshots';
import { OnboardingStickyCta } from '@/components/public/OnboardingStickyCta';
import { OnboardingLearnMore } from '@/components/public/OnboardingSystemAndTrust';
import { OnboardingFaq } from '@/components/public/OnboardingVisitorFaq';
import { PublicPageHeader } from '@/components/public/PublicPageHeader';
import { PublicPageFooter } from '@/components/public/PublicPageFooter';
import {
  onboardingSectionLeadClass,
  onboardingSectionTitleClass,
} from '@/components/public/onboarding-styles';
import { useElementOffscreen } from '@/hooks/useElementOffscreen';
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout';
import { usePageMeta } from '@/hooks/usePageMeta';

/** Two related sections stacked on phones, side by side on large screens. */
const pairedSectionsClass = 'space-y-9 sm:space-y-12 lg:grid lg:grid-cols-2 lg:items-start lg:gap-12 lg:space-y-0';

type MotionSectionProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  reducedMotion: boolean | null;
  sectionRef?: RefObject<HTMLElement | null>;
  id?: string;
};

function MotionSection({ children, className, delay = 0, reducedMotion, sectionRef, id }: MotionSectionProps) {
  if (reducedMotion) {
    return (
      <section ref={sectionRef} id={id} className={className}>
        {children}
      </section>
    );
  }

  return (
    <motion.section
      ref={sectionRef}
      id={id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/**
 * Public landing (web + installed app when signed out).
 * Order: hero (the only Join / Sign in pair on first view) → mission → what exists today →
 * other paths → mission depth (collapsed) → app download (web only) → documents → FAQ.
 */
export default function Onboarding() {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  const heroCtaRef = useRef<HTMLDivElement | null>(null);
  const downloadSectionRef = useRef<HTMLElement | null>(null);
  const learnMoreSectionRef = useRef<HTMLElement | null>(null);
  const isNativeApp = Capacitor.isNativePlatform();
  const isDesktop = useIsDesktopLayout();
  // One Join / Sign in pair at a time: the hero's, then the header (large screens) or sticky bar (phones).
  const heroCtaOffscreen = useElementOffscreen(heroCtaRef);

  usePageMeta({
    title: t('onboarding.pageTitle'),
    description: t('onboarding.pageDescription'),
  });

  const scrollTo = (ref: RefObject<HTMLElement | null>) => {
    ref.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <div className="relative min-h-screen bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.16),transparent_65%)]"
      />

      <PublicPageHeader hideGuestAuthActions={!heroCtaOffscreen} />

      {/* Large screens: same width and side padding as the public header band, so edges line up. */}
      <div className="relative px-5 pb-28 sm:px-8 lg:px-0 lg:pb-12">
        <div className="mx-auto w-full max-w-3xl space-y-9 sm:space-y-12 lg:max-w-6xl lg:space-y-16 lg:px-8">
          <OnboardingHero
            reducedMotion={reducedMotion}
            ctaRef={heroCtaRef}
            aside={isDesktop ? <OnboardingScreenshots variant="hero" /> : undefined}
          />

          <MotionSection reducedMotion={reducedMotion} delay={0.1} className="space-y-3 lg:max-w-3xl">
            <h2 className={onboardingSectionTitleClass}>{t('onboarding.missionTitle')}</h2>
            <p className="text-[0.95rem] leading-relaxed text-foreground/90 sm:text-lg">{t('onboarding.missionLead')}</p>
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
              {t('onboarding.trustLine')}
            </p>
          </MotionSection>

          <MotionSection reducedMotion={reducedMotion} delay={0.14}>
            <OnboardingProductModules />
          </MotionSection>

          {isDesktop ? null : (
            <MotionSection reducedMotion={reducedMotion} delay={0.16}>
              <OnboardingScreenshots />
            </MotionSection>
          )}

          <div className={pairedSectionsClass}>
            <MotionSection reducedMotion={reducedMotion} delay={0.18}>
              <OnboardingGetStartedHub
                onScrollToDownload={() => scrollTo(downloadSectionRef)}
                onScrollToLearnMore={() => scrollTo(learnMoreSectionRef)}
                showDownloadPath={!isNativeApp}
              />
            </MotionSection>

            <MotionSection reducedMotion={reducedMotion} delay={0.22} className="space-y-4">
              <h2 className={onboardingSectionTitleClass}>{t('onboarding.detailsLabel')}</h2>
              <OnboardingDeepDive />
            </MotionSection>
          </div>

          <div className={pairedSectionsClass}>
            {isNativeApp ? null : (
              <MotionSection
                reducedMotion={reducedMotion}
                delay={0.26}
                sectionRef={downloadSectionRef}
                id="download-section"
                className="scroll-mt-24 space-y-4"
              >
                <div className="space-y-1.5">
                  <h2 className={onboardingSectionTitleClass}>{t('onboarding.tryAndroidBuild')}</h2>
                  <p className={onboardingSectionLeadClass}>{t('onboarding.tryAndroidBuildDescription')}</p>
                </div>
                <AppDownloadCard variant="stacked" showTestingBadge />
              </MotionSection>
            )}

            <MotionSection
              reducedMotion={reducedMotion}
              delay={0.3}
              sectionRef={learnMoreSectionRef}
              className="scroll-mt-24"
            >
              <OnboardingLearnMore />
            </MotionSection>
          </div>

          <MotionSection reducedMotion={reducedMotion} delay={0.34}>
            <OnboardingFaq />
          </MotionSection>

          <PublicPageFooter />
        </div>
      </div>

      <OnboardingStickyCta visible={heroCtaOffscreen} />
    </div>
  );
}
