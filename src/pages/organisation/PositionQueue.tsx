import { useState } from 'react';
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
  OPEN_STATUSES,
  openPositionItem,
  organisationErrorKey,
  updatePositionItem,
  type ItemAction,
  type PositionItem,
} from '@/lib/organisation';
import { publicFunctionErrorKey, reviewPublicBody } from '@/lib/public-functions';
import { approvePublicOffice, deliveryErrorKey } from '@/lib/public-delivery';

const KIND_KEYS = {
  decision: 'organisation.queue.kinds.decision',
  task: 'organisation.queue.kinds.task',
  review: 'organisation.queue.kinds.review',
  inquiry: 'organisation.queue.kinds.inquiry',
} as const;
const STATUS_KEYS = {
  open: 'organisation.queue.statuses.open',
  in_progress: 'organisation.queue.statuses.in_progress',
  waiting: 'organisation.queue.statuses.waiting',
  done: 'organisation.queue.statuses.done',
  declined: 'organisation.queue.statuses.declined',
} as const;

function ItemCard({ item, onChanged }: { item: PositionItem; onChanged: () => void }) {
  const { t, language } = useLanguage();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const open = OPEN_STATUSES.includes(item.status);

  const run = async (action: ItemAction) => {
    setBusy(true);
    try {
      await updatePositionItem(item.id, action, text);
      setText('');
      onChanged();
    } catch (error) {
      toast.error(t(organisationErrorKey(error instanceof Error ? error.message : '')));
    } finally {
      setBusy(false);
    }
  };

  const review = async (decision: 'verified' | 'rejected') => {
    if (!item.publicBodyId) return;
    setBusy(true);
    try {
      await reviewPublicBody(item.publicBodyId, decision, text);
      setText('');
      onChanged();
    } catch (error) {
      toast.error(t(publicFunctionErrorKey(error instanceof Error ? error.message : '')));
    } finally {
      setBusy(false);
    }
  };

  const approveOffice = async () => {
    setBusy(true);
    try {
      await approvePublicOffice(item.id, text);
      setText('');
      onChanged();
    } catch (error) {
      toast.error(t(deliveryErrorKey(error instanceof Error ? error.message : '')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-2 p-4" data-testid={`position-item-${item.id}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="secondary" className="rounded-full">{t(KIND_KEYS[item.kind])}</Badge>
        <Badge variant={open ? 'default' : 'outline'} className="rounded-full">{t(STATUS_KEYS[item.status])}</Badge>
        {item.priority === 'high' || item.priority === 'urgent' ? (
          <Badge variant="destructive" className="rounded-full">{t(item.priority === 'urgent' ? 'organisation.queue.urgent' : 'organisation.queue.high')}</Badge>
        ) : null}
        {item.claimedBy ? <span className="text-muted-foreground">{t('organisation.queue.claimedBy', { name: `@${item.claimedBy.username ?? ''}` })}</span> : null}
        <span className="text-muted-foreground">{new Date(item.createdAt).toLocaleDateString(language || undefined, { dateStyle: 'medium' })}</span>
      </div>
      <h3 className="font-semibold text-foreground">{item.title}</h3>
      {item.body ? <p className="whitespace-pre-line text-sm text-muted-foreground">{item.body}</p> : null}
      {item.contact ? (
        <p className="text-sm">
          {t('organisation.queue.from')}: {item.contact.name || '—'} · <a className="text-primary underline-offset-2 hover:underline" href={`mailto:${item.contact.email}`}>{item.contact.email}</a>
        </p>
      ) : null}
      {item.matterId ? (
        <Link to={`/contribute/matters/${item.matterId}`} className="text-sm font-medium text-primary underline underline-offset-2">
          {t('organisation.queue.openMatter')}
        </Link>
      ) : null}
      {item.recommendation ? (
        <p className="rounded-lg border border-primary/30 bg-primary/5 p-2 text-sm" data-testid="position-item-recommendation">
          <span className="font-medium">{t('organisation.queue.recommended')}: </span>{item.recommendation}
        </p>
      ) : null}
      {item.resolution ? (
        <p className="rounded-lg bg-muted/50 p-2 text-sm"><span className="font-medium">{t('organisation.queue.resolution')}: </span>{item.resolution}</p>
      ) : null}
      {open ? (
        <div className="space-y-2">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder={t('organisation.queue.textPlaceholder')}
            aria-label={t('organisation.queue.textPlaceholder')} />
          <div className="flex flex-wrap gap-2">
            {item.status === 'in_progress' ? (
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void run('release')}>{t('organisation.queue.release')}</Button>
            ) : (
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void run('claim')} data-testid="position-item-claim">{t('organisation.queue.claim')}</Button>
            )}
            <Button type="button" size="sm" variant="outline" disabled={busy || !text.trim()} onClick={() => void run('note')}>{t('organisation.queue.note')}</Button>
            <Button type="button" size="sm" variant="outline" disabled={busy || !text.trim()} onClick={() => void run('wait')}>{t('organisation.queue.wait')}</Button>
            {item.officeRequest ? (
              <Button type="button" size="sm" disabled={busy || !text.trim()} onClick={() => void approveOffice()} data-testid="position-item-approve-office">{t('organisation.public.body.approve')}</Button>
            ) : item.publicBodyId ? (
              <>
                <Button type="button" size="sm" disabled={busy || !text.trim()} onClick={() => void review('verified')} data-testid="position-item-verify">{t('organisation.public.review.verify')}</Button>
                <Button type="button" size="sm" variant="ghost" disabled={busy || !text.trim()} onClick={() => void review('rejected')}>{t('organisation.public.review.reject')}</Button>
              </>
            ) : (
              <Button type="button" size="sm" disabled={busy || !text.trim()} onClick={() => void run('done')} data-testid="position-item-done">{t('organisation.queue.done')}</Button>
            )}
            <Button type="button" size="sm" variant="ghost" disabled={busy || !text.trim()} onClick={() => void run('declined')}>{t('organisation.queue.decline')}</Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function NewItemForm({ positionKey, onDone }: { positionKey: string; onDone: () => void }) {
  const { t } = useLanguage();
  const [kind, setKind] = useState<'decision' | 'task' | 'review'>('task');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await openPositionItem(positionKey, kind, title, body, recommendation);
      setTitle('');
      setBody('');
      setRecommendation('');
      onDone();
    } catch (error) {
      toast.error(t(organisationErrorKey(error instanceof Error ? error.message : '')));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="space-y-2 p-4">
      <h3 className="text-sm font-medium text-foreground">{t('organisation.queue.add')}</h3>
      <Select value={kind} onValueChange={(value) => setKind(value as 'decision' | 'task' | 'review')}>
        <SelectTrigger aria-label={t('organisation.queue.kind')}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="task">{t(KIND_KEYS.task)}</SelectItem>
          <SelectItem value="decision">{t(KIND_KEYS.decision)}</SelectItem>
          <SelectItem value="review">{t(KIND_KEYS.review)}</SelectItem>
        </SelectContent>
      </Select>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('organisation.queue.itemTitle')} aria-label={t('organisation.queue.itemTitle')} />
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder={t('organisation.queue.itemBody')} aria-label={t('organisation.queue.itemBody')} />
      {kind === 'decision' ? (
        <Textarea value={recommendation} onChange={(e) => setRecommendation(e.target.value)} rows={2}
          placeholder={t('organisation.queue.recommendationPlaceholder')} aria-label={t('organisation.queue.recommended')} />
      ) : null}
      <Button type="button" size="sm" disabled={busy || title.trim().length < 3 || (kind === 'decision' && !recommendation.trim())} onClick={() => void submit()}>
        {t('organisation.queue.addButton')}
      </Button>
    </Card>
  );
}

/** The position's queue: open items first (by priority and due date), then closed ones. */
export function PositionQueue({ positionKey, items, onChanged }: { positionKey: string; items: PositionItem[]; onChanged: () => void }) {
  const { t } = useLanguage();
  const [showClosed, setShowClosed] = useState(false);
  const open = items.filter((item) => OPEN_STATUSES.includes(item.status));
  const closed = items.filter((item) => !OPEN_STATUSES.includes(item.status));
  return (
    <section className="space-y-3" data-testid="position-queue">
      <h2 className="text-base font-semibold text-foreground">{t('organisation.queue.title', { count: open.length })}</h2>
      {open.length ? open.map((item) => <ItemCard key={item.id} item={item} onChanged={onChanged} />)
        : <p className="text-sm text-muted-foreground">{t('organisation.queue.empty')}</p>}
      <NewItemForm positionKey={positionKey} onDone={onChanged} />
      {closed.length ? (
        <Button type="button" size="sm" variant="ghost" onClick={() => setShowClosed((value) => !value)}>
          {t(showClosed ? 'organisation.queue.hideClosed' : 'organisation.queue.showClosed', { count: closed.length })}
        </Button>
      ) : null}
      {showClosed ? closed.map((item) => <ItemCard key={item.id} item={item} onChanged={onChanged} />) : null}
    </section>
  );
}
