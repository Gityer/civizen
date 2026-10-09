import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

type ReportUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reporterProfileId: string;
  reportedProfileId: string;
  reportedName: string;
};

/** Report another member from their public profile; the same `reports` row the messaging report uses. */
export function ReportUserDialog({ open, onOpenChange, reporterProfileId, reportedProfileId, reportedName }: ReportUserDialogProps) {
  const { t } = useLanguage();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const trimmed = reason.trim();
    if (trimmed.length < 3) return;
    setSubmitting(true);
    const { error } = await supabase.from('reports').insert({
      reporter_id: reporterProfileId,
      reported_user_id: reportedProfileId,
      reason: trimmed,
      status: 'pending',
      report_context: { source: 'public_profile' },
    });
    setSubmitting(false);
    if (error) {
      toast.error(t('userProfile.reportFailed'));
      return;
    }
    toast.success(t('userProfile.reportSubmitted'));
    setReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('userProfile.reportTitle')}</DialogTitle>
          <DialogDescription>{t('userProfile.reportDescription', { name: reportedName })}</DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={t('userProfile.reportPlaceholder')}
          rows={4}
          maxLength={2000}
          data-testid="report-user-reason"
        />
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={submitting || reason.trim().length < 3}>
            {t('userProfile.reportSubmit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
