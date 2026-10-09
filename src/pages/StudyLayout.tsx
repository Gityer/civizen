import { useMemo, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePageSecondaryNav } from '@/hooks/usePageSecondaryNav';
import { APP_DIRECTORY_MAX_CLASS } from '@/lib/responsive-layout';
import { studySectionRegistry } from '@/lib/study-sections';

/** Placeholders are not offered as features: tests and schedules have no content yet; courses redirect to the learning paths (decision D4). */
const HIDDEN_STUDY_SECTIONS = new Set<string>(['courses', 'schedules', 'tests']);
import { cn } from '@/lib/utils';

export type StudyLayoutOutletContext = {
  isSearchOpen: boolean;
};

export default function StudyLayout() {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const isStudyIndex = location.pathname === '/study' || location.pathname === '/study/';
  const isStudyRoute = location.pathname === '/study' || location.pathname === '/study/' || location.pathname.startsWith('/study/');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const activeStudySectionId = useMemo(() => {
    const match = studySectionRegistry.find((section) =>
      section.path === '/study'
        ? location.pathname === '/study' || location.pathname === '/study/'
        : location.pathname === section.path || location.pathname.startsWith(`${section.path}/`),
    );
    return match?.id ?? 'civicLearning';
  }, [location.pathname]);

  const studySecondaryNav = useMemo(
    () => ({
      defaultValue: 'civicLearning',
      items: studySectionRegistry
        .filter((section) => !HIDDEN_STUDY_SECTIONS.has(section.id))
        .map((section) => ({
          id: section.id,
          label: t(section.labelKey),
          title: t(section.descriptionKey),
        })),
      value: activeStudySectionId,
      onChange: (sectionId: string) => {
        const section = studySectionRegistry.find((entry) => entry.id === sectionId);
        if (section) {
          navigate(section.path);
        }
      },
    }),
    [activeStudySectionId, navigate, t],
  );
  usePageSecondaryNav(studySecondaryNav);

  const handleToggleSearch = () => {
    if (!isStudyIndex) {
      setIsSearchOpen(true);
      navigate('/study');
      return;
    }

    setIsSearchOpen((current) => !current);
  };

  return (
    <AppLayout>
      <div className={cn('space-y-4 px-4 pb-40 pt-6 md:pb-6', APP_DIRECTORY_MAX_CLASS)}>
        <AppPageHeader
          showBack={false}
          titleClassName="text-xl sm:text-2xl"
          title={
            <Link
              to="/study"
              className="inline-flex min-w-0 items-center gap-2 tracking-tight transition-colors hover:text-primary"
            >
              <BookOpen className="hidden h-6 w-6 shrink-0 text-primary sm:block" aria-hidden="true" />
              <span>{t('study.sections.civicLearning.label')}</span>
            </Link>
          }
          titleAccessory={
            isStudyRoute ? (
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-8 w-8 shrink-0"
                aria-label={t('common.search')}
                onClick={handleToggleSearch}
              >
                <Search className="h-4 w-4" />
              </Button>
            ) : undefined
          }
          subtitle={t('study.layoutSubtitle')}
        />
        <Outlet context={{ isSearchOpen }} />
      </div>
    </AppLayout>
  );
}
