import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { searchMatterActors, type MatterActorSuggestion } from '@/lib/matters-api-matters';
import {
  appointPositionHolder,
  endPositionTerm,
  organisationErrorKey,
  personName,
  type PositionDetail,
  type PositionTerm,
} from '@/lib/organisation';

function date(value: string | null, language: string): string {
  return value ? new Date(value).toLocaleDateString(language || undefined, { dateStyle: 'medium' }) : '';
}

function EndTermForm({ term, onDone }: { term: PositionTerm; onDone: () => void }) {
  const { t } = useLanguage();
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await endPositionTerm(term.id, reason, note);
      toast.success(t('organisation.holders.ended'));
      onDone();
    } catch (error) {
      toast.error(t(organisationErrorKey(error instanceof Error ? error.message : '')));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-2 rounded-lg border border-border/60 p-3" data-testid="position-end-term">
      <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('organisation.holders.reason')} aria-label={t('organisation.holders.reason')} />
      <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder={t('organisation.holders.handoverPlaceholder')}
        aria-label={t('organisation.holders.handover')} />
      <Button type="button" size="sm" variant="outline" disabled={busy || reason.trim().length < 3} onClick={() => void submit()}>
        {t('organisation.holders.end')}
      </Button>
    </div>
  );
}

function AppointForm({ positionKey, onDone }: { positionKey: string; onDone: () => void }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MatterActorSuggestion[]>([]);
  const [chosen, setChosen] = useState<MatterActorSuggestion | null>(null);
  const [kind, setKind] = useState<'holder' | 'acting'>('holder');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void searchMatterActors(query).then((rows) => { if (active) setResults(rows.filter((row) => row.kind === 'person')); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query]);

  const submit = async () => {
    if (!chosen) return;
    setBusy(true);
    try {
      await appointPositionHolder(positionKey, chosen.profileId, kind, note);
      toast.success(t('organisation.holders.appointed'));
      setChosen(null);
      setQuery('');
      setNote('');
      onDone();
    } catch (error) {
      toast.error(t(organisationErrorKey(error instanceof Error ? error.message : '')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-border/60 p-3" data-testid="position-appoint">
      <p className="text-sm font-medium text-foreground">{t('organisation.holders.appoint')}</p>
      {chosen ? (
        <p className="text-sm">
          {chosen.displayName}{chosen.subtitle ? ` (@${chosen.subtitle})` : ''}{' '}
          <button type="button" className="text-primary underline-offset-2 hover:underline" onClick={() => setChosen(null)}>
            {t('organisation.holders.change')}
          </button>
        </p>
      ) : (
        <>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('organisation.holders.search')}
            aria-label={t('organisation.holders.search')} data-testid="position-appoint-search" />
          {results.length ? (
            <ul className="space-y-1">
              {results.map((row) => (
                <li key={row.profileId}>
                  <button type="button" className="text-sm text-primary underline-offset-2 hover:underline" onClick={() => setChosen(row)}>
                    {row.displayName}{row.subtitle ? ` (@${row.subtitle})` : ''}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
      <Select value={kind} onValueChange={(value) => setKind(value as 'holder' | 'acting')}>
        <SelectTrigger aria-label={t('organisation.holders.kind')}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="holder">{t('organisation.holders.kindHolder')}</SelectItem>
          <SelectItem value="acting">{t('organisation.holders.kindActing')}</SelectItem>
        </SelectContent>
      </Select>
      <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('organisation.holders.note')} aria-label={t('organisation.holders.note')} />
      <Button type="button" size="sm" disabled={busy || !chosen} onClick={() => void submit()} data-testid="position-appoint-submit">
        {t('organisation.holders.appointButton')}
      </Button>
    </div>
  );
}

/** Current holders (with stepping down), past holders with their handover notes, and appointing. */
export function PositionHolders({ detail, onChanged }: { detail: PositionDetail; onChanged: () => void }) {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const [ending, setEnding] = useState<string | null>(null);
  const current = detail.terms.filter((term) => !term.endedAt);
  const past = detail.terms.filter((term) => term.endedAt);

  return (
    <Card className="space-y-3 p-4" data-testid="position-holders">
      <h2 className="text-base font-semibold text-foreground">{t('organisation.holders.title')}</h2>
      {current.length ? (
        current.map((term) => (
          <div key={term.id} className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">{personName(term)}</span>{' '}
              <Badge variant="secondary" className="rounded-full">{term.kind === 'acting' ? t('organisation.acting') : t('organisation.holder')}</Badge>{' '}
              <span className="text-muted-foreground">{t('organisation.holders.since', { date: date(term.startedAt, language) })}</span>
            </p>
            {(term.profileId === profile?.id || detail.canAppoint) && ending !== term.id ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => setEnding(term.id)}>
                {term.profileId === profile?.id ? t('organisation.holders.stepDown') : t('organisation.holders.endTerm')}
              </Button>
            ) : null}
            {ending === term.id ? <EndTermForm term={term} onDone={() => { setEnding(null); onChanged(); }} /> : null}
          </div>
        ))
      ) : (
        <p className="text-sm text-muted-foreground" data-testid="position-vacant">
          {t('organisation.holders.vacantAnswered', { names: detail.answeredBy.map(personName).join(', ') || t('organisation.holders.founderOffice') })}
        </p>
      )}
      {detail.canAppoint && current.length < detail.seats ? <AppointForm positionKey={detail.positionKey} onDone={onChanged} /> : null}
      {past.length ? (
        <div className="space-y-2 border-t border-border/60 pt-3">
          <h3 className="text-sm font-medium text-foreground">{t('organisation.holders.past')}</h3>
          {past.map((term) => (
            <div key={term.id} className="text-sm">
              <p>
                {personName(term)} · {date(term.startedAt, language)} – {date(term.endedAt, language)}
                {term.endReason ? <span className="text-muted-foreground"> · {term.endReason}</span> : null}
              </p>
              {term.handoverNote ? (
                <p className="mt-1 rounded-lg bg-muted/50 p-2 text-xs" data-testid="position-handover-note">
                  <span className="font-medium">{t('organisation.holders.handover')}: </span>{term.handoverNote}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
