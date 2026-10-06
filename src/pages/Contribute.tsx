import { motion } from 'framer-motion';
import { PlusCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { APP_DIRECTORY_MAX_CLASS } from '@/lib/responsive-layout';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  CONTRIBUTE_SECTION_ORDER,
  getContributeLanesBySection,
  type ContributeLaneSection,
} from '@/lib/contribute-lanes';

const SECTION_TITLE_KEYS: Record<ContributeLaneSection, string> = {
  ways: 'contribute.sections.ways',
  community: 'contribute.sections.community',
  knowledge: 'contribute.sections.knowledge',
  impact: 'contribute.sections.impact',
};

export default function Contribute() {
  const navigate = useNavigate();
  const { t } = useLanguage();

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
                  return (
                    <motion.div
                      key={lane.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.06 + sectionIndex * 0.05 + index * 0.03 }}
                    >
                      <Card
                        className="flex cursor-pointer items-start gap-3 border-border/70 bg-card/95 p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md sm:block sm:p-4"
                        onClick={() => navigate(lane.path)}
                      >
                        <Icon
                          className={`h-6 w-6 shrink-0 sm:mb-3 sm:h-8 sm:w-8 ${lane.iconClassName}`}
                        />
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground">{t(lane.titleKey)}</h3>
                          <p className="mt-0.5 text-sm text-muted-foreground sm:mt-1">
                            {t(lane.descriptionKey)}
                          </p>
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
