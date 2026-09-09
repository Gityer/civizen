import { useEffect, useState } from 'react';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  createSignedIdentityArtifactUrl,
  latestArtifactOfKind,
  listPendingIdentityVerificationCases,
  reviewIdentityVerificationCase,
  type PendingIdentityVerificationCase,
} from '@/lib/identity-verification';
import { getVerificationCaseBadgeClassName, getVerificationCaseStatusLabelKey } from '@/lib/verification-workflow';

type ArtifactPreview = {
  idUrl: string | null;
  selfieUrl: string | null;
};

function canManageIdentityReviews(effectivePermissions: string[] | null | undefined): boolean {
  const permissions = effectivePermissions ?? [];
  return permissions.includes('role.assign') || permissions.includes('settings.manage');
}

export function StewardConsoleIdentityVerification() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [cases, setCases] = useState<PendingIdentityVerificationCase[]>([]);
  const [previews, setPreviews] = useState<Record<string, ArtifactPreview>>({});
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const canManage = canManageIdentityReviews(profile?.effective_permissions);

  const loadData = async () => {
    if (!canManage) {
      setCases([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const pending = await listPendingIdentityVerificationCases();
      setCases(pending);

      const nextPreviews: Record<string, ArtifactPreview> = {};
      await Promise.all(
        pending.map(async (item) => {
          const idArtifact = latestArtifactOfKind(item.artifacts, 'supporting_document');
          const selfieArtifact = latestArtifactOfKind(item.artifacts, 'live_presence');
          const [idUrl, selfieUrl] = await Promise.all([
            idArtifact?.storage_path
              ? createSignedIdentityArtifactUrl(idArtifact.storage_path).catch(() => null)
              : Promise.resolve(null),
            selfieArtifact?.storage_path
              ? createSignedIdentityArtifactUrl(selfieArtifact.storage_path).catch(() => null)
              : Promise.resolve(null),
          ]);
          nextPreviews[item.caseRow.id] = { idUrl, selfieUrl };
        }),
      );
      setPreviews(nextPreviews);
    } catch (error) {
      console.error('Error loading identity verifications:', error);
      toast.error(t('governanceHub.stewardIdentity.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when permission/profile identity changes
  }, [canManage, profile?.id]);

  const handleDecision = async (
    caseId: string,
    decision: 'approved' | 'rejected',
  ) => {
    if (!profile?.id) return;
    setProcessingId(caseId);
    try {
      await reviewIdentityVerificationCase({
        caseId,
        reviewerId: profile.id,
        decision,
        notes:
          decision === 'approved'
            ? t('governanceHub.stewardIdentity.approvedNote')
            : t('governanceHub.stewardIdentity.rejectedNote'),
      });
      toast.success(
        t(
          decision === 'approved'
            ? 'governanceHub.stewardIdentity.approveSuccess'
            : 'governanceHub.stewardIdentity.rejectSuccess',
        ),
      );
      await loadData();
    } catch (error) {
      console.error(`Error ${decision} verification:`, error);
      toast.error(t('governanceHub.stewardIdentity.reviewFailed'));
    } finally {
      setProcessingId(null);
    }
  };

  if (!canManage) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">{t('governanceHub.stewardIdentity.notAuthorized')}</p>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{t('governanceHub.stewardIdentity.title')}</h3>
        <Badge variant="outline">{t('governanceHub.stewardIdentity.pendingCount', { count: cases.length })}</Badge>
      </div>

      {cases.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">{t('governanceHub.stewardIdentity.empty')}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {cases.map((item) => {
            const preview = previews[item.caseRow.id];
            const displayName =
              item.profileFullName || item.profileUsername || t('common.anonymousUser');
            return (
              <Card key={item.caseRow.id} className="space-y-4 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-medium">{displayName}</h4>
                      <Badge
                        variant="outline"
                        className={getVerificationCaseBadgeClassName(item.caseRow.status)}
                      >
                        {t(getVerificationCaseStatusLabelKey(item.caseRow.status))}
                      </Badge>
                    </div>
                    {item.profileUsername ? (
                      <p className="text-sm text-muted-foreground">@{item.profileUsername}</p>
                    ) : null}
                    {item.caseRow.submitted_at ? (
                      <p className="text-xs text-muted-foreground">
                        {t('governanceHub.stewardIdentity.submittedAt', {
                          date: new Date(item.caseRow.submitted_at).toLocaleString(),
                        })}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      disabled={processingId === item.caseRow.id}
                      onClick={() => void handleDecision(item.caseRow.id, 'approved')}
                      aria-label={t('governanceHub.stewardIdentity.approve')}
                      title={t('governanceHub.stewardIdentity.approve')}
                    >
                      {processingId === item.caseRow.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <CheckCircle className="h-4 w-4" aria-hidden />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-destructive"
                      disabled={processingId === item.caseRow.id}
                      onClick={() => void handleDecision(item.caseRow.id, 'rejected')}
                      aria-label={t('governanceHub.stewardIdentity.reject')}
                      title={t('governanceHub.stewardIdentity.reject')}
                    >
                      <XCircle className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t('governanceHub.stewardIdentity.idDocument')}
                    </p>
                    {preview?.idUrl ? (
                      <a href={preview.idUrl} target="_blank" rel="noreferrer" className="block">
                        <img
                          src={preview.idUrl}
                          alt={t('governanceHub.stewardIdentity.idDocument')}
                          className="max-h-48 w-full rounded-xl border object-contain bg-muted/30"
                        />
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {t('governanceHub.stewardIdentity.missingArtifact')}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t('governanceHub.stewardIdentity.selfie')}
                    </p>
                    {preview?.selfieUrl ? (
                      <a href={preview.selfieUrl} target="_blank" rel="noreferrer" className="block">
                        <img
                          src={preview.selfieUrl}
                          alt={t('governanceHub.stewardIdentity.selfie')}
                          className="max-h-48 w-full rounded-xl border object-contain bg-muted/30"
                        />
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {t('governanceHub.stewardIdentity.missingArtifact')}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
