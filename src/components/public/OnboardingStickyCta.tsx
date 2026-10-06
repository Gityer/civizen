import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

type OnboardingStickyCtaProps = {
  /** True once the hero actions have scrolled off screen, so the pair never shows twice. */
  visible: boolean;
};

/** Phone/tablet join bar. Large screens get Sign in / Join in the public header instead. */
export function OnboardingStickyCta({ visible }: OnboardingStickyCtaProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  return (
    <div
      data-testid="onboarding-sticky-cta"
      aria-hidden={!visible}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 px-4 pt-3 backdrop-blur-md transition-transform duration-300 motion-reduce:transition-none lg:hidden',
        'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
        visible ? 'translate-y-0' : 'pointer-events-none translate-y-full',
      )}
    >
      {/* Right padding keeps both actions clear of the Civi launcher (bottom-right, 56px). */}
      <div className="mx-auto flex w-full max-w-3xl gap-2 pr-[4.25rem]">
        <Button
          onClick={() => navigate('/signup')}
          className="h-11 flex-1 gap-2 dark:shadow-glow"
          tabIndex={visible ? undefined : -1}
        >
          {t('onboarding.joinNetwork')}
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => navigate('/login')}
          variant="outline"
          className="h-11 px-4"
          tabIndex={visible ? undefined : -1}
        >
          {t('onboarding.signIn')}
        </Button>
      </div>
    </div>
  );
}
