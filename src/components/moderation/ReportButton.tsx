import { useState } from 'react';
import { Flag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { permissionListHasAny } from '@/lib/access-control';
import type { ModerationTargetKind } from '@/lib/moderation';

import { ReportContentDialog } from './ReportContentDialog';

type ReportButtonProps = {
  targetKind: ModerationTargetKind;
  targetId: string;
  /** The author's profile id; the button is hidden on the viewer's own content. */
  authorProfileId?: string | null;
  subject?: string;
  className?: string;
};

/** A compact flag icon that opens the report dialog; shown only to signed-in members who may report. */
export function ReportButton({ targetKind, targetId, authorProfileId, subject, className }: ReportButtonProps) {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const canReport = Boolean(profile?.id) && permissionListHasAny(profile?.effective_permissions ?? [], ['report.create']);
  if (!canReport || (authorProfileId && authorProfileId === profile?.id)) return null;

  const label = t('moderation.report.action');
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={className ?? 'h-7 w-7 shrink-0 rounded-md p-0 text-muted-foreground hover:text-foreground'}
        aria-label={label}
        title={label}
        data-testid={`report-${targetKind}-${targetId}`}
        onClick={() => setOpen(true)}
      >
        <Flag className="h-3.5 w-3.5" />
      </Button>
      {open ? (
        <ReportContentDialog open={open} onOpenChange={setOpen} targetKind={targetKind} targetId={targetId} subject={subject} />
      ) : null}
    </>
  );
}
