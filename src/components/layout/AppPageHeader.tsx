import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  canPopAppHistory,
  getAppBackFallback,
  shouldShowAppBack,
} from '@/lib/app-back-navigation';
import { cn } from '@/lib/utils';

/** Clears the floating Search + Profile controls on the first content row. */
export const APP_PAGE_HEADER_CHROME_PAD = 'pr-23';

type AppPageHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Defaults to `shouldShowAppBack(pathname)`. */
  showBack?: boolean;
  /** Overrides section fallback when history cannot pop. */
  fallbackPath?: string;
  /** When set, runs instead of history pop / fallback navigation. */
  onBack?: () => void;
  /** Optional icon or mark between back and title. */
  leading?: ReactNode;
  /** Compact control immediately beside the title (for example a create `+`). */
  titleAccessory?: ReactNode;
  /** Trailing controls. Wrap below the title on small screens so they cannot crush it. */
  actions?: ReactNode;
  /**
   * Reserve space for floating AppTopChrome Search/Profile.
   * Disable on PublicPageShell routes that do not use that chrome.
   */
  padForChrome?: boolean;
  className?: string;
  titleClassName?: string;
};

/**
 * Compact page header: optional Back chevron on the same wrap as the title.
 * Actions wrap to the next row on small screens so labeled buttons cannot
 * collapse the title into a narrow column.
 */
export function AppPageHeader({
  title,
  subtitle,
  showBack,
  fallbackPath,
  onBack,
  leading,
  titleAccessory,
  actions,
  padForChrome = true,
  className,
  titleClassName,
}: AppPageHeaderProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const backVisible = showBack ?? shouldShowAppBack(location.pathname);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (canPopAppHistory()) {
      navigate(-1);
      return;
    }
    navigate(fallbackPath ?? getAppBackFallback(location.pathname));
  };

  return (
    <div
      className={cn(
        'flex flex-wrap gap-x-2 gap-y-3',
        subtitle ? 'items-start' : 'items-center',
        padForChrome && APP_PAGE_HEADER_CHROME_PAD,
        className,
      )}
      data-testid="app-page-header"
    >
      {backVisible ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-10 w-10 shrink-0"
          onClick={handleBack}
          aria-label={t('common.back')}
          data-testid="app-page-header-back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      ) : null}
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-40 flex-1">
        <div className="flex items-center gap-1">
          {typeof title === 'string' || typeof title === 'number' ? (
            <h1
              className={cn(
                'min-w-0 flex-1 text-2xl font-display font-bold leading-snug text-foreground',
                titleClassName,
              )}
              data-testid="app-page-header-title"
            >
              {title}
            </h1>
          ) : (
            <div
              role="heading"
              aria-level={1}
              className={cn(
                'flex min-w-0 flex-1 items-center gap-2 text-2xl font-display font-bold leading-snug text-foreground',
                titleClassName,
              )}
              data-testid="app-page-header-title"
            >
              {title}
            </div>
          )}
          {titleAccessory ? <div className="shrink-0">{titleAccessory}</div> : null}
        </div>
        {subtitle ? <div className="mt-1 text-sm leading-relaxed text-muted-foreground">{subtitle}</div> : null}
      </div>
      {actions ? (
        <div
          className="flex w-full shrink-0 items-center gap-2 sm:ml-auto sm:w-auto"
          data-testid="app-page-header-actions"
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}
