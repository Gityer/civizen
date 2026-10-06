import { Component, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useLanguage } from '@/contexts/LanguageContext';
import {
  happinessShortcutAriaKey,
  happinessShortcutMouthPath,
  happinessShortcutTooltipUnassessedKey,
} from '@/lib/happiness/home-shortcut';
import type { HappinessLevel } from '@/lib/happiness/types';
import { useHappinessShortcutLevel } from '@/lib/happiness/use-happiness-shortcut';

type ShortcutProps = {
  profileId: string | null | undefined;
  className?: string;
};

export function HappinessStateMark({
  level,
  className,
}: {
  level: HappinessLevel | null;
  className?: string;
}) {
  const mouth = happinessShortcutMouthPath(level);

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.85"
      data-happiness-state={level ?? 'unassessed'}
    >
      <circle cx="12" cy="12" r="9" />
      {mouth ? <path d={mouth} data-happiness-curve={level ?? undefined} /> : null}
    </svg>
  );
}

class HomeHappinessShortcutBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function HomeHappinessShortcutInner({ profileId, className }: ShortcutProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { level, loading } = useHappinessShortcutLevel(profileId);
  const levelLabel = level ? t(`happiness.levels.${level}`) : '';
  const ariaLabel = t(happinessShortcutAriaKey(level), level ? { level: levelLabel } : undefined);
  const tooltipBody = level ? levelLabel : t(happinessShortcutTooltipUnassessedKey());

  return (
    <div className={className}>
      <Link
        to="/happiness"
        data-home-happiness-shortcut=""
        aria-label={ariaLabel}
        aria-busy={loading || undefined}
        className="group relative inline-flex h-[28px] w-[28px] min-h-[28px] min-w-[28px] shrink-0 items-center justify-center rounded-full border border-border/70 bg-card/80 text-primary outline-none transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-primary/20"
        onKeyDown={(event) => {
          if (event.key !== ' ') return;
          event.preventDefault();
          void navigate('/happiness');
        }}
      >
        <HappinessStateMark level={level} className="h-3.5 w-3.5" />
        <span
          data-home-happiness-tooltip=""
          aria-hidden
          className="pointer-events-none absolute right-0 top-full z-50 mt-1 hidden w-max max-w-42 rounded-md border bg-popover px-2 py-1 text-left text-xs leading-snug text-popover-foreground shadow-sm [@media(hover:hover)]:group-hover:block [@media(hover:hover)]:group-focus-visible:block"
        >
          <span className="block font-medium">{t('happiness.pageTitle')}</span>
          <span className="block text-muted-foreground">{tooltipBody}</span>
        </span>
      </Link>
    </div>
  );
}

export function HomeHappinessShortcut(props: ShortcutProps) {
  return (
    <HomeHappinessShortcutBoundary>
      <HomeHappinessShortcutInner {...props} />
    </HomeHappinessShortcutBoundary>
  );
}
