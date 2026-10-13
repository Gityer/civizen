import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { IDENTITY_REVIEW_REASON_CODES, type IdentityReviewReasonCode } from '@/lib/identity-verification-queue';

export type IdentityReviewReasonMode = 'reject' | 'requestInfo';

/** Reason code + message to the member, for a rejection or an information request (v2 step C1). */
export function IdentityReviewReasonDialog({
  mode,
  open,
  busy,
  onOpenChange,
  onSubmit,
}: {
  mode: IdentityReviewReasonMode;
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reasonCode: IdentityReviewReasonCode, message: string) => void;
}) {
  const { t } = useLanguage();
  const [reason, setReason] = useState<IdentityReviewReasonCode | ''>('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) {
      setReason('');
      setMessage('');
    }
  }, [open]);

  const messageOk = message.trim().length >= 5;
  const prefix = mode === 'reject' ? 'reject' : 'requestInfo';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid={`identity-review-${prefix}-dialog`}>
        <DialogHeader>
          <DialogTitle>{t(`identityReview.${prefix}Title`)}</DialogTitle>
          <DialogDescription>{t(`identityReview.${prefix}Help`)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('identityReview.reasonLabel')}</Label>
          <RadioGroup value={reason} onValueChange={(value) => setReason(value as IdentityReviewReasonCode)} className="gap-1.5">
            {IDENTITY_REVIEW_REASON_CODES.map((code) => (
              <div key={code} className="flex items-center gap-2">
                <RadioGroupItem value={code} id={`identity-reason-${prefix}-${code}`} data-testid={`identity-reason-${code}`} />
                <Label htmlFor={`identity-reason-${prefix}-${code}`} className="text-sm font-normal">
                  {t(`identityReview.reasons.${code}`)}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`identity-review-message-${prefix}`} className="text-sm font-medium">
            {t('identityReview.messageLabel')}
          </Label>
          <Textarea
            id={`identity-review-message-${prefix}`}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={t('identityReview.messagePlaceholder')}
            rows={3}
            maxLength={1000}
            data-testid="identity-review-message"
          />
          {message.length > 0 && !messageOk ? (
            <p className="text-xs text-destructive">{t('identityReview.messageRequired')}</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            {t('identityReview.cancel')}
          </Button>
          <Button
            type="button"
            variant={mode === 'reject' ? 'destructive' : 'default'}
            disabled={busy || !reason || !messageOk}
            onClick={() => reason && onSubmit(reason, message.trim())}
            data-testid="identity-review-submit"
          >
            {mode === 'reject' ? t('identityReview.reject') : t('identityReview.send')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
