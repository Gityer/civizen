import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  ANSWER_OUTCOMES,
  assignMatterPublicBody,
  deliveryErrorKey,
  isAnswerLate,
  loadMatterPublicStatus,
  recordPublicAnswer,
  recordPublicDelivery,
  refreshOpen311,
  submitOpen311,
  type AnswerOutcome,
  type MatterPublicStatus,
  type PublicDelivery,
} from '@/lib/public-delivery';

const OUTCOME_KEYS: Record<AnswerOutcome, string> = {
  resolved: 'organisation.public.delivery.outcomes.resolved',
  answered: 'organisation.public.delivery.outcomes.answered',
  redirected: 'organisation.public.delivery.outcomes.redirected',
  refused: 'organisation.public.delivery.outcomes.refused',
};

function AnswerForm({ delivery, onDone }: { delivery: PublicDelivery; onDone: () => void }) {
  const { t } = useLanguage();
  const [outcome, setOutcome] = useState<AnswerOutcome>('answered');
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      await recordPublicAnswer(delivery.id, outcome, summary);
      onDone();
    } catch (error) {
      toast.error(t(deliveryErrorKey(error instanceof Error ? error.message : '')));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-2 rounded-lg border border-border/60 p-2" data-testid="public-answer-form">
      <Select value={outcome} onValueChange={(value) => setOutcome(value as AnswerOutcome)}>
        <SelectTrigger aria-label={t('organisation.public.delivery.outcome')}><SelectValue /></SelectTrigger>
        <SelectContent>{ANSWER_OUTCOMES.map((value) => <SelectItem key={value} value={value}>{t(OUTCOME_KEYS[value])}</SelectItem>)}</SelectContent>
      </Select>
      <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} placeholder={t('organisation.public.delivery.answerSummary')}
        aria-label={t('organisation.public.delivery.answerSummary')} />
      <Button type="button" size="sm" disabled={busy || summary.trim().length < 3} onClick={() => void send()} data-testid="public-answer-send">
        {t('organisation.public.delivery.recordAnswer')}
      </Button>
    </div>
  );
}

/**
 * A Matter for a public authority: which function and body it went to, when it was delivered, when the answer is due,
 * and the answer. Whoever works the liaison (or the body's office) records delivery and answers here.
 */
export function MatterPublicStatusCard({ matterId }: { matterId: string }) {
  const { t, language } = useLanguage();
  const [status, setStatus] = useState<MatterPublicStatus | null>(null);
  const [reference, setReference] = useState('');
  const [bodyId, setBodyId] = useState('');
  const [busy, setBusy] = useState(false);
  const day = (value: string) => new Date(value).toLocaleDateString(language || undefined, { dateStyle: 'medium' });

  const load = useCallback(() => {
    void loadMatterPublicStatus(matterId).then(setStatus, () => setStatus(null));
  }, [matterId]);
  useEffect(load, [load]);
  if (!status) return null;

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
      setReference('');
      load();
    } catch (error) {
      toast.error(t(deliveryErrorKey(error instanceof Error ? error.message : '')));
    } finally {
      setBusy(false);
    }
  };
  const open = status.deliveries.find((d) => d.status !== 'answered');

  return (
    <Card className="space-y-2 p-4" data-testid="matter-public-status">
      <h2 className="text-sm font-semibold text-foreground">{t('organisation.public.delivery.title')}</h2>
      <p className="text-sm">
        {t('organisation.public.delivery.function', { name: status.functionName })}
        {' · '}
        {status.body ? (
          <Link to={`/organisation/public/body/${status.body.id}`} className="text-primary underline underline-offset-2">{status.body.name}</Link>
        ) : t('organisation.public.delivery.findingBody')}
      </p>
      {status.deliveries.map((d) => (
        <div key={d.id} className="space-y-1 rounded-lg bg-muted/40 p-2 text-sm" data-testid="public-delivery">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={d.status === 'answered' ? 'secondary' : isAnswerLate(d) ? 'destructive' : 'outline'} className="rounded-full">
              {d.status === 'answered' ? t(OUTCOME_KEYS[d.outcome ?? 'answered'])
                : isAnswerLate(d) ? t('organisation.public.delivery.late') : t('organisation.public.delivery.waiting')}
            </Badge>
            <span>{t('organisation.public.delivery.deliveredOn', { body: d.bodyName, date: day(d.deliveredAt) })}</span>
            {d.reference ? <span className="text-muted-foreground">{t('organisation.public.delivery.reference', { reference: d.reference })}</span> : null}
            {d.externalStatus ? <span className="text-muted-foreground">{t('organisation.public.delivery.cityStatus', { status: d.externalStatus })}</span> : null}
          </div>
          {d.status === 'answered'
            ? <p className="whitespace-pre-line">{d.answerSummary}</p>
            : <p className="text-muted-foreground">{t('organisation.public.delivery.dueBy', { date: day(d.answerDueAt) })}</p>}
        </div>
      ))}
      {status.canHandle ? (
        <div className="space-y-2 border-t border-border/60 pt-2" data-testid="public-delivery-actions">
          {!status.body && status.candidateBodies.length ? (
            <div className="flex flex-wrap gap-2">
              <Select value={bodyId || 'none'} onValueChange={(value) => setBodyId(value === 'none' ? '' : value)}>
                <SelectTrigger className="w-auto" aria-label={t('organisation.public.delivery.assignBody')}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('organisation.public.delivery.assignBody')}</SelectItem>
                  {status.candidateBodies.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="button" size="sm" disabled={busy || !bodyId} onClick={() => void run(() => assignMatterPublicBody(matterId, bodyId))}>
                {t('organisation.public.delivery.assign')}
              </Button>
            </div>
          ) : null}
          {status.body && !open && status.body.channelKind === 'service_request_api' ? (
            <Button type="button" size="sm" disabled={busy} onClick={() => void run(() => submitOpen311(matterId))} data-testid="public-delivery-open311">
              {t('organisation.public.delivery.sendOpen311')}
            </Button>
          ) : null}
          {open?.externalId ? (
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void run(() => refreshOpen311(open.id))} data-testid="public-delivery-refresh">
              {t('organisation.public.delivery.checkStatus')}
            </Button>
          ) : null}
          {status.body && !open ? (
            <div className="flex flex-wrap gap-2">
              <Input className="w-auto flex-1" value={reference} onChange={(e) => setReference(e.target.value)}
                placeholder={t('organisation.public.delivery.referencePlaceholder')} aria-label={t('organisation.public.delivery.referencePlaceholder')} />
              <Button type="button" size="sm" disabled={busy} onClick={() => void run(() => recordPublicDelivery(matterId, reference))} data-testid="public-delivery-record">
                {t('organisation.public.delivery.recordDelivery')}
              </Button>
            </div>
          ) : null}
          {open ? <AnswerForm delivery={open} onDone={load} /> : null}
        </div>
      ) : null}
    </Card>
  );
}
