import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { APP_DIRECTORY_MAX_CLASS } from '@/lib/responsive-layout';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  CONTRIBUTE_SECTION_ORDER,
  getContributeLanesBySection,
  type ContributeLaneSection,
} from '@/lib/contribute-lanes';
import { LANE_COUNT_FIELDS, WAITING_ITEMS, loadContributeWaiting, type ContributeWaiting } from '@/lib/contribute-waiting';

const SECTION_TITLE_KEYS: Record<ContributeLaneSection, string> = {
  ways: 'contribute.sections.ways',
  community: 'contribute.sections.community',
  knowledge: 'contribute.sections.knowledge',
  impact: 'contribute.sections.impact',
};

export default function Contribute() {
  const { t } = useLanguage();
  const [waiting, setWaiting] = useState<ContributeWaiting | null>(null);

  useEffect(() => {
    let active = true;
    void loadContributeWaiting().then((counts) => { if (active) setWaiting(counts); }, () => undefined);
    return () => { active = false; };
  }, []);
  const waitingItems = waiting ? WAITING_ITEMS.filter((item) => waiting[item.field] > 0) : [];

  return (
    <AppLayout>
      <div className={cn('space-y-8 px-4 py-6', APP_DIRECTORY_MAX_CLASS)}>
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <AppPageHeader
            showBack={false}
            leading={
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:h-14 sm:w-14">
                <PlusCircle className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
            }
            title={t('contribute.title')}
            subtitle={t('contribute.subtitle')}
          />
        </motion.div>

        {waiting ? (
          <section className="space-y-2" data-testid="contribute-waiting" aria-labelledby="contribute-waiting-title">
            <h2 id="contribute-waiting-title" className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {t('contribute.waiting.title')}
            </h2>
            {waitingItems.length ? (
              <div className="flex flex-wrap gap-2">
                {waitingItems.map((item) => (
                  <Link key={item.field} to={item.path} data-testid={`contribute-waiting-${item.field}`}
                    className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10">
                    {t(item.labelKey, { count: waiting[item.field] })}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('contribute.waiting.none')}</p>
            )}
          </section>
        ) : null}

        {CONTRIBUTE_SECTION_ORDER.map((section, sectionIndex) => {
          const lanes = getContributeLanesBySection(section);
          return (
            <motion.section
              key={section}
              className="space-y-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 + sectionIndex * 0.05 }}
            >
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                {t(SECTION_TITLE_KEYS[section])}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {lanes.map((lane, index) => {
                  const Icon = lane.icon;
                  const countField = LANE_COUNT_FIELDS[lane.id];
                  const openCount = waiting && countField ? waiting[countField] : 0;
                  return (
                    <motion.div
                      key={lane.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.06 + sectionIndex * 0.05 + index * 0.03 }}
                    >
                      <Card className="relative h-full border-border/70 bg-card/95 p-3 shadow-sm transition-all duration-200 focus-within:ring-2 focus-within:ring-ring hover:-translate-y-0.5 hover:border-border hover:shadow-md sm:p-4">
                        <div className="flex items-start gap-3 sm:block">
                          <Icon
                            className={`h-6 w-6 shrink-0 sm:mb-3 sm:h-8 sm:w-8 ${lane.iconClassName}`}
                            aria-hidden
                          />
                          <div className="min-w-0">
                            <h3 className="font-semibold text-foreground">
                              {/* the title link covers the whole card; related links sit above it */}
                              <Link to={lane.path} className="outline-none after:absolute after:inset-0 after:rounded-[inherit]" data-testid={`contribute-lane-${lane.id}`}>
                                {t(lane.titleKey)}
                              </Link>
                            </h3>
                            <p className="mt-0.5 text-sm text-muted-foreground sm:mt-1">
                              {t(lane.descriptionKey)}
                            </p>
                            {openCount ? (
                              <Badge variant="secondary" className="mt-2 rounded-full">{t('contribute.laneOpen', { count: openCount })}</Badge>
                            ) : null}
                            {lane.relatedLinks?.length ? (
                              <p className="relative z-10 mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                                {lane.relatedLinks.map((related) => (
                                  <Link key={related.path} to={related.path} className="text-primary underline-offset-4 hover:underline">
                                    {t(related.labelKey)}
                                  </Link>
                                ))}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>
          );
        })}

        <p className="text-sm text-muted-foreground">
          <Link
            to="/areas"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            {t('contribute.related.areas')}
          </Link>
        </p>
      </div>
    </AppLayout>
  );
}
