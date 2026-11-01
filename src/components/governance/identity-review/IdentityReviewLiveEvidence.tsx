import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import type { IdentityVerificationArtifactRow } from '@/lib/identity-verification';

type Row = Record<string, unknown>;
const obj = (value: unknown): Row => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : {});
const list = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []);

/**
 * What the live check sent with the case: the challenge the server issued, what the member's device measured, the
 * fields read from the document's machine-readable zone, and the server's flags. Signals for the reviewer, never a
 * decision on their own.
 */
export function IdentityReviewLiveEvidence({ live, document }: {
  live: IdentityVerificationArtifactRow | null | undefined;
  document: IdentityVerificationArtifactRow | null | undefined;
}) {
  const { t } = useLanguage();
  const liveMeta = obj(live?.metadata);
  if (liveMeta.source !== 'in_house_live') return null;
  const challenge = obj(liveMeta.challenge);
  const checks = obj(liveMeta.device_checks);
  const liveness = obj(checks.liveness);
  const face = obj(checks.face_match);
  const flags = list(liveMeta.flags);
  const mrz = obj(document?.metadata);
  const yes = (value: unknown) => (value === true ? t('identityReview.live.passed') : t('identityReview.live.notPassed'));

  return (
    <div className="space-y-2 rounded-xl border bg-muted/20 p-3 text-sm" data-testid="identity-review-live-evidence">
      {flags.length ? (
        <div className="flex flex-wrap gap-1.5" data-testid="identity-review-flags">
          {flags.map((flag) => <Badge key={flag} variant="destructive">{t(`identityReview.flags.${flag}`)}</Badge>)}
        </div>
      ) : (
        <p className="text-muted-foreground">{t('identityReview.live.noFlags')}</p>
      )}
      <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
        <dt className="text-muted-foreground">{t('identityReview.live.code')}</dt>
        <dd className="font-mono">{String(challenge.code ?? '—')}</dd>
        <dt className="text-muted-foreground">{t('identityReview.live.moves')}</dt>
        <dd>{list(challenge.moves).map((m) => t(`verify.live.move.${m}`)).join(' → ') || '—'}</dd>
        <dt className="text-muted-foreground">{t('identityReview.live.liveness')}</dt>
        <dd>{yes(liveness.passed)} · {t('identityReview.live.blinks', { count: Number(liveness.blinks ?? 0) })}</dd>
        <dt className="text-muted-foreground">{t('identityReview.live.faceMatch')}</dt>
        <dd>{yes(face.passed)}{typeof face.distance === 'number' ? ` · ${face.distance}` : ''}</dd>
        <dt className="text-muted-foreground">{t('identityReview.live.document')}</dt>
        <dd>{[mrz.given_names, mrz.surname].filter(Boolean).join(' ') || '—'} · {String(mrz.issuing_state ?? '')}</dd>
        <dt className="text-muted-foreground">{t('identityReview.live.birth')}</dt>
        <dd>{String(mrz.birth_date ?? '—')}</dd>
        <dt className="text-muted-foreground">{t('identityReview.live.expiry')}</dt>
        <dd>{String(mrz.expiry_date ?? '—')}</dd>
      </dl>
      <p className="text-xs text-muted-foreground">{t('identityReview.live.howTo')}</p>
    </div>
  );
}
