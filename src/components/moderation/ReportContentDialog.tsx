import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  MODERATION_REASON_CODES,
  moderationErrorKey,
  reportContent,
  type ModerationReasonCode,
  type ModerationTargetKind,
} from '@/lib/moderation';

type ReportContentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetKind: ModerationTargetKind;
  targetId: string;
  /** Optional context line, e.g. the member's name. */
  subject?: string;
};

/** One report dialog for every reportable item (v2 step A6): a reason, optional details, the guidelines link. */
export function ReportContentDialog({ open, onOpenChange, targetKind, targetId, subject }: ReportContentDialogProps) {
  const { t } = useLanguage();
  const [reason, setReason] = useState<ModerationReasonCode | ''>('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
      await reportContent(targetKind, targetId, reason, details);
      toast.success(t('moderation.report.submitted'));
      setReason('');
      setDetails('');
      onOpenChange(false);
    } catch (error) {
      toast.error(t(moderationErrorKey(error instanceof Error ? error.message : '')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="report-content-dialog">
        <DialogHeader>
          <DialogTitle>{t('moderation.report.title')}</DialogTitle>
          <DialogDescription>
            {subject ? `${t(`moderation.kinds.${targetKind}`)}: ${subject}. ` : ''}
            {t('moderation.report.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('moderation.report.reasonLabel')}</Label>
          <RadioGroup value={reason} onValueChange={(value) => setReason(value as ModerationReasonCode)} className="gap-1.5">
            {MODERATION_REASON_CODES.map((code) => (
              <div key={code} className="flex items-center gap-2">
                <RadioGroupItem value={code} id={`report-reason-${code}`} data-testid={`report-reason-${code}`} />
                <Label htmlFor={`report-reason-${code}`} className="text-sm font-normal">
                  {t(`moderation.reasons.${code}`)}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        <Textarea
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          placeholder={t('moderation.report.detailsPlaceholder')}
          rows={3}
          maxLength={2000}
          data-testid="report-content-details"
        />
        <Link to="/guidelines" className="text-xs text-primary hover:underline">
          {t('moderation.report.guidelines')}
        </Link>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={submitting || !reason} data-testid="report-content-submit">
            {t('moderation.report.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
