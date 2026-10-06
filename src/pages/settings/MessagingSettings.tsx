import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { permissionListHasAny } from '@/lib/access-control';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, Cloud, Database, Loader2, MessageCircle, Shield } from 'lucide-react';
import { toast } from 'sonner';

const BACKUP_NONE = 'none' as const;

const BACKUP_VALUES = [
  BACKUP_NONE,
  'device_only',
  'google_drive',
  'dropbox',
  'onedrive',
  'icloud',
  'other',
] as const;

type BackupValue = (typeof BACKUP_VALUES)[number];

type MessagingReportRow = {
  id: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  admin_notes: string | null;
  report_context: Record<string, unknown> | null;
  created_at: string;
  resolved_at: string | null;
  reporter_name: string;
  reporter_username: string | null;
  reported_name: string;
  reported_username: string | null;
};

function isCloudBackup(value: string): boolean {
  return ['google_drive', 'dropbox', 'onedrive', 'icloud', 'other'].includes(value);
}

const DEFAULT_RELAY_DAYS = 30;
const DEFAULT_RELAY_MB = 5;
const MIN_RELAY_DAYS = 1;
const MAX_RELAY_DAYS = 365;
const MIN_RELAY_MB = 1;
const MAX_RELAY_MB = 200;

export default function MessagingSettings() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backupProvider, setBackupProvider] = useState<BackupValue>(BACKUP_NONE);
  const [backupNote, setBackupNote] = useState('');
  const [relayDays, setRelayDays] = useState(String(DEFAULT_RELAY_DAYS));
  const [relayMb, setRelayMb] = useState(String(DEFAULT_RELAY_MB));
  const [moderationReports, setModerationReports] = useState<MessagingReportRow[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportSavingId, setReportSavingId] = useState<string | null>(null);
  const [reportStatusFilter, setReportStatusFilter] = useState<'all' | MessagingReportRow['status']>('all');
  const [reportSearch, setReportSearch] = useState('');

  const canSeeOperatorNote = useMemo(
    () => permissionListHasAny(profile?.effective_permissions || [], ['settings.manage']),
    [profile?.effective_permissions],
  );
  const canReviewReports = useMemo(
    () => permissionListHasAny(profile?.effective_permissions || [], ['report.review', 'settings.manage']),
    [profile?.effective_permissions],
  );

  const load = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'messaging_backup_provider, messaging_backup_note, messaging_server_retention_days, messaging_server_retention_max_kb',
      )
      .eq('id', profile.id)
      .single();

    if (error || !data) {
      setLoading(false);
      return;
    }

    const provRaw = (data.messaging_backup_provider as string | null) ?? '';
    const prov =
      provRaw && BACKUP_VALUES.includes(provRaw as BackupValue) ? (provRaw as BackupValue) : BACKUP_NONE;
    setBackupProvider(prov);
    setBackupNote((data.messaging_backup_note as string | null) ?? '');
    const d = data.messaging_server_retention_days as number | null;
    const kb = data.messaging_server_retention_max_kb as number | null;
    setRelayDays(String(d ?? DEFAULT_RELAY_DAYS));
    setRelayMb(String(kb != null ? Math.max(1, Math.round(kb / 1024)) : DEFAULT_RELAY_MB));
    if (canReviewReports) {
      setReportsLoading(true);
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select(
          'id, reason, status, admin_notes, report_context, created_at, resolved_at, reporter:profiles!reports_reporter_id_fkey(full_name, username), reported:profiles!reports_reported_user_id_fkey(full_name, username)',
        )
        .order('created_at', { ascending: false })
        .limit(100);
      setReportsLoading(false);
      if (!reportsError && Array.isArray(reportsData)) {
        const mapped = reportsData.map((row) => {
          const rr = row as unknown as Record<string, unknown>;
          const reporter = (rr.reporter as Record<string, unknown> | null) ?? null;
          const reported = (rr.reported as Record<string, unknown> | null) ?? null;
          return {
            id: String(rr.id ?? ''),
            reason: String(rr.reason ?? ''),
            status: (String(rr.status ?? 'pending') as MessagingReportRow['status']),
            admin_notes: rr.admin_notes ? String(rr.admin_notes) : null,
            report_context:
              rr.report_context && typeof rr.report_context === 'object'
                ? (rr.report_context as Record<string, unknown>)
                : null,
            created_at: String(rr.created_at ?? ''),
            resolved_at: rr.resolved_at ? String(rr.resolved_at) : null,
            reporter_name: reporter?.full_name ? String(reporter.full_name) : t('chatBar.anonymous'),
            reporter_username: reporter?.username ? String(reporter.username) : null,
            reported_name: reported?.full_name ? String(reported.full_name) : t('chatBar.anonymous'),
            reported_username: reported?.username ? String(reported.username) : null,
          };
        });
        setModerationReports(mapped.filter((x) => x.id));
      } else if (reportsError) {
        toast.error(t('settings.messagingReportsLoadFailed'));
      }
    }
    setLoading(false);
  }, [canReviewReports, profile?.id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const needsRelayLimits = !isCloudBackup(backupProvider);

  const save = async () => {
    if (!profile?.id) return;
    setSaving(true);
    try {
      let days: number | null = null;
      let maxKb: number | null = null;

      if (needsRelayLimits) {
        const d = Number.parseInt(relayDays, 10);
        const mb = Number.parseInt(relayMb, 10);
        if (!Number.isFinite(d) || d < MIN_RELAY_DAYS || d > MAX_RELAY_DAYS) {
          toast.error(t('settings.messagingRelayDaysInvalid'));
          setSaving(false);
          return;
        }
        if (!Number.isFinite(mb) || mb < MIN_RELAY_MB || mb > MAX_RELAY_MB) {
          toast.error(t('settings.messagingRelayMbInvalid'));
          setSaving(false);
          return;
        }
        days = d;
        maxKb = mb * 1024;
      }

      const providerPayload = backupProvider === BACKUP_NONE ? null : backupProvider;
      const { error } = await supabase
        .from('profiles')
        .update({
          messaging_backup_provider: providerPayload,
          messaging_backup_note: backupNote.trim() || null,
          messaging_server_retention_days: days,
          messaging_server_retention_max_kb: maxKb,
        })
        .eq('id', profile.id);

      if (error) {
        toast.error(t('settings.messagingPreferencesSaveFailed'));
        return;
      }
      toast.success(t('settings.messagingPreferencesSaved'));
      await refreshProfile();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const updateModerationReport = async (
    reportId: string,
    patch: Partial<Pick<MessagingReportRow, 'status' | 'admin_notes'>>,
  ) => {
    setReportSavingId(reportId);
    const nextStatus = patch.status ?? moderationReports.find((r) => r.id === reportId)?.status ?? 'pending';
    const resolvedAt =
      nextStatus === 'resolved' || nextStatus === 'dismissed' ? new Date().toISOString() : null;
    const { error } = await supabase
      .from('reports')
      .update({
        status: nextStatus,
        admin_notes: patch.admin_notes ?? moderationReports.find((r) => r.id === reportId)?.admin_notes ?? null,
        resolved_at: resolvedAt,
      })
      .eq('id', reportId);
    setReportSavingId(null);
    if (error) {
      toast.error(t('settings.messagingReportsSaveFailed'));
      return;
    }
    setModerationReports((prev) =>
      prev.map((row) =>
        row.id === reportId
          ? {
              ...row,
              status: nextStatus,
              admin_notes:
                patch.admin_notes ?? moderationReports.find((r) => r.id === reportId)?.admin_notes ?? null,
              resolved_at: resolvedAt,
            }
          : row,
      ),
    );
    toast.success(t('settings.messagingReportsSaved'));
  };

  const filteredModerationReports = useMemo(() => {
    let rows = moderationReports;
    if (reportStatusFilter !== 'all') {
      rows = rows.filter((row) => row.status === reportStatusFilter);
    }
    const q = reportSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const contextText =
        row.report_context && typeof row.report_context === 'object'
          ? JSON.stringify(row.report_context).toLowerCase()
          : '';
      return (
        row.reason.toLowerCase().includes(q) ||
        row.reporter_name.toLowerCase().includes(q) ||
        row.reported_name.toLowerCase().includes(q) ||
        (row.reporter_username || '').toLowerCase().includes(q) ||
        (row.reported_username || '').toLowerCase().includes(q) ||
        contextText.includes(q)
      );
    });
  }, [moderationReports, reportSearch, reportStatusFilter]);

  const filteredMessageLevelReports = useMemo(
    () =>
      filteredModerationReports.filter(
        (row) =>
          row.report_context?.source === 'private_message' &&
          typeof row.report_context?.conversation_id === 'string' &&
          typeof row.report_context?.message_id === 'string',
      ),
    [filteredModerationReports],
  );

  const [activeMessageReviewIndex, setActiveMessageReviewIndex] = useState(0);

  useEffect(() => {
    if (filteredMessageLevelReports.length === 0) {
      setActiveMessageReviewIndex(0);
      return;
    }
    if (activeMessageReviewIndex >= filteredMessageLevelReports.length) {
      setActiveMessageReviewIndex(filteredMessageLevelReports.length - 1);
    }
  }, [activeMessageReviewIndex, filteredMessageLevelReports.length]);

  return (
    <AppLayout>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-6">
        <AppPageHeader
          title={t('settings.messagingPreferencesTitle')}
          subtitle={t('settings.messagingPreferencesSubtitle')}
          fallbackPath="/settings"
          leading={
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MessageCircle className="h-6 w-6" />
            </div>
          }
        />

        <Card className="border-border/80 p-0 overflow-hidden">
          <button
            type="button"
            className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/40"
            onClick={() => navigate('/settings/messaging-security')}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{t('settings.messagingPreferencesEncryptionLink')}</p>
              <p className="text-xs text-muted-foreground">{t('settings.messagingPreferencesEncryptionHint')}</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </button>
        </Card>

        {!profile?.id ? (
          <p className="text-sm text-muted-foreground">{t('settings.messagingPreferencesSignIn')}</p>
        ) : loading ? (
          <div className="flex justify-center py-8 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <Card className="space-y-4 border-border/80 p-4">
              <div className="flex items-start gap-2">
                <Cloud className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{t('settings.messagingBackupSectionTitle')}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t('settings.messagingBackupSectionBody')}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="messaging-backup-provider">{t('settings.messagingBackupProviderLabel')}</Label>
                <Select
                  value={backupProvider}
                  onValueChange={(v) => setBackupProvider(v as BackupValue)}
                >
                  <SelectTrigger id="messaging-backup-provider" className="w-full">
                    <SelectValue placeholder={t('settings.messagingBackupProviderPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={BACKUP_NONE}>{t('settings.messagingBackupNone')}</SelectItem>
                    <SelectItem value="device_only">{t('settings.messagingBackupDevice')}</SelectItem>
                    <SelectItem value="google_drive">{t('settings.messagingBackupGoogleDrive')}</SelectItem>
                    <SelectItem value="dropbox">{t('settings.messagingBackupDropbox')}</SelectItem>
                    <SelectItem value="onedrive">{t('settings.messagingBackupOnedrive')}</SelectItem>
                    <SelectItem value="icloud">{t('settings.messagingBackupIcloud')}</SelectItem>
                    <SelectItem value="other">{t('settings.messagingBackupOther')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="messaging-backup-note">{t('settings.messagingBackupNoteLabel')}</Label>
                <Input
                  id="messaging-backup-note"
                  value={backupNote}
                  onChange={(e) => setBackupNote(e.target.value)}
                  placeholder={t('settings.messagingBackupNotePlaceholder')}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">{t('settings.messagingBackupNoteHelp')}</p>
              </div>
            </Card>

            <Card className="space-y-4 border-border/80 p-4">
              <div className="flex items-start gap-2">
                <Database className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{t('settings.messagingRelaySectionTitle')}</p>
                  {needsRelayLimits ? (
                    <p className="text-xs text-muted-foreground leading-relaxed">{t('settings.messagingRelaySectionBody')}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground leading-relaxed">{t('settings.messagingRelaySectionCloud')}</p>
                  )}
                </div>
              </div>

              {needsRelayLimits ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="messaging-relay-days">{t('settings.messagingRelayDaysLabel')}</Label>
                    <Input
                      id="messaging-relay-days"
                      type="number"
                      min={MIN_RELAY_DAYS}
                      max={MAX_RELAY_DAYS}
                      value={relayDays}
                      onChange={(e) => setRelayDays(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="messaging-relay-mb">{t('settings.messagingRelayMbLabel')}</Label>
                    <Input
                      id="messaging-relay-mb"
                      type="number"
                      min={MIN_RELAY_MB}
                      max={MAX_RELAY_MB}
                      value={relayMb}
                      onChange={(e) => setRelayMb(e.target.value)}
                    />
                  </div>
                </div>
              ) : null}

              <p className="text-xs text-muted-foreground leading-relaxed">{t('settings.messagingRelayAutomationNote')}</p>
            </Card>

            {canSeeOperatorNote ? (
              <Card className="space-y-2 border-border/80 border-dashed p-4">
                <p className="text-sm font-medium text-foreground">{t('settings.messagingOperatorCardTitle')}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{t('settings.messagingOperatorCardBody')}</p>
              </Card>
            ) : null}

            {canReviewReports ? (
              <Card className="space-y-3 border-border/80 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{t('settings.messagingReportsTitle')}</p>
                  <p className="text-xs text-muted-foreground">{t('settings.messagingReportsSubtitle')}</p>
                </div>
                {reportsLoading ? (
                  <div className="flex justify-center py-6 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : moderationReports.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t('settings.messagingReportsEmpty')}</p>
                ) : (
                  <div className="space-y-3">
                    <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
                      <Select
                        value={reportStatusFilter}
                        onValueChange={(value) => setReportStatusFilter(value as typeof reportStatusFilter)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t('settings.messagingReportsStatusLabel')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">all</SelectItem>
                          <SelectItem value="pending">pending</SelectItem>
                          <SelectItem value="reviewed">reviewed</SelectItem>
                          <SelectItem value="resolved">resolved</SelectItem>
                          <SelectItem value="dismissed">dismissed</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={reportSearch}
                        onChange={(event) => setReportSearch(event.target.value)}
                        placeholder={t('settings.messagingReportsSearchPlaceholder')}
                      />
                    </div>
                    {filteredMessageLevelReports.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-muted/20 px-2 py-2">
                        <p className="text-xs text-muted-foreground">
                          {t('settings.messagingReportsQuickReviewLabel', {
                            current: activeMessageReviewIndex + 1,
                            total: filteredMessageLevelReports.length,
                          })}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() =>
                            setActiveMessageReviewIndex((prev) =>
                              prev > 0 ? prev - 1 : filteredMessageLevelReports.length - 1,
                            )
                          }
                        >
                          {t('settings.messagingReportsPrevious')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() =>
                            setActiveMessageReviewIndex((prev) =>
                              prev < filteredMessageLevelReports.length - 1 ? prev + 1 : 0,
                            )
                          }
                        >
                          {t('settings.messagingReportsNext')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            const row = filteredMessageLevelReports[activeMessageReviewIndex];
                            const conversationId = String(row.report_context?.conversation_id);
                            const messageId = String(row.report_context?.message_id);
                            navigate(`/messaging/${conversationId}?focusMessageId=${encodeURIComponent(messageId)}`);
                          }}
                        >
                          {t('settings.messagingReportsOpenCurrent')}
                        </Button>
                      </div>
                    ) : null}
                    {filteredModerationReports.length === 0 ? (
                      <p className="text-xs text-muted-foreground">{t('settings.messagingReportsFilteredEmpty')}</p>
                    ) : null}
                    {filteredModerationReports.map((row) => (
                      <div key={row.id} className="rounded-xl border border-border/70 p-3 space-y-2">
                        <p className="text-xs text-muted-foreground">
                          {new Date(row.created_at).toLocaleString()}
                        </p>
                        {row.report_context?.source === 'private_message' ? (
                          <div className="rounded-md border border-border/70 bg-muted/20 px-2 py-1.5 text-[11px] text-muted-foreground">
                            {t('settings.messagingReportsMessageContextLabel')} •{' '}
                            {String(row.report_context?.message_id ?? '')}
                            {typeof row.report_context?.message_excerpt === 'string'
                              ? ` • ${String(row.report_context.message_excerpt)}`
                              : ''}
                          </div>
                        ) : null}
                        {row.report_context?.source === 'private_message' &&
                        typeof row.report_context?.conversation_id === 'string' &&
                        typeof row.report_context?.message_id === 'string' ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-8 w-fit px-2 text-xs"
                            onClick={() =>
                              navigate(
                                `/messaging/${row.report_context?.conversation_id}?focusMessageId=${encodeURIComponent(
                                  String(row.report_context?.message_id),
                                )}`,
                              )
                            }
                          >
                            {t('settings.messagingReportsOpenInConversation')}
                          </Button>
                        ) : null}
                        <p className="text-sm text-foreground whitespace-pre-wrap">{row.reason}</p>
                        <p className="text-xs text-muted-foreground">
                          {t('settings.messagingReportsReporterLabel')}: {row.reporter_name}
                          {row.reporter_username ? ` (@${row.reporter_username})` : ''} •{' '}
                          {t('settings.messagingReportsReportedLabel')}: {row.reported_name}
                          {row.reported_username ? ` (@${row.reported_username})` : ''}
                        </p>
                        <div className="space-y-2">
                          <Label>{t('settings.messagingReportsStatusLabel')}</Label>
                          <Select
                            value={row.status}
                            onValueChange={(value) =>
                              setModerationReports((prev) =>
                                prev.map((item) =>
                                  item.id === row.id
                                    ? { ...item, status: value as MessagingReportRow['status'] }
                                    : item,
                                ),
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">pending</SelectItem>
                              <SelectItem value="reviewed">reviewed</SelectItem>
                              <SelectItem value="resolved">resolved</SelectItem>
                              <SelectItem value="dismissed">dismissed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t('settings.messagingReportsNotesLabel')}</Label>
                          <Textarea
                            value={row.admin_notes ?? ''}
                            onChange={(event) =>
                              setModerationReports((prev) =>
                                prev.map((item) =>
                                  item.id === row.id
                                    ? { ...item, admin_notes: event.target.value }
                                    : item,
                                ),
                              )
                            }
                            rows={3}
                            maxLength={1000}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={reportSavingId === row.id}
                          onClick={() =>
                            void updateModerationReport(row.id, {
                              status: row.status,
                              admin_notes: row.admin_notes ?? null,
                            })
                          }
                        >
                          {reportSavingId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          {t('settings.messagingReportsSaveAction')}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ) : null}

            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t('settings.messagingPreferencesSave')}
            </Button>
          </>
        )}
      </div>
    </AppLayout>
  );
}
