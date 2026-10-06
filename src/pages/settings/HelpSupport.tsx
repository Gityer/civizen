import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { HELP_SUPPORT_LINKS } from '@/pages/settings/help-support-links';

/** Link rows only; the page wraps them in the app shell. Exported for tests. */
export function HelpSupportLinks({
  t,
  onOpen,
}: {
  t: (key: string) => string;
  onOpen: (path: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {HELP_SUPPORT_LINKS.map((item, index) => (
        <motion.div
          key={item.path}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card
            role="link"
            tabIndex={0}
            className="cursor-pointer p-4 transition-shadow hover:shadow-elevated"
            onClick={() => onOpen(item.path)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpen(item.path);
              }
            }}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <item.icon className="h-5 w-5 text-primary" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-foreground">{t(item.labelKey)}</h2>
                <p className="text-sm text-muted-foreground">{t(item.descriptionKey)}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

export default function HelpSupport() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <AppLayout>
      <div className="flex min-h-0 flex-col px-4 pb-28 pt-4">
        <div className="mb-4">
          <AppPageHeader
            title={t('settings.helpTitle')}
            subtitle={t('settings.helpSubtitle')}
            fallbackPath="/settings"
          />
        </div>
        <HelpSupportLinks t={t} onOpen={(path) => navigate(path)} />
      </div>
    </AppLayout>
  );
}
