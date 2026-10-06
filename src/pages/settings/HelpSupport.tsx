import { Link } from 'react-router-dom';
import { BookOpen, Download, FileText, HelpCircle, Lightbulb, MessageSquareWarning, Shield } from 'lucide-react';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

type HelpEntry = {
  icon: typeof HelpCircle;
  key: 'learn' | 'why' | 'problem' | 'safety' | 'app' | 'legal';
  path: string;
  action: string;
};

const HELP_ENTRIES: HelpEntry[] = [
  { icon: BookOpen, key: 'learn', path: '/study', action: 'openStudy' },
  { icon: Lightbulb, key: 'why', path: '/why-this-exists', action: 'openWhy' },
  { icon: MessageSquareWarning, key: 'problem', path: '/contribute/improvements', action: 'openProblem' },
  { icon: Shield, key: 'safety', path: '/settings/safety', action: 'openSafety' },
  { icon: Download, key: 'app', path: '/download', action: 'openApp' },
  { icon: FileText, key: 'legal', path: '/settings/legal', action: 'openLegal' },
];

/** Help and support hub. Reachable while the terms re-consent gate is showing (see terms-version.ts). */
export default function HelpSupport() {
  const { t } = useLanguage();

  return (
    <AppLayout>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-6">
        <AppPageHeader
          title={t('settings.helpSupport')}
          subtitle={t('settings.helpSupportDescription')}
          fallbackPath="/settings"
          leading={
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <HelpCircle className="h-6 w-6" />
            </div>
          }
        />

        {HELP_ENTRIES.map(({ icon: Icon, key, path, action }) => (
          <Card key={key} className="flex items-start gap-3 border-border/80 p-4">
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="flex-1 space-y-2">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-foreground">{t(`settings.helpPage.${key}Title`)}</h2>
                <p className="text-xs leading-relaxed text-muted-foreground">{t(`settings.helpPage.${key}Body`)}</p>
              </div>
              <Button type="button" variant="outline" size="sm" asChild>
                <Link to={path}>{t(`settings.helpPage.${action}`)}</Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
