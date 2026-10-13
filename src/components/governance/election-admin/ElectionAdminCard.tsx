import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  availableElectionAdminActions,
  loadElectionAdminHistory,
  type ElectionAdminAction,
  type ElectionAdminHistoryEntry,
  type ElectionAdminItem,
} from '@/lib/civic-voting/election-admin';

/** One consultation in the administration list: window, ballots, certification state, actions, history. */
export function ElectionAdminCard({
  item,
  onAction,
}: {
  item: ElectionAdminItem;
  onAction: (item: ElectionAdminItem, action: ElectionAdminAction) => void;
}) {
  const { t, language } = useLanguage();
  const [history, setHistory] = useState<ElectionAdminHistoryEntry[] | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const actions = availableElectionAdminActions(item);
  const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(language) : '—');

  const toggleHistory = async () => {
    const next = !showHistory;
    setShowHistory(next);
    if (next && history === null) {
      setHistory(await loadElectionAdminHistory(item.electionId).catch(() => []));
    }
  };

  return (
    <Card className="space-y-3 p-4" data-testid={`election-admin-${item.electionId}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <Link to={`/governance/voting/${item.electionId}`} className="font-medium text-foreground hover:underline">
            {item.title}
          </Link>
          <p className="text-xs text-muted-foreground">
            {when(item.opensAt)} – {when(item.closesAt)} · {t('electionAdmin.ballots', { count: item.countableBallots })}
          </p>
          {item.cancelReason ? <p className="text-xs text-muted-foreground">{t('electionAdmin.cancelReason', { reason: item.cancelReason })}</p> : null}
          {item.certificationRequestedAt ? (
            <p className="text-xs text-muted-foreground">
              {t('electionAdmin.certificationRequested', { username: item.certificationRequestedBy ?? '—' })}
              {item.certificationRequestedByMe ? ` ${t('electionAdmin.awaitingSecond')}` : ''}
            </p>
          ) : null}
        </div>
        <Badge variant={item.status === 'cancelled' ? 'destructive' : 'outline'}>{t(`electionAdmin.status.${item.status}`)}</Badge>
      </div>
      {actions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button key={action} size="sm" variant={action === 'cancel' ? 'outline' : 'secondary'}
              className={action === 'cancel' ? 'text-destructive' : undefined}
              onClick={() => onAction(item, action)} data-testid={`election-admin-action-${action}`}>
              {t(`electionAdmin.actions.${action}`)}
            </Button>
          ))}
        </div>
      ) : null}
      <div>
        <Button type="button" size="sm" variant="link" className="h-auto px-0" aria-expanded={showHistory} onClick={() => void toggleHistory()}>
          {t('electionAdmin.history')}
        </Button>
        {showHistory ? (
          history === null ? null : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('electionAdmin.historyEmpty')}</p>
          ) : (
            <ol className="space-y-1 text-sm">
              {history.map((entry, index) => (
                <li key={`${entry.createdAt}-${index}`}>
                  <span className="font-medium">{t(`electionAdmin.events.${entry.eventType}`)}</span>
                  <span className="text-xs text-muted-foreground">
                    {' '}· {when(entry.createdAt)}{entry.actorUsername ? ` · @${entry.actorUsername}` : ''}
                  </span>
                  {entry.reason ? <p className="text-muted-foreground">{entry.reason}</p> : null}
                </li>
              ))}
            </ol>
          )
        ) : null}
      </div>
    </Card>
  );
}
