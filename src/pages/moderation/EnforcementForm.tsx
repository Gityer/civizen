import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  ENFORCEMENT_STEPS,
  SEVERE_REASONS,
  enforceMember,
  enforcementErrorKey,
  highestAllowedStep,
  isStanding,
  loadEnforcementActions,
  type EnforcementAction,
  type EnforcementStep,
} from '@/lib/member-enforcement';
import { MODERATION_REASON_CODES, moderationErrorKey, type ModerationReasonCode } from '@/lib/moderation';

/**
 * A moderator applies an enforcement step to a member (PM decision TD2). The step list offers only what the server
 * accepts: one rung above the member's standing steps, or any step for the severe reasons.
 */
export function EnforcementForm({ profileId, username, initialReason, onDone }: {
  profileId: string;
  username: string | null;
  initialReason?: ModerationReasonCode;
  onDone: () => void;
}) {
  const { t } = useLanguage();
  const [history, setHistory] = useState<EnforcementAction[]>([]);
  const [reason, setReason] = useState<ModerationReasonCode>(initialReason ?? 'other');
  const [step, setStep] = useState<EnforcementStep>('warning');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const loadHistory = useCallback(() => {
    void loadEnforcementActions('member', profileId).then(setHistory, () => setHistory([]));
  }, [profileId]);

  useEffect(loadHistory, [loadHistory]);

  const allowed = useMemo(() => {
    const top = SEVERE_REASONS.includes(reason) ? 'suspension' : highestAllowedStep(history);
    return ENFORCEMENT_STEPS.slice(0, ENFORCEMENT_STEPS.indexOf(top) + 1);
  }, [history, reason]);
  const chosen = allowed.includes(step) ? step : allowed[allowed.length - 1];
  const standing = history.filter((action) => isStanding(action)).map((action) => t(`memberEnforcement.steps.${action.step}`));

  const apply = async () => {
    setBusy(true);
    try {
      await enforceMember(profileId, chosen, reason, note);
      toast.success(t('memberEnforcement.form.applied'));
      setNote('');
      loadHistory();
      onDone();
    } catch (error) {
      toast.error(t(enforcementErrorKey(error instanceof Error ? error.message : '', moderationErrorKey)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-xl border border-border/60 p-3" data-testid={`enforcement-form-${profileId}`}>
      <p className="text-xs font-medium text-foreground">
        {username ? t('memberEnforcement.form.title', { username }) : t('memberEnforcement.form.titleNoName')}
      </p>
      <p className="text-xs text-muted-foreground">
        {standing.length ? t('memberEnforcement.form.history', { steps: standing.join(', ') }) : t('memberEnforcement.form.noHistory')}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Select value={reason} onValueChange={(value) => setReason(value as ModerationReasonCode)}>
          <SelectTrigger aria-label={t('moderation.queue.hideReason')} data-testid="enforcement-reason">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODERATION_REASON_CODES.map((code) => (
              <SelectItem key={code} value={code}>{t(`moderation.reasons.${code}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={chosen} onValueChange={(value) => setStep(value as EnforcementStep)}>
          <SelectTrigger aria-label={t('memberEnforcement.form.step')} data-testid="enforcement-step">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {allowed.map((value) => (
              <SelectItem key={value} value={value}>{t(`memberEnforcement.steps.${value}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={1} placeholder={t('moderation.queue.noteLabel')} />
      <p className="text-[11px] text-muted-foreground">{t('memberEnforcement.form.rule')}</p>
      <Button type="button" size="sm" variant="destructive" disabled={busy} data-testid="enforcement-apply" onClick={() => void apply()}>
        {t('memberEnforcement.form.apply')}
      </Button>
    </div>
  );
}
