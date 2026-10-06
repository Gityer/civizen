import { useCallback, useEffect, useState } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { ModerationReportCard } from '@/components/settings/ModerationReportCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { permissionListHas } from '@/lib/access-control';
import {
  fetchModerationReports,
  removeReportedPost,
  setReportStatus,
  type ModerationFilter,
  type ModerationReport,
  type ReportStatus,
} from '@/lib/moderation-queue';

/** Reports from members about people, posts and messages, for reviewers with report.review. */
export default function ModerationConsole() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [filter, setFilter] = useState<ModerationFilter>('open');
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const canRemovePosts = permissionListHas(profile?.effective_permissions || [], 'post.moderate');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchModerationReports(filter);
    setFailed(Boolean(error));
    setReports(error ? [] : data);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const finish = (report: ModerationReport, status: ReportStatus, notes: string) => {
    if (filter === 'open' && status !== 'reviewed') {
      setReports((current) => current.filter((item) => item.id !== report.id));
    } else {
      setReports((current) => current.map((item) => (
        item.id === report.id ? { ...item, status, adminNotes: notes.trim() || null } : item
      )));
    }
    toast.success(t('settings.moderation.saved'));
  };

  const handleStatus = async (report: ModerationReport, status: ReportStatus, notes: string) => {
    setBusyId(report.id);
    const { error } = await setReportStatus(report.id, status, notes);
    setBusyId(null);
    if (error) {
      toast.error(t('settings.moderation.saveFailed'));
      return;
    }
    finish(report, status, notes);
  };

  const handleRemovePost = async (report: ModerationReport, notes: string) => {
    if (!window.confirm(t('settings.moderation.removePostConfirm'))) return;
    setBusyId(report.id);
    const { error } = await removeReportedPost(report.id, notes);
    setBusyId(null);
    if (error) {
      toast.error(t('settings.moderation.saveFailed'));
      return;
    }
    finish(report, 'resolved', notes);
  };

  return (
    <AppLayout>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
        <AppPageHeader
          title={t('settings.moderation.title')}
          subtitle={t('settings.moderation.subtitle')}
          fallbackPath="/settings"
          leading={
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Flag className="h-6 w-6" />
            </div>
          }
        />

        <Tabs value={filter} onValueChange={(value) => setFilter(value as ModerationFilter)}>
          <TabsList>
            <TabsTrigger value="open">{t('settings.moderation.open')}</TabsTrigger>
            <TabsTrigger value="closed">{t('settings.moderation.closed')}</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex justify-center py-10" role="status" aria-live="polite">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : failed ? (
          <Card className="space-y-3 border-border/80 p-4 text-sm">
            <p>{t('settings.moderation.loadFailed')}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
              {t('settings.notificationsPage.retry')}
            </Button>
          </Card>
        ) : reports.length === 0 ? (
          <Card className="border-border/80 p-6 text-center text-sm text-muted-foreground">
            {t(filter === 'open' ? 'settings.moderation.emptyOpen' : 'settings.moderation.emptyClosed')}
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {reports.map((report) => (
              <ModerationReportCard
                key={report.id}
                report={report}
                canRemovePosts={canRemovePosts}
                busy={busyId === report.id}
                onStatus={(item, status, notes) => void handleStatus(item, status, notes)}
                onRemovePost={(item, notes) => void handleRemovePost(item, notes)}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
