import type { ReactNode, Ref } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Briefcase } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { PUBLIC_JOBS_PATH } from '@/lib/public-jobs-path';
import { cn } from '@/lib/utils';

type OnboardingHeroProps = {
  reducedMotion: boolean | null;
  /** Wraps the primary actions so other Join / Sign in pairs appear only once they scroll away. */
  ctaRef?: Ref<HTMLDivElement>;
  /** Large screens: shown beside the copy (text then aligns left). */
  aside?: ReactNode;
};

export function OnboardingHero({ reducedMotion, ctaRef, aside }: OnboardingHeroProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const split = Boolean(aside);

  return (
    <section
      className={cn(
        'relative pt-4 text-center sm:pt-10',
        split && 'lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-14 lg:pt-14 lg:text-left',
      )}
    >
      <motion.div
        className={cn('relative mx-auto max-w-2xl', split && 'lg:mx-0')}
        initial={reducedMotion ? false : { opacity: 0, y: 20 }}
        animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="font-display text-[2.75rem] font-bold leading-none tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          {t('onboarding.title')}
        </h1>
        <p className="mt-3 text-base font-semibold text-accent sm:text-xl lg:text-2xl">{t('onboarding.slogan')}</p>
        <p
          className={cn(
            'mx-auto mt-5 max-w-xl text-[0.95rem] leading-relaxed text-foreground/75 sm:text-lg lg:text-xl',
            split && 'lg:mx-0',
          )}
        >
          {t('onboarding.summary')}
        </p>

        <div
          ref={ctaRef}
          className={cn('mx-auto mt-7 flex max-w-md gap-2 lg:mt-9', split && 'lg:mx-0')}
          data-testid="onboarding-hero-actions"
        >
          <Button onClick={() => navigate('/signup')} className="h-12 flex-1 gap-2 text-base dark:shadow-glow" size="lg">
            {t('onboarding.joinNetwork')}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => navigate('/login')}
            variant="outline"
            className="h-12 border-primary/30 bg-background/60 px-5 text-base backdrop-blur-sm"
            size="lg"
          >
            {t('onboarding.signIn')}
          </Button>
        </div>
        <Link
          to={PUBLIC_JOBS_PATH}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          data-testid="onboarding-hero-jobs"
        >
          <Briefcase className="h-4 w-4" aria-hidden />
          {t('onboarding.heroJobs')}
        </Link>
      </motion.div>

      {aside ? <div className="hidden lg:block">{aside}</div> : null}
    </section>
  );
}
