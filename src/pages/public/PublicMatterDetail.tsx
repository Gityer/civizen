import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';

import { PublicPageShell } from '@/components/public/PublicPageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { getPublicMatter, type PublicMatter } from '@/lib/public-matters';

function formatWhen(value: string, language: string): string {
  try {
    return new Intl.DateTimeFormat(language || 'en', { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return value;
  }
}

/** One public Matter for visitors, read-only, with a way in that comes back here after sign-up (v2 step B3). */
export default function PublicMatterDetail() {
  const { id = '' } = useParams();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [matter, setMatter] = useState<PublicMatter | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');

  usePageMeta({ title: matter?.title ?? t('publicMatters.title'), description: matter?.description.slice(0, 160) ?? t('publicMatters.metaDescription') });

  useEffect(() => {
    let active = true;
    getPublicMatter(id)
      .then((row) => {
        if (!active) return;
        setMatter(row);
        setState(row ? 'ready' : 'missing');
      })
      .catch(() => active && setState('missing'));
    return () => {
      active = false;
    };
  }, [id]);

  if (user) return <Navigate to={`/contribute/matters/${id}`} replace />;
  const joinState = { from: { pathname: `/contribute/matters/${id}`, search: '' } };

  return (
    <PublicPageShell contentClassName="px-4 pb-16 pt-2 sm:px-6" showFooter
      sectionTrail={[{ label: t('publicMatters.title'), href: '/matters' }, { label: matter?.title ?? '…' }]}>
      {state === 'loading' ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : null}
      {state === 'missing' ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('publicMatters.notFound')}</p>
          <Button asChild variant="outline"><Link to="/matters">{t('publicMatters.title')}</Link></Button>
        </div>
      ) : null}
      {matter ? (
        <article className="space-y-5">
          <header className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline" className="rounded-full">{t(`contribute.matters.types.${matter.matterType}`)}</Badge>
              <span className="text-muted-foreground">
                {matter.lifecycleStatus === 'closed' ? t('contribute.matters.status.closed') : t('publicMatters.open')}
              </span>
              <span className="text-muted-foreground">{formatWhen(matter.createdAt, language)}</span>
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">{matter.title}</h1>
            {matter.initiatorName || matter.addresseeName ? (
              <p className="text-sm text-muted-foreground">
                {t('publicMatters.raisedBy', { initiator: matter.initiatorName ?? '—', addressee: matter.addresseeName ?? '—' })}
              </p>
            ) : null}
          </header>
          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{matter.description}</p>

          <Card className="space-y-3 rounded-2xl border-primary/30 bg-primary/5 p-4">
            <p className="text-sm text-foreground">{t('publicMatters.joinPrompt')}</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="gap-2">
                <Link to="/signup" state={joinState}>{t('publicMatters.join')}<ArrowRight className="h-4 w-4" aria-hidden /></Link>
              </Button>
              <Button asChild variant="outline"><Link to="/login" state={joinState} data-testid="public-matter-sign-in">{t('onboarding.signIn')}</Link></Button>
            </div>
          </Card>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t('publicMatters.discussion', { count: String(matter.comments.length) })}
            </h2>
            {matter.comments.length === 0 ? <p className="text-sm text-muted-foreground">{t('contribute.matters.noComments')}</p> : null}
            <ul className="space-y-2">
              {matter.comments.map((comment) => (
                <li key={comment.id} className={comment.parentId ? 'ml-4 border-l border-border/70 pl-3' : ''}>
                  <p className="text-xs text-muted-foreground">{comment.authorName ?? '—'} · {formatWhen(comment.createdAt, language)}</p>
                  <p className="whitespace-pre-wrap text-sm text-foreground">{comment.body}</p>
                </li>
              ))}
            </ul>
          </section>
        </article>
      ) : null}
    </PublicPageShell>
  );
}
