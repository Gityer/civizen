import { useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useLanguage } from '@/contexts/LanguageContext';
import { studySectionRegistry } from '@/lib/study-sections';
import { cn } from '@/lib/utils';

export function StudySectionNav() {
  const { t } = useLanguage();
  const location = useLocation();
  const navRef = useRef<HTMLElement | null>(null);

  return (
    <nav
      ref={navRef}
      className="-mx-1 mb-6 flex flex-nowrap gap-1 overflow-x-auto overscroll-x-contain pb-1 pt-1 scrollbar-none [touch-action:pan-x] [&::-webkit-scrollbar]:hidden"
      aria-label={t('study.sectionNavAria')}
      onWheel={(event) => {
        const element = navRef.current;
        if (!element) return;

        // Let mouse-wheel gestures pan the tab row horizontally.
        if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
          event.preventDefault();
          element.scrollLeft += event.deltaY;
        }
      }}
    >
      {studySectionRegistry
        .filter((section) => section.id !== 'civicLearning' && section.id !== 'specialists')
        .map((section) => {
        const isActive =
          section.path === '/study'
            ? location.pathname === '/study' || location.pathname === '/study/'
            : location.pathname === section.path || location.pathname.startsWith(`${section.path}/`);

        const Icon = section.icon;

        return (
          <Link
            key={section.id}
            to={section.path}
            title={t(section.descriptionKey)}
            className={cn(
              'inline-flex shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-full border px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border/60 bg-card/80 text-muted-foreground hover:border-border hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span>{t(section.labelKey)}</span>
          </Link>
        );
        })}
    </nav>
  );
}
