import { Link } from 'react-router-dom';

import { PublicPageShell } from '@/components/public/PublicPageShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { listPublicAreaCards } from '@/lib/areas';

export default function Areas() {
  const { t } = useLanguage();
  const areas = listPublicAreaCards();
  const title = t('areas.title');

  usePageMeta({
    title: t('areas.metaTitle'),
    description: t('areas.metaDescription'),
  });

  return (
    <PublicPageShell
      contentClassName="px-4 pb-16 pt-2 sm:px-6"
      layout="directory"
      showFooter
      sectionTrail={[{ label: title }]}
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-display font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground sm:text-base">{t('areas.subtitle')}</p>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2">
          {areas.map((area) => (
            <li key={area.slug}>
              <Card className="h-full rounded-2xl border-border/60 p-4 shadow-sm sm:p-5">
                <div className="flex h-full flex-col gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <h2 className="text-base font-semibold text-foreground">{area.name}</h2>
                    <p className="text-sm text-muted-foreground">{area.summary}</p>
                  </div>
                  <Button type="button" className="w-full sm:w-auto sm:self-start" asChild>
                    <Link to={area.href} aria-label={`${t('areas.explore')} ${area.name}`}>
                      {t('areas.explore')}
                    </Link>
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </PublicPageShell>
  );
}
