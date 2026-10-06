import { Heart, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { SlowRunningText } from '@/components/ui/slow-running-text';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export function HappinessPrivateHint({ className }: { className?: string } = {}) {
  const { t } = useLanguage();
  const hint = t('happiness.privateHint');

  return (
    <Link
      to="/happiness/privacy"
      aria-label={hint}
      data-happiness-private-hint=""
      className={cn(
        'group relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/20',
        className,
      )}
    >
      <Lock className="h-4 w-4" aria-hidden />
      <span
        data-happiness-private-tooltip=""
        aria-hidden
        className="pointer-events-none absolute right-0 top-full z-50 mt-1 hidden w-max max-w-48 rounded-md border bg-popover px-2 py-1 text-left text-xs leading-snug text-popover-foreground shadow-sm [@media(hover:hover)]:group-hover:block [@media(hover:hover)]:group-focus-visible:block"
      >
        {hint}
      </span>
    </Link>
  );
}

export function HappinessShell({
  children,
  subtitle,
  actions,
  fallbackPath = '/happiness',
  titleKey = 'happiness.navTitle',
  privateHint = false,
  showBack,
}: {
  children: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  fallbackPath?: string;
  titleKey?: string;
  privateHint?: boolean;
  showBack?: boolean;
}) {
  const { t } = useLanguage();
  const titleText = t(titleKey);
  return (
    <AppLayout>
      <div
        className="mx-auto flex w-full max-w-lg flex-col gap-4 overflow-x-clip px-4 pb-6 pt-[calc(max(0.5rem,var(--safe-area-top))+0.5rem)]"
        data-build-key={titleKey === 'happiness.navTitle' ? 'happinessPage' : undefined}
        data-build-label={titleKey === 'happiness.navTitle' ? 'Happiness and Fulfillment' : undefined}
      >
        <AppPageHeader
          title={<SlowRunningText text={titleText} onlyWhenOverflow className="min-w-0 flex-1" />}
          subtitle={subtitle}
          fallbackPath={fallbackPath}
          showBack={showBack}
          titleAccessory={privateHint ? <HappinessPrivateHint /> : undefined}
          leading={<Heart className="h-6 w-6 text-primary" aria-hidden />}
          actions={actions}
          className="min-h-10"
        />
        {children}
      </div>
    </AppLayout>
  );
}

export function HappinessChoiceButton({
  selected,
  onClick,
  children,
  disabled,
  compact,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'border text-sm transition-colors',
        compact
          ? 'inline-flex min-h-10 items-center rounded-full px-3.5'
          : 'w-full rounded-2xl px-4 py-3 text-left',
        selected
          ? 'border-primary bg-primary/10 text-foreground'
          : compact
            ? 'border-border/70 bg-card text-muted-foreground hover:border-border hover:text-foreground'
            : 'border-border/70 bg-card text-foreground hover:border-border',
        disabled && 'opacity-60',
      )}
    >
      {children}
    </button>
  );
}

export function HappinessQuietLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
      {children}
    </Link>
  );
}
