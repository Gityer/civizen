import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  addIdentityVerificationCaseNote,
  loadIdentityVerificationCaseHistory,
  type IdentityReviewHistoryEntry,
} from '@/lib/identity-verification-queue';

/** Internal notes and the case history; reviewers only (v2 step C1). */
export function IdentityReviewHistory({ caseId, onNoteAdded }: { caseId: string; onNoteAdded?: () => void }) {
  const { t, language } = useLanguage();
  const [entries, setEntries] = useState<IdentityReviewHistoryEntry[] | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setEntries(await loadIdentityVerificationCaseHistory(caseId));
    } catch {
      setEntries([]);
      toast.error(t('identityReview.actionFailed'));
    }
  }, [caseId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const addNote = async () => {
    setSaving(true);
    try {
      await addIdentityVerificationCaseNote(caseId, note.trim());
      setNote('');
      toast.success(t('identityReview.noteAdded'));
      await load();
      onNoteAdded?.();
    } catch {
      toast.error(t('identityReview.actionFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3" data-testid="identity-review-history">
      {entries === null ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('identityReview.historyEmpty')}</p>
      ) : (
        <ol className="space-y-2">
          {entries.map((entry) => (
            <li key={entry.id} className="text-sm">
              <span className="font-medium">{t(`identityReview.events.${entry.kind}`)}</span>
              {entry.reasonCode ? <span> · {t(`identityReview.reasons.${entry.reasonCode}`)}</span> : null}
              <span className="text-xs text-muted-foreground">
                {' '}
                · {new Date(entry.createdAt).toLocaleString(language)}
                {entry.actorUsername ? ` · ${t('identityReview.historyBy', { username: entry.actorUsername })}` : ''}
              </span>
              {entry.note ? <p className="mt-0.5 whitespace-pre-line text-muted-foreground">{entry.note}</p> : null}
            </li>
          ))}
        </ol>
      )}
      <div className="space-y-1.5">
        <label htmlFor={`identity-note-${caseId}`} className="text-xs font-medium text-muted-foreground">
          {t('identityReview.noteLabel')}
        </label>
        <Textarea
          id={`identity-note-${caseId}`}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t('identityReview.notePlaceholder')}
          rows={2}
          maxLength={2000}
        />
        <Button type="button" size="sm" variant="outline" disabled={saving || note.trim().length < 2} onClick={() => void addNote()}>
          {t('identityReview.addNote')}
        </Button>
      </div>
    </div>
  );
}
