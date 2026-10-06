import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';
import {
  onboardingSectionLeadClass,
  onboardingSectionTitleClass,
} from '@/components/public/onboarding-styles';
import { useLanguage } from '@/contexts/LanguageContext';

/** Guest-visible pages, captured by `scripts/capture-landing-screenshots.mjs` (Light + Dark). */
const screens = [
  { id: 'voting', href: '/governance/voting', titleKey: 'onboarding.screensVotingTitle', captionKey: 'onboarding.screensVotingCaption' },
  { id: 'documents', href: '/documents', titleKey: 'onboarding.screensDocumentsTitle', captionKey: 'onboarding.screensDocumentsCaption' },
  { id: 'areas', href: '/areas', titleKey: 'onboarding.screensAreasTitle', captionKey: 'onboarding.screensAreasCaption' },
] as const;

type OnboardingScreenshotsProps = {
  /** `hero`: large-screen hero column. Phones only (heading kept for screen readers), loaded eagerly. */
  variant?: 'section' | 'hero';
};

/** Phone screenshots of real public pages: a swipe strip on phones, three columns from `sm`. */
export function OnboardingScreenshots({ variant = 'section' }: OnboardingScreenshotsProps) {
  const { t } = useLanguage();
  const inHero = variant === 'hero';

  return (
    <section
      className={cn(!inHero && 'space-y-4')}
      aria-labelledby="onboarding-screens-title"
      data-testid="onboarding-screenshots"
    >
      <div className={cn('space-y-1.5', inHero && 'sr-only')}>
        <h2 id="onboarding-screens-title" className={onboardingSectionTitleClass}>
          {t('onboarding.screensTitle')}
        </h2>
        <p className={onboardingSectionLeadClass}>{t('onboarding.screensLead')}</p>
      </div>

      <ul
        className={
          inHero
            ? 'grid grid-cols-3 items-start gap-4 pt-6 [&>li:nth-child(2)]:-translate-y-6'
            : '-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden'
        }
      >
        {screens.map((screen) => {
          const title = t(screen.titleKey);
          const alt = t('onboarding.screensAlt', { title });
          return (
            <li key={screen.id} className={inHero ? 'min-w-0' : 'w-[62%] shrink-0 snap-center sm:w-auto'}>
              <Link to={screen.href} className="group block space-y-2" data-testid={`onboarding-screen-${screen.id}`}>
                <span className="block overflow-hidden rounded-[1.4rem] border border-border/60 bg-card shadow-soft">
                  <img
                    src={`/landing/${screen.id}-light.jpg`}
                    alt={alt}
                    width={750}
                    height={1520}
                    loading={inHero ? 'eager' : 'lazy'}
                    decoding="async"
                    className="block h-auto w-full dark:hidden"
                  />
                  <img
                    src={`/landing/${screen.id}-dark.jpg`}
                    alt={alt}
                    width={750}
                    height={1520}
                    loading={inHero ? 'eager' : 'lazy'}
                    decoding="async"
                    className="hidden h-auto w-full dark:block"
                  />
                </span>
                <span
                  className={cn(
                    'block text-sm font-semibold text-foreground transition-colors group-hover:text-primary',
                    inHero && 'text-center',
                  )}
                >
                  {title}
                </span>
                {inHero ? null : (
                  <span className="block text-xs leading-snug text-foreground/75">{t(screen.captionKey)}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
