import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { BriefcaseBusiness } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { addPositionNote, loadPositionDetail, organisationErrorKey, type PositionDetail } from '@/lib/organisation';
import { PositionHolders } from '@/pages/organisation/PositionHolders';
import { PositionQueue } from '@/pages/organisation/PositionQueue';

function PublicPositionShell({ children }: { hideNav?: boolean; children: React.ReactNode }) {
  return (
    <PublicPageShell showFooter contentClassName="pb-16">
      {children}
    </PublicPageShell>
  );
}

function Journal({ detail, onChanged }: { detail: PositionDetail; onChanged: () => void }) {
  const { t, language } = useLanguage();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await addPositionNote(detail.positionKey, note);
      setNote('');
      onChanged();
    } catch (error) {
      toast.error(t(organisationErrorKey(error instanceof Error ? error.message : '')));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="space-y-3 p-4" data-testid="position-journal">
      <h2 className="text-base font-semibold text-foreground">{t('organisation.journal.title')}</h2>
      <p className="text-xs text-muted-foreground">{t('organisation.journal.hint')}</p>
      <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={t('organisation.journal.placeholder')}
        aria-label={t('organisation.journal.placeholder')} />
      <Button type="button" size="sm" variant="outline" disabled={busy || !note.trim()} onClick={() => void save()}>{t('organisation.journal.add')}</Button>
      <ol className="space-y-2">
        {detail.log.map((entry) => (
          <li key={entry.id} className="text-sm">
            <span className="text-xs text-muted-foreground">
              {new Date(entry.createdAt).toLocaleString(language || undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              {entry.actor ? ` · @${entry.actor}` : ''}
            </span>
            <p className="whitespace-pre-line">{entry.body}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/** One position: its mandate and duties, who holds it, and, for those who answer for it, its queue and journal. */
export default function PositionPage() {
  const { positionKey = '' } = useParams();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [detail, setDetail] = useState<PositionDetail | null | undefined>(undefined);
  const Shell = user ? AppLayout : PublicPositionShell;

  const load = useCallback(() => {
    void loadPositionDetail(positionKey).then(setDetail, () => setDetail(null));
  }, [positionKey]);
  useEffect(load, [load]);

  return (
    <Shell hideNav={false}>
      <div className="space-y-4 px-4 py-6">
        {detail === undefined ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : null}
        {detail === null ? <p className="text-sm text-muted-foreground">{t('organisation.notFound')}</p> : null}
        {detail ? (
          <>
            <AppPageHeader
              title={detail.title}
              subtitle={detail.unit?.name ?? ''}
              fallbackPath="/organisation"
              leading={
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <BriefcaseBusiness className="h-7 w-7" />
                </div>
              }
            />
            <Card className="space-y-3 p-4" data-testid="position-mandate">
              <h2 className="text-base font-semibold text-foreground">{t('organisation.mandate')}</h2>
              <p className="text-sm">{detail.mandate}</p>
              {detail.duties.length ? (
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {detail.duties.map((duty) => <li key={duty}>{duty}</li>)}
                </ul>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {detail.parentPositionKey ? (
                  <>
                    {t('organisation.reportsTo')}{' '}
                    <Link to={`/organisation/${detail.parentPositionKey}`} className="text-primary underline underline-offset-2">{detail.parentTitle}</Link>
                  </>
                ) : t('organisation.reportsToFounder')}
                {detail.contactTopic ? <> · {t('organisation.answersContactTopic', { topic: detail.contactTopic })}</> : null}
              </p>
            </Card>
            <PositionHolders detail={detail} onChanged={load} />
            {detail.canWork ? (
              <>
                <PositionQueue positionKey={detail.positionKey} items={detail.items} onChanged={load} />
                <Journal detail={detail} onChanged={load} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t('organisation.openItemsPublic', { count: detail.openItems })}</p>
            )}
          </>
        ) : null}
        <Link to="/organisation" className="text-sm text-primary underline-offset-2 hover:underline">{t('organisation.back')}</Link>
      </div>
    </Shell>
  );
}
