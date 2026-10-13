import { useEffect, useState } from 'react';
import { CheckCircle, Clock, Loader2, MessageSquareWarning, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { createSignedIdentityArtifactUrl, latestArtifactOfKind } from '@/lib/identity-verification';
import { isIdentityReviewOverdue, type IdentityReviewQueueItem } from '@/lib/identity-verification-queue';
import { IdentityReviewHistory } from './IdentityReviewHistory';

export type IdentityReviewCaseAction = 'claim' | 'release' | 'approve' | 'reject' | 'requestInfo';

function useArtifactPreview(item: IdentityReviewQueueItem) {
  const [urls, setUrls] = useState<{ idUrl: string | null; selfieUrl: string | null }>({ idUrl: null, selfieUrl: null });
  useEffect(() => {
    let alive = true;
    const signed = (path: string | null | undefined) =>
      path ? createSignedIdentityArtifactUrl(path).catch(() => null) : Promise.resolve(null);
    void Promise.all([
      signed(latestArtifactOfKind(item.artifacts, 'supporting_document')?.storage_path),
      signed(latestArtifactOfKind(item.artifacts, 'live_presence')?.storage_path),
    ]).then(([idUrl, selfieUrl]) => {
      if (alive) setUrls({ idUrl, selfieUrl });
    });
    return () => {
      alive = false;
    };
  }, [item.artifacts]);
  return urls;
}

function ArtifactPreview({ url, label, missing }: { url: string | null; label: string; missing: string }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="block">
          <img src={url} alt={label} className="max-h-48 w-full rounded-xl border bg-muted/30 object-contain" />
        </a>
      ) : (
        <p className="text-sm text-muted-foreground">{missing}</p>
      )}
    </div>
  );
}

/** One case in the reviewer queue: age against the 48 h target, assignment, documents, actions, notes. */
export function IdentityReviewCaseCard({
  item,
  selfId,
  busy,
  onAction,
  onChanged,
}: {
  item: IdentityReviewQueueItem;
  selfId: string | null | undefined;
  busy: boolean;
  onAction: (item: IdentityReviewQueueItem, action: IdentityReviewCaseAction) => void;
  onChanged: () => void;
}) {
  const { t } = useLanguage();
  const preview = useArtifactPreview(item);
  const [showHistory, setShowHistory] = useState(false);
  const overdue = isIdentityReviewOverdue(item.ageHours);
  const mine = Boolean(selfId) && item.assignedTo === selfId;
  const displayName = item.fullName || item.username || t('common.anonymousUser');
  const age =
    item.ageHours >= 48
      ? t('identityReview.ageDays', { days: Math.floor(item.ageHours / 24) })
      : t('identityReview.ageHours', { hours: Math.floor(item.ageHours) });

  return (
    <Card className="space-y-4 p-4" data-testid={`identity-review-case-${item.caseId}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h4 className="font-medium">{displayName}</h4>
          {item.username ? <p className="text-sm text-muted-foreground">@{item.username}{item.country ? ` · ${item.country}` : ''}</p> : null}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={overdue ? 'destructive' : 'outline'} className="gap-1" title={overdue ? t('identityReview.overdue') : undefined}>
              <Clock className="h-3 w-3" aria-hidden />
              {age}
            </Badge>
            <Badge variant="outline">
              {item.assignedUsername ? t('identityReview.assignedTo', { username: item.assignedUsername }) : t('identityReview.unassigned')}
            </Badge>
            {item.resubmission ? <Badge variant="secondary">{t('identityReview.resubmission')}</Badge> : null}
            {item.infoRequestCount > 0 ? (
              <Badge variant="secondary">{t('identityReview.infoRequests', { count: item.infoRequestCount })}</Badge>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {mine ? (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => onAction(item, 'release')}>
              {t('identityReview.release')}
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onAction(item, 'claim')} data-testid="identity-review-claim">
              {t('identityReview.claim')}
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1" disabled={busy} onClick={() => onAction(item, 'requestInfo')}
            aria-label={t('identityReview.requestInfo')} title={t('identityReview.requestInfo')} data-testid="identity-review-request-info">
            <MessageSquareWarning className="h-4 w-4" aria-hidden />
          </Button>
          <Button size="sm" variant="outline" className="gap-1" disabled={busy} onClick={() => onAction(item, 'approve')}
            aria-label={t('identityReview.approve')} title={t('identityReview.approve')} data-testid="identity-review-approve">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <CheckCircle className="h-4 w-4" aria-hidden />}
          </Button>
          <Button size="sm" variant="outline" className="gap-1 text-destructive" disabled={busy} onClick={() => onAction(item, 'reject')}
            aria-label={t('identityReview.reject')} title={t('identityReview.reject')} data-testid="identity-review-reject">
            <XCircle className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ArtifactPreview url={preview.idUrl} label={t('governanceHub.stewardIdentity.idDocument')} missing={t('governanceHub.stewardIdentity.missingArtifact')} />
        <ArtifactPreview url={preview.selfieUrl} label={t('governanceHub.stewardIdentity.selfie')} missing={t('governanceHub.stewardIdentity.missingArtifact')} />
      </div>

      <div>
        <Button type="button" size="sm" variant="link" className="h-auto px-0" aria-expanded={showHistory} onClick={() => setShowHistory((v) => !v)}>
          {t('identityReview.historyToggle')}
          {item.noteCount > 0 ? ` (${item.noteCount})` : ''}
        </Button>
        {showHistory ? <IdentityReviewHistory caseId={item.caseId} onNoteAdded={onChanged} /> : null}
      </div>
    </Card>
  );
}
