import type React from 'react';
import { useEffect, useState } from 'react';
import { Landmark } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { deliveryErrorKey, loadPublicBody, requestPublicOffice, type PublicBodyDetail } from '@/lib/public-delivery';
import { placeLabel } from '@/lib/public-functions';

function PublicBodyShell({ children }: { hideNav?: boolean; children: React.ReactNode }) {
  return (
    <PublicPageShell showFooter contentClassName="pb-16">
      {children}
    </PublicPageShell>
  );
}

function OfficeRequestForm({ bodyId }: { bodyId: string }) {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [evidence, setEvidence] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      await requestPublicOffice(bodyId, title, evidence, note);
      setSent(true);
    } catch (error) {
      toast.error(t(deliveryErrorKey(error instanceof Error ? error.message : '')));
    } finally {
      setBusy(false);
    }
  };
  if (sent) return <p className="text-sm" role="status" data-testid="office-request-sent">{t('organisation.public.body.requestSent')}</p>;
  return (
    <div className="space-y-2" data-testid="office-request">
      <h3 className="text-sm font-medium text-foreground">{t('organisation.public.body.requestTitle')}</h3>
      <p className="text-xs text-muted-foreground">{t('organisation.public.body.requestBody')}</p>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('organisation.public.body.officeTitle')} aria-label={t('organisation.public.body.officeTitle')} />
      <Input value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder={t('organisation.public.body.evidence')} aria-label={t('organisation.public.body.evidence')} />
      <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={t('organisation.public.propose.notes')} aria-label={t('organisation.public.propose.notes')} />
      <Button type="button" size="sm" disabled={busy || title.trim().length < 3 || !evidence.startsWith('https://')} onClick={() => void send()} data-testid="office-request-send">
        {t('organisation.public.body.requestSend')}
      </Button>
    </div>
  );
}

/** A mapped public body: where it acts, what it does, how it receives requests, its source, and its offices on Civizen. */
export default function PublicBodyPage() {
  const { bodyId = '' } = useParams();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [body, setBody] = useState<PublicBodyDetail | null | undefined>(undefined);
  const Shell = user ? AppLayout : PublicBodyShell;

  useEffect(() => {
    void loadPublicBody(bodyId).then(setBody, () => setBody(null));
  }, [bodyId]);

  return (
    <Shell hideNav={false}>
      <div className="space-y-4 px-4 py-6">
        {body === undefined ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : null}
        {body === null ? <p className="text-sm text-muted-foreground">{t('organisation.public.body.notFound')}</p> : null}
        {body ? (
          <>
            <AppPageHeader title={body.name} subtitle={placeLabel(body, t('organisation.public.planet'))} fallbackPath="/organisation/public"
              leading={<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Landmark className="h-7 w-7" /></div>} />
            <Card className="space-y-2 p-4 text-sm" data-testid="public-body">
              <p>{t('organisation.public.body.channel', { address: body.channelAddress })}</p>
              {body.answerDeadlineDays ? <p>{t('organisation.public.finder.deadline', { days: body.answerDeadlineDays })}</p> : null}
              {body.website ? <a href={body.website} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">{body.website}</a> : null}
              <p><a href={body.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">{t('organisation.public.finder.source')}</a></p>
              <h2 className="pt-2 font-semibold text-foreground">{t('organisation.public.body.functions')}</h2>
              <ul className="list-disc pl-5">
                {body.functions.map((fn) => <li key={fn.functionKey}>{fn.name}{fn.coverageNote ? ` (${fn.coverageNote})` : ''}</li>)}
              </ul>
              <h2 className="pt-2 font-semibold text-foreground">{t('organisation.public.body.offices')}</h2>
              {body.offices.length ? (
                <ul className="list-disc pl-5">
                  {body.offices.map((office) => (
                    <li key={office.positionKey}>
                      <Link to={`/organisation/${office.positionKey}`} className="text-primary underline underline-offset-2">{office.title}</Link>
                      {office.held ? '' : ` · ${t('organisation.vacant')}`}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-muted-foreground">{t('organisation.public.body.noOffices')}</p>}
            </Card>
            {user ? <Card className="p-4"><OfficeRequestForm bodyId={body.id} /></Card> : null}
          </>
        ) : null}
      </div>
    </Shell>
  );
}
