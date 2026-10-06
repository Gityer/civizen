import { useNavigate } from 'react-router-dom';
import { BookOpen, Briefcase, ChevronRight, Compass, Download } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import {
  onboardingGroupClass,
  onboardingRowClass,
  onboardingRowDetailClass,
  onboardingSectionTitleClass,
} from '@/components/public/onboarding-styles';
import { PUBLIC_JOBS_PATH } from '@/lib/public-jobs-path';
import { cn } from '@/lib/utils';

const visitorPaths = [
  { icon: Briefcase, titleKey: 'onboarding.pathJobsTitle', descriptionKey: 'onboarding.pathJobsDescription', action: 'jobs' as const },
  { icon: Compass, titleKey: 'onboarding.pathExploreTitle', descriptionKey: 'onboarding.pathExploreDescription', action: 'explore' as const },
  { icon: BookOpen, titleKey: 'onboarding.pathStudyTitle', descriptionKey: 'onboarding.pathStudyDescription', action: 'study' as const },
  { icon: Download, titleKey: 'onboarding.pathTryAppTitle', descriptionKey: 'onboarding.pathTryAppDescription', action: 'download' as const },
] as const;

type PathAction = (typeof visitorPaths)[number]['action'];

type OnboardingGetStartedHubProps = {
  onScrollToDownload: () => void;
  onScrollToLearnMore: () => void;
  /** Inside the installed app the "Try the app" path is pointless. */
  showDownloadPath?: boolean;
};

/**
 * Secondary visitor paths. Join / Sign in are not repeated here:
 * the hero and the sticky bar already own those actions.
 */
export function OnboardingGetStartedHub({
  onScrollToDownload,
  onScrollToLearnMore,
  showDownloadPath = true,
}: OnboardingGetStartedHubProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handlePathAction = (action: PathAction) => {
    if (action === 'jobs') navigate(PUBLIC_JOBS_PATH);
    else if (action === 'study') navigate('/signup');
    else if (action === 'download') onScrollToDownload();
    else onScrollToLearnMore();
  };

  const paths = showDownloadPath ? visitorPaths : visitorPaths.filter((path) => path.action !== 'download');

  return (
    <section className="space-y-4">
      <h2 className={onboardingSectionTitleClass}>{t('onboarding.pathsTitle')}</h2>
      <ul className={onboardingGroupClass}>
        {paths.map((path) => (
          <li key={path.titleKey}>
            <button
              type="button"
              onClick={() => handlePathAction(path.action)}
              className={cn(onboardingRowClass, 'hover:bg-primary/5')}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <path.icon className="h-[1.1rem] w-[1.1rem]" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-snug text-foreground">{t(path.titleKey)}</span>
                <span className={cn('block', onboardingRowDetailClass)}>{t(path.descriptionKey)}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
