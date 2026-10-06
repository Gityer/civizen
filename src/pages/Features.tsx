import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronDown,
  GraduationCap,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  featureRegistry,
  pageRegistry,
  sectionRegistry,
  type PageId,
  type SectionId,
} from '@/lib/feature-registry';
import { cn } from '@/lib/utils';

type FilterMenuProps<T extends string> = {
  label: string;
  value: string;
  selectedId: T | 'all';
  align?: 'left' | 'right';
  options: Array<{
    id: T | 'all';
    label: string;
    count: number;
  }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (id: T | 'all') => void;
};


const pillarIcons = [
  { color: 'bg-pillar-education', icon: GraduationCap },
  { color: 'bg-pillar-culture', icon: Shield },
  { color: 'bg-pillar-responsibility', icon: Shield },
  { color: 'bg-pillar-environment', icon: Users },
  { color: 'bg-pillar-economy', icon: TrendingUp },
];

function FilterMenu<T extends string>({
  label,
  value,
  selectedId,
  align = 'left',
  options,
  open,
  onOpenChange,
  onSelect,
}: FilterMenuProps<T>) {
  return (
    <div
      className="relative"
      onMouseEnter={() => onOpenChange(true)}
      onMouseLeave={() => onOpenChange(false)}
    >
      <button
        type="button"
        className={cn(
          'flex h-10 items-center gap-2 rounded-full border border-border/70 bg-card/90 px-3.5 text-sm text-foreground shadow-sm transition-all hover:border-border hover:bg-card',
          (open || selectedId !== 'all') && 'border-primary/30 bg-primary/5 text-primary shadow-md shadow-primary/10',
        )}
        onClick={() => onOpenChange(!open)}
      >
        <span className="font-medium">
          {selectedId === 'all' ? label : `${label} · ${value}`}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          className={cn(
            'absolute top-[calc(100%+0.5rem)] z-20 min-w-[240px] rounded-2xl border border-border/70 bg-popover p-2 shadow-xl',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          <div className="space-y-1">
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                className={cn(
                  'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-accent/70',
                  selectedId === option.id && 'bg-primary/10 text-primary',
                )}
                onClick={() => {
                  onSelect(option.id);
                  onOpenChange(false);
                }}
              >
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Features() {
  const { t, getNode } = useLanguage();
  const [selectedSection, setSelectedSection] = useState<SectionId | 'all'>('all');
  const [selectedPage, setSelectedPage] = useState<PageId | 'all'>('all');
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const [pagesOpen, setPagesOpen] = useState(false);

  const sectionOptions = useMemo(() => {
    const items = Object.values(sectionRegistry).map((meta) => ({
      id: meta.id,
      label: t(meta.labelKey),
      count: featureRegistry.filter((feature) => feature.section === meta.id).length,
    }));

    return [
      { id: 'all' as const, label: t('features.allSections'), count: featureRegistry.length },
      ...items,
    ];
  }, [t]);

  const pageOptions = useMemo(() => {
    const items = Object.values(pageRegistry).map((meta) => ({
      id: meta.id,
      label: t(meta.labelKey),
      count: featureRegistry.filter((feature) => feature.page === meta.id).length,
    }));

    return [
      { id: 'all' as const, label: t('features.allPages'), count: featureRegistry.length },
      ...items,
    ];
  }, [t]);

  const visibleFeatures = useMemo(() => {
    return featureRegistry.filter((feature) => {
      const matchesSection = selectedSection === 'all' || feature.section === selectedSection;
      const matchesPage = selectedPage === 'all' || feature.page === selectedPage;
      return matchesSection && matchesPage;
    });
  }, [selectedPage, selectedSection]);

  const selectedSectionLabel =
    selectedSection === 'all'
      ? t('features.allSections')
      : t(sectionRegistry[selectedSection].labelKey);
  const selectedPageLabel =
    selectedPage === 'all'
      ? t('features.allPages')
      : t(pageRegistry[selectedPage].labelKey);

  return (
    <AppLayout>
      <div className="space-y-6 px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <AppPageHeader
              className="min-w-0 flex-1"
              title={t('features.title')}
              subtitle={t('features.subtitle')}
            />
            <div className="flex flex-wrap gap-2 sm:justify-end">
                <FilterMenu
                  label={t('features.sectionsLabel')}
                  value={selectedSectionLabel}
                  selectedId={selectedSection}
                  align="left"
                  options={sectionOptions}
                  open={sectionsOpen}
                  onOpenChange={(open) => {
                    setSectionsOpen(open);
                    if (open) setPagesOpen(false);
                  }}
                  onSelect={(value) => setSelectedSection(value)}
                />
                <FilterMenu
                  label={t('features.pagesLabel')}
                  value={selectedPageLabel}
                  selectedId={selectedPage}
                  align="right"
                  options={pageOptions}
                  open={pagesOpen}
                  onOpenChange={(open) => {
                    setPagesOpen(open);
                    if (open) setSectionsOpen(false);
                  }}
                  onSelect={(value) => setSelectedPage(value)}
                />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full bg-primary/10 px-3 py-1 text-primary hover:bg-primary/10">
              {t('features.matchingFeatures', { count: visibleFeatures.length })}
            </Badge>
            {(selectedSection !== 'all' || selectedPage !== 'all') && (
              <button
                type="button"
                className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
                onClick={() => {
                  setSelectedSection('all');
                  setSelectedPage('all');
                }}
              >
                {t('features.clearFilters')}
              </button>
            )}
          </div>
        </motion.div>

        {visibleFeatures.length === 0 ? (
          <Card className="border-border/70 bg-card/95 p-6 shadow-sm">
            <h2 className="font-semibold text-foreground">{t('features.noResultsTitle')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('features.noResultsDescription')}
            </p>
          </Card>
        ) : (
          <motion.div
            className="grid gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            {visibleFeatures.map((feature, index) => (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.04 }}
              >
                <Card className="border-border/70 bg-card/95 p-4 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="rounded-full border-border/70 bg-background/70">
                          {t(sectionRegistry[feature.section].labelKey)}
                        </Badge>
                        <Badge variant="outline" className="rounded-full border-border/70 bg-background/70">
                          {t(pageRegistry[feature.page].labelKey)}
                        </Badge>
                      </div>
                      <h2 className="mt-3 font-semibold text-foreground">
                        {t(feature.titleKey)}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t(feature.summaryKey)}
                      </p>
                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            {t('features.workflowHeading')}
                          </h3>
                          <ol className="mt-2 space-y-2 text-sm text-foreground/90">
                            {((getNode(feature.workflowKey) as string[] | undefined) || []).map((step, stepIndex) => (
                              <li key={`${feature.id}-workflow-${stepIndex}`} className="flex gap-2">
                                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                                  {stepIndex + 1}
                                </span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            {t('features.functionalityHeading')}
                          </h3>
                          <ul className="mt-2 space-y-2 text-sm text-foreground/90">
                            {((getNode(feature.detailsKey) as string[] | undefined) || []).map((detail, detailIndex) => (
                              <li key={`${feature.id}-detail-${detailIndex}`} className="flex gap-2">
                                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                                <span>{detail}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="border-border/70 bg-linear-to-br from-primary/5 via-card to-accent/5 p-5 shadow-sm">
            <h2 className="font-semibold text-foreground">
              {t('features.pillarsTitle')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('features.pillarsDescription')}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {pillarIcons.map((pillar, index) => (
                <div
                  key={index}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${pillar.color}`}
                >
                  <pillar.icon className="h-5 w-5 text-white" />
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}
