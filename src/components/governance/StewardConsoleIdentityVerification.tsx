import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { assignIdentityVerificationCase, reviewIdentityVerificationCase } from '@/lib/identity-verification';
import {
  canReviewIdentityVerification,
  filterIdentityReviewQueue,
  isIdentityReviewOverdue,
  listIdentityReviewQueue,
  releaseIdentityVerificationCase,
  requestIdentityVerificationInfo,
  type IdentityReviewQueueFilter,
  type IdentityReviewQueueItem,
  type IdentityReviewReasonCode,
} from '@/lib/identity-verification-queue';
import { IdentityReviewCaseCard, type IdentityReviewCaseAction } from './identity-review/IdentityReviewCaseCard';
import { IdentityReviewReasonDialog, type IdentityReviewReasonMode } from './identity-review/IdentityReviewReasonDialog';

const FILTERS: IdentityReviewQueueFilter[] = ['all', 'unassigned', 'mine', 'overdue'];

/**
 * Identity verification queue for staff and Identity Verification domain reviewers (v2 step C1):
 * oldest first, age against the 48 h target, take/release, approve, reject or ask for more
 * information with a reason code, internal notes and history.
 */
export function StewardConsoleIdentityVerification() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [items, setItems] = useState<IdentityReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<IdentityReviewQueueFilter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ mode: IdentityReviewReasonMode; item: IdentityReviewQueueItem } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const canReview = await canReviewIdentityVerification();
      setAllowed(canReview);
      setItems(canReview ? await listIdentityReviewQueue() : []);
    } catch {
      toast.error(t('governanceHub.stewardIdentity.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load, profile?.id]);

  const visible = useMemo(() => filterIdentityReviewQueue(items, filter, profile?.id), [items, filter, profile?.id]);
  const overdueCount = useMemo(() => items.filter((item) => isIdentityReviewOverdue(item.ageHours)).length, [items]);

  const run = async (item: IdentityReviewQueueItem, work: () => Promise<void>, successKey: string) => {
    setBusyId(item.caseId);
    try {
      await work();
      toast.success(t(successKey));
      setDialog(null);
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      toast.error(
        message.includes('duplicate_identity')
          ? t('governanceHub.stewardIdentity.duplicateIdentity')
          : t('identityReview.actionFailed'),
      );
    } finally {
      setBusyId(null);
    }
  };

  const onAction = (item: IdentityReviewQueueItem, action: IdentityReviewCaseAction) => {
    if (action === 'reject' || action === 'requestInfo') {
      setDialog({ mode: action, item });
      return;
    }
    if (action === 'claim') void run(item, () => assignIdentityVerificationCase(item.caseId), 'identityReview.claimed');
    if (action === 'release') void run(item, () => releaseIdentityVerificationCase(item.caseId), 'identityReview.released');
    if (action === 'approve' && profile?.id) {
      const reviewerId = profile.id;
      void run(
        item,
        () => reviewIdentityVerificationCase({ caseId: item.caseId, reviewerId, decision: 'approved', notes: t('governanceHub.stewardIdentity.approvedNote') }),
        'governanceHub.stewardIdentity.approveSuccess',
      );
    }
  };

  const submitDialog = (reasonCode: IdentityReviewReasonCode, message: string) => {
    if (!dialog || !profile?.id) return;
    const { item, mode } = dialog;
    const reviewerId = profile.id;
    if (mode === 'reject') {
      void run(item, () => reviewIdentityVerificationCase({ caseId: item.caseId, reviewerId, decision: 'rejected', notes: message, reasonCode }), 'identityReview.rejected');
    } else {
      void run(item, () => requestIdentityVerificationInfo(item.caseId, reasonCode, message), 'identityReview.requestSent');
    }
  };

  if (loading && allowed === null) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">{t('governanceHub.stewardIdentity.notAuthorized')}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{t('governanceHub.stewardIdentity.title')}</h3>
        <div className="flex gap-2">
          <Badge variant="outline">{t('governanceHub.stewardIdentity.pendingCount', { count: items.length })}</Badge>
          {overdueCount > 0 ? <Badge variant="destructive">{t('identityReview.overdue')}: {overdueCount}</Badge> : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label={t('identityReview.filterLabel')}>
        {FILTERS.map((option) => (
          <Button key={option} size="sm" variant={filter === option ? 'default' : 'outline'} aria-pressed={filter === option}
            onClick={() => setFilter(option)} data-testid={`identity-review-filter-${option}`}>
            {t(`identityReview.filters.${option}`)}
          </Button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">{t('governanceHub.stewardIdentity.empty')}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => (
            <IdentityReviewCaseCard key={item.caseId} item={item} selfId={profile?.id} busy={busyId === item.caseId}
              onAction={onAction} onChanged={() => void load()} />
          ))}
        </div>
      )}

      <IdentityReviewReasonDialog
        mode={dialog?.mode ?? 'reject'}
        open={dialog !== null}
        busy={busyId !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        onSubmit={submitDialog}
      />
    </div>
  );
}
