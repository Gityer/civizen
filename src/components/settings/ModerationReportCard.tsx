import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { isOpenReport, type ModerationReport, type ReportStatus } from '@/lib/moderation-queue';

type Props = {
  report: ModerationReport;
  canRemovePosts: boolean;
  busy: boolean;
  onStatus: (report: ModerationReport, status: ReportStatus, notes: string) => void;
  onRemovePost: (report: ModerationReport, notes: string) => void;
};

export function ModerationReportCard({ report, canRemovePosts, busy, onStatus, onRemovePost }: Props) {
  const { t, language } = useLanguage();
  const [notes, setNotes] = useState(report.adminNotes ?? '');
  const open = isOpenReport(report.status);
  const formatter = new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <Card className="space-y-3 border-border/80 p-4" data-testid="moderation-report">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{t(`settings.moderation.source.${report.source}`)}</Badge>
        {report.category ? <Badge variant="outline">{t(`settings.reportUser.categories.${report.category}`)}</Badge> : null}
        <Badge variant={open ? 'default' : 'outline'}>{t(`settings.moderation.status.${report.status}`)}</Badge>
        <time className="ml-auto text-xs text-muted-foreground" dateTime={report.createdAt}>
          {formatter.format(new Date(report.createdAt))}
        </time>
      </div>

      <div className="space-y-1 text-sm">
        <p>
          <span className="text-muted-foreground">{t('settings.moderation.reported')}: </span>
          {report.reportedUsername ? (
            <Link className="font-medium text-primary underline-offset-2 hover:underline" to={`/u/${report.reportedUsername}`}>
              {report.reportedName}
            </Link>
          ) : (
            <span className="font-medium">{report.reportedName ?? t('settings.safetyPage.unknownPerson')}</span>
          )}
        </p>
        <p>
          <span className="text-muted-foreground">{t('settings.moderation.reporter')}: </span>
          {report.reporterName ?? t('settings.safetyPage.unknownPerson')}
        </p>
      </div>

      <p className="whitespace-pre-wrap text-sm">{report.reason}</p>
      {report.excerpt ? (
        <blockquote className="border-l-2 border-border pl-3 text-sm text-muted-foreground">{report.excerpt}</blockquote>
      ) : null}

      {open ? (
        <>
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={t('settings.moderation.notesPlaceholder')}
            aria-label={t('settings.moderation.notesPlaceholder')}
            rows={2}
          />
          <div className="flex flex-wrap gap-2">
            {report.postId && canRemovePosts ? (
              <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => onRemovePost(report, notes)}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('settings.moderation.removePost')}
              </Button>
            ) : null}
            <Button type="button" size="sm" disabled={busy} onClick={() => onStatus(report, 'resolved', notes)}>
              {t('settings.moderation.resolve')}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onStatus(report, 'dismissed', notes)}>
              {t('settings.moderation.dismiss')}
            </Button>
            {report.status === 'pending' ? (
              <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => onStatus(report, 'reviewed', notes)}>
                {t('settings.moderation.markReviewed')}
              </Button>
            ) : null}
          </div>
        </>
      ) : report.adminNotes ? (
        <p className="whitespace-pre-wrap text-xs text-muted-foreground">{report.adminNotes}</p>
      ) : null}
    </Card>
  );
}
