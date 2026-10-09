import { Link, useParams } from 'react-router-dom';

import { PublicPageFooter } from '@/components/public/PublicPageFooter';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { agreementsCreatePath } from '@/lib/agreements-model';
import {
  getPublicAreaPage,
  initiativePartnerHref,
  type PublicAreaStatus,
  type PublicInitiative,
  type PublicRelatedSystem,
} from '@/lib/areas';

function statusLabelKey(status: PublicAreaStatus): string {
  return `areas.status.${status}`;
}

function SystemCard({ item }: { item: PublicRelatedSystem }) {
  const { t } = useLanguage();
  return (
    <Card className="rounded-2xl border-border/60 p-4 shadow-sm space-y-3">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
        <p className="text-sm text-muted-foreground">{item.purpose}</p>
      </div>
      <Button type="button" size="sm" variant="outline" asChild>
        <Link to={item.href} aria-label={`${t('areas.open')} ${item.title}`}>
          {t('areas.open')}
        </Link>
      </Button>
    </Card>
  );
}

/** Members go straight to the page; guests sign in first and come back to it. */
function useMemberLink() {
  const { user } = useAuth();
  return (target: string) => {
    if (user) return { to: target, state: undefined };
    const [pathname, search = ''] = target.split('?');
    return { to: '/login', state: { from: { pathname, search: search ? `?${search}` : '' } } };
  };
}

function InitiativeCard({
  item,
  areaSlug,
}: {
  item: PublicInitiative;
  areaSlug: string;
}) {
  const memberLink = useMemberLink();
  const { t } = useLanguage();
  const statusText = t(statusLabelKey(item.status));
  const actionLabel = item.actionLabel ?? t('areas.open');

  return (
    <Card className="rounded-2xl border-border/60 p-4 shadow-sm space-y-3">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
          <Badge variant="outline">{statusText}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{item.purpose}</p>
        {item.needs && item.needs.length > 0 ? (
          <ul className="list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
            {item.needs.map((need) => (
              <li key={need}>{need}</li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" size="sm" asChild>
          <Link to={item.href} aria-label={`${actionLabel} ${item.title}`}>
            {actionLabel}
          </Link>
        </Button>
        <Button type="button" size="sm" variant="ghost" asChild>
          <Link to={initiativePartnerHref(areaSlug, item.id)}>{t('areas.partner')}</Link>
        </Button>
        <Button type="button" size="sm" variant="outline" asChild>
          <Link
            {...memberLink(agreementsCreatePath({
              source: 'initiative',
              relatedTitle: item.title,
              agreementType: 'program',
            }))}
          >
            {t('agreements.createAction')}
          </Link>
        </Button>
      </div>
    </Card>
  );
}

export default function AreaDetail() {
  const memberLink = useMemberLink();
  const { t } = useLanguage();
  const { slug = '' } = useParams<{ slug: string }>();
  const page = getPublicAreaPage(slug);
  const areasLabel = t('areas.title');

  usePageMeta({
    title: page ? `${page.name} — Civizen` : t('areas.metaTitle'),
    description: page?.summary ?? t('areas.metaDescription'),
  });

  if (!page) {
    return (
      <PublicPageShell
        contentClassName="px-4 pb-16 sm:px-8"
        maxWidthClass="max-w-3xl"
        sectionTrail={[{ label: areasLabel, href: '/areas' }, { label: t('areas.notFoundTitle') }]}
      >
        <div className="mx-auto max-w-3xl space-y-6 pt-2">
          <h1 className="text-2xl font-display font-bold text-foreground">{t('areas.notFoundTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('areas.notFoundBody')}</p>
          <Button type="button" asChild>
            <Link to="/areas">{t('areas.backToAreas')}</Link>
          </Button>
          <PublicPageFooter />
        </div>
      </PublicPageShell>
    );
  }

  const hasWork = page.systems.length > 0 || page.initiatives.length > 0;

  return (
    <PublicPageShell
      contentClassName="px-4 pb-16 sm:px-8"
      maxWidthClass="max-w-3xl"
      sectionTrail={[{ label: areasLabel, href: '/areas' }, { label: page.name }]}
    >
      <div className="mx-auto max-w-3xl space-y-8 pt-2">
        <header className="space-y-2">
          <h1 className="text-2xl font-display font-bold text-foreground">{page.name}</h1>
          <p className="text-sm text-muted-foreground sm:text-base">{page.summary}</p>
        </header>

        <section className="space-y-3" aria-labelledby="areas-happening">
          <h2 id="areas-happening" className="text-base font-semibold text-foreground">
            {t('areas.happeningTitle')}
          </h2>

          {page.initiatives.length > 0 ? (
            <div className="space-y-3">
              {page.initiatives.map((item) => (
                <InitiativeCard key={item.id} item={item} areaSlug={page.slug} />
              ))}
            </div>
          ) : null}

          {page.systems.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">{t('areas.systemsTitle')}</h3>
              <div className="grid gap-3">
                {page.systems.map((item) => (
                  <SystemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          ) : null}

          {!hasWork ? (
            <Card className="rounded-2xl border-dashed border-border/70 p-4 shadow-none">
              <p className="text-sm text-muted-foreground">{t('areas.emptyInitiatives')}</p>
            </Card>
          ) : null}
        </section>

        <section className="space-y-3" aria-labelledby="areas-help">
          <h2 id="areas-help" className="text-base font-semibold text-foreground">
            {t('areas.helpTitle')}
          </h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button type="button" className="w-full sm:w-auto" asChild>
              <Link {...memberLink(page.contributeHref)}>{t('areas.contribute')}</Link>
            </Button>
            <Button type="button" variant="outline" className="w-full sm:w-auto" asChild>
              <Link to={page.partnerHref}>{t('areas.partner')}</Link>
            </Button>
          </div>
        </section>

        {page.deeper || page.learnMore.length > 0 ? (
          <details className="rounded-2xl border border-border/50 bg-muted/20 px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              {t('areas.moreTitle')}
            </summary>
            <div className="mt-3 space-y-3">
              {page.deeper ? <p className="text-sm text-muted-foreground">{page.deeper}</p> : null}
              {page.learnMore.length > 0 ? (
                <nav aria-label={t('areas.learnMoreLabel')} className="flex flex-col gap-2">
                  {page.learnMore.map((link) => (
                    <Link
                      key={`${link.href}-${link.label}`}
                      to={link.href}
                      className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              ) : null}
            </div>
          </details>
        ) : null}

        <PublicPageFooter />
      </div>
    </PublicPageShell>
  );
}
