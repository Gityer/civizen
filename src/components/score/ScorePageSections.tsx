import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  SCORE_CATEGORIES,
  type CategoryScoreResult,
  type CivizenScoreResponse,
  type ScoreCategoryId,
  type ScoreConfidence,
  type ScoreHistoryItem,
  formatScoreOutOf100,
  formatScoreValue,
  getCategoryMeta,
} from '@/lib/civizen-score';
import { getDevelopmentalScoreColor } from '@/lib/civizen-score-tiers';
import { scoreCoverageCaption, scoreEvidenceEstimateCaption, scoreProgressCaption } from '@/lib/civizen-score-caption';
import { PILLARS, type PillarId } from '@/lib/constants';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck2,
  History,
  Info,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { TierProgressSection } from '@/components/score/TierProgressSection';

function confidenceLabel(confidence: ScoreConfidence, t: (key: string) => string): string {
  return t(`score.confidence.${confidence}`);
}

function formatUpdatedAt(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return null;
  }
}

interface ScoreOverviewProps {
  score: CivizenScoreResponse;
  showTitle?: boolean;
}

export function ScoreOverview({ score, showTitle = true }: ScoreOverviewProps) {
  const { t } = useLanguage();
  const overall = score.overall.score;
  const established = score.overall.status === 'established' && overall != null;
  const updated = formatUpdatedAt(score.overall.lastCalculatedAt);
  const tier = score.tier.finalTier ?? 'explorer';
  const scoreColor = getDevelopmentalScoreColor(established ? overall : null, tier);
  const tierLabel = t(`score.tier.${tier}`);
  const compactScore = established ? formatScoreValue(overall) : t('score.notEstablishedYet');
  const estimateCaption = scoreEvidenceEstimateCaption(score, t);
  const coverageCaption = scoreCoverageCaption(score, t);

  return (
    <section className="w-full max-w-md space-y-1.5 text-center" aria-labelledby="civizen-score-heading">
      {showTitle ? (
        <>
          <h1
            id="civizen-score-heading"
            className={`font-display text-2xl font-bold ${scoreColor}`}
          >
            {tierLabel}
          </h1>
          <div className="flex items-center justify-center gap-1.5">
            <p className={`font-display text-base font-semibold tracking-tight ${scoreColor}`}>
              <span className="text-muted-foreground">{t('score.pageTitle')}</span>
              <span className="mx-1.5 text-muted-foreground/70" aria-hidden>
                ·
              </span>
              <span className="tabular-nums">{compactScore}</span>
            </p>
            <HoverCard openDelay={160} closeDelay={120}>
              <HoverCardTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-card/80 text-primary"
                  aria-label={t('score.detailsAria')}
                >
                  <Info className="h-3.5 w-3.5" aria-hidden />
                </button>
              </HoverCardTrigger>
              <HoverCardContent className="w-72 space-y-2.5 p-3 text-left text-xs leading-relaxed text-muted-foreground">
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">{t('score.worthDisclaimerTitle')}</p>
                  <p>{t('score.worthDisclaimer')}</p>
                  <p>{t('score.tierDisclaimer')}</p>
                </div>
                <div className="space-y-1 border-t border-border/60 pt-2">
                  <p className="font-medium text-foreground">
                    {t('score.pageTitle')}:{' '}
                    {established ? formatScoreOutOf100(overall) : t('score.notEstablishedYet')}
                  </p>
                  <p>
                    {t('score.stageLabel')}: {t(`score.stage.${score.overall.stage}`)}
                  </p>
                  <p>
                    {t('score.confidenceLabel')}: {confidenceLabel(score.overall.confidence, t)}
                  </p>
                  {score.overall.status ? (
                    <p>
                      {t('score.statusLabel')}: {t(`score.status.${score.overall.status}`)}
                    </p>
                  ) : null}
                  {estimateCaption ? <p>{estimateCaption}</p> : null}
                  {coverageCaption ? <p>{coverageCaption}</p> : null}
                  {score.coverage?.limited ? <p>{t('score.limitedCoverageHint')}</p> : null}
                  {score.overall.confidence === 'low' || score.overall.confidence === 'insufficient' ? (
                    <p>{t('score.lowConfidenceHint')}</p>
                  ) : null}
                  {scoreProgressCaption(score, t) ? <p>{scoreProgressCaption(score, t)}</p> : null}
                  {score.validation.verifiedEvidenceCount === 1 ? (
                    <p>{t('score.basedOnIndependentOne')}</p>
                  ) : score.validation.verifiedEvidenceCount > 0 ? (
                    <p>{t('score.basedOnVerified', { count: score.validation.verifiedEvidenceCount })}</p>
                  ) : overall == null ? (
                    <p>{t('score.addActivityHint')}</p>
                  ) : null}
                  <p>{t('score.verificationDoesNotRaiseRating')}</p>
                  {updated ? <p>{t('score.lastUpdated', { date: updated })}</p> : null}
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>
          {!established ? (
            <div className="space-y-0.5 text-sm text-muted-foreground">
              {estimateCaption ? <p>{estimateCaption}</p> : null}
              {coverageCaption ? <p>{coverageCaption}</p> : null}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

export { TierProgressSection };

interface CategoryCardsProps {
  categories: CategoryScoreResult[];
  selectedId: ScoreCategoryId | null;
  onSelect: (id: ScoreCategoryId) => void;
}

export function ScoreCategoryCards({ categories, selectedId, onSelect }: CategoryCardsProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <section className="w-full max-w-lg space-y-3" aria-label={t('score.categoriesHeading')}>
      <h2 className="text-lg font-semibold text-foreground">{t('score.categoriesHeading')}</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {categories.map((category) => {
          const meta = getCategoryMeta(category.id);
          const selected = selectedId === category.id;
          return (
            <Card
              key={category.id}
              id={`score-category-card-${category.id}`}
              className={`cursor-pointer transition-colors ${
                selected ? 'border-primary/50 bg-primary/5 p-4' : 'border-border/70 px-4 py-2.5'
              }`}
              onClick={() => onSelect(category.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(category.id);
                }
              }}
              aria-expanded={selected}
              aria-pressed={selected}
              aria-label={t('score.categoryAria', {
                name: category.shortLabel,
                score:
                  category.score == null
                    ? t('score.notYetScored')
                    : `${formatScoreValue(category.score)} out of 100`,
                confidence: confidenceLabel(category.confidence, t),
              })}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="truncate font-semibold text-foreground">{category.shortLabel}</h3>
                <span
                  className={`shrink-0 font-display text-base font-bold tabular-nums ${
                    category.score == null
                      ? 'text-muted-foreground'
                      : getDevelopmentalScoreColor(category.score)
                  }`}
                >
                  {category.score == null ? '—' : formatScoreValue(category.score)}
                </span>
              </div>

              {selected ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-muted-foreground">{category.fullLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {category.status === 'provisional'
                      ? t('score.provisionalCategoryHint')
                      : confidenceLabel(category.confidence, t)}{' '}
                    · {t('score.verifiedRecords', { count: category.verifiedSourceCount })}
                  </p>
                  <p className="text-sm text-muted-foreground">{meta.description}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-1"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (meta.primaryAction.href) navigate(meta.primaryAction.href);
                      onSelect(category.id);
                    }}
                  >
                    {category.score == null
                      ? meta.primaryAction.label
                      : t('score.viewCategoryDetails', { name: category.shortLabel })}
                  </Button>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    </section>
  );
}

interface MetricBreakdownProps {
  category: CategoryScoreResult | null;
}

export function ScoreMetricBreakdown({ category }: MetricBreakdownProps) {
  const { t } = useLanguage();
  if (!category) return null;

  return (
    <section
      id={`score-category-${category.id}`}
      className="w-full max-w-lg space-y-3"
      aria-label={t('score.metricsHeading', { name: category.fullLabel })}
    >
      <h2 className="text-lg font-semibold text-foreground">
        {t('score.metricsHeading', { name: category.fullLabel })}
      </h2>
      <Card className="divide-y divide-border/60 p-0">
        {category.metrics.map((metric) => (
          <div key={metric.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">{metric.label}</p>
              {metric.sourceCount != null ? (
                <p className="text-xs text-muted-foreground">
                  {t('score.supportingRecords', { count: metric.sourceCount })}
                </p>
              ) : null}
            </div>
            <span className="font-display text-sm font-semibold text-foreground">
              {formatScoreValue(metric.value)}
            </span>
          </div>
        ))}
      </Card>
    </section>
  );
}

interface EvidenceValidationProps {
  score: CivizenScoreResponse;
}

export function ScoreEvidenceValidation({ score }: EvidenceValidationProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const independentCount =
    score.validation.independentVerifiedCount ?? score.validation.verifiedEvidenceCount;
  const verifiedContributions =
    score.categories.find((category) => category.id === 'contributions')?.verifiedSourceCount ?? 0;
  const rows = [
    { label: t('score.independentEvidence'), value: independentCount, icon: ShieldCheck },
    { label: t('score.verifiedContributions'), value: verifiedContributions, icon: Sparkles },
    { label: t('score.evidenceItems'), value: score.validation.evidenceCount, icon: FileCheck2 },
    { label: t('score.verifiedEvidence'), value: score.validation.verifiedEvidenceCount, icon: ShieldCheck },
    { label: t('score.ratings'), value: score.validation.ratingCount, icon: Star },
    { label: t('score.endorsements'), value: score.validation.endorsementCount, icon: Sparkles },
    {
      label: t('score.institutionalConfirmations'),
      value: score.validation.institutionalConfirmationCount,
      icon: ShieldCheck,
    },
    { label: t('score.disputedItems'), value: score.validation.disputedItemCount, icon: Info },
  ];

  return (
    <section className="w-full max-w-lg space-y-3" aria-label={t('score.evidenceHeading')}>
      <h2 className="text-lg font-semibold text-foreground">{t('score.evidenceHeading')}</h2>
      <Card className="space-y-3 p-4">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <row.icon className="h-4 w-4 text-muted-foreground" aria-hidden />
              {row.label}
            </div>
            <span className="font-display text-sm font-semibold">{row.value}</span>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">{t('score.oneActivityMultipleProjections')}</p>
        <p className="text-xs text-muted-foreground">{t('score.verificationDoesNotRaiseRating')}</p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button size="sm" variant="outline" onClick={() => navigate('/profile')}>
            {t('score.addEvidence')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/profile')}>
            {t('score.requestVerification')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/endorse/select')}>
            {t('score.requestEndorsement')}
          </Button>
        </div>
      </Card>
    </section>
  );
}

interface ScoreHistoryProps {
  items: ScoreHistoryItem[];
}

export function ScoreHistorySection({ items }: ScoreHistoryProps) {
  const { t } = useLanguage();

  return (
    <section className="w-full max-w-lg space-y-3" aria-label={t('score.historyHeading')}>
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <History className="h-4 w-4" aria-hidden />
        {t('score.historyHeading')}
      </h2>
      {items.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">{t('score.historyEmpty')}</Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id} className="space-y-1 p-4">
              <p className="text-sm font-medium text-foreground">{item.reason}</p>
              <p className="text-xs text-muted-foreground">
                {item.categoryId === 'overall'
                  ? t('score.pageTitle')
                  : getCategoryMeta(item.categoryId).shortLabel}
                : {formatScoreValue(item.previousValue)} → {formatScoreValue(item.newValue)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('score.pageTitle')}: {formatScoreValue(item.overallPrevious)} →{' '}
                {formatScoreValue(item.overallNew)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatUpdatedAt(item.eventDate)}
              </p>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

interface NextStepsProps {
  score: CivizenScoreResponse;
}

export function ScoreNextSteps({ score }: NextStepsProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <section className="w-full max-w-lg space-y-3" aria-label={t('score.nextStepsHeading')}>
      <h2 className="text-lg font-semibold text-foreground">{t('score.nextStepsHeading')}</h2>
      <Card className="space-y-3 p-4">
        {score.nextSteps.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('score.nextStepsEmpty')}</p>
        ) : (
          <ul className="space-y-2">
            {score.nextSteps.map((step) => (
              <li key={step.id}>
                <button
                  type="button"
                  className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted/50"
                  onClick={() => {
                    if (step.actionTarget) navigate(step.actionTarget);
                  }}
                >
                  {step.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}

interface DomainsSectionProps {
  pillarScores: Array<{ pillar: PillarId; score: number; endorsementCount: number }>;
}

export function ActivityByDomainSection({ pillarScores }: DomainsSectionProps) {
  const { t } = useLanguage();

  return (
    <section className="w-full max-w-lg space-y-3" aria-label={t('score.domainsHeading')}>
      <h2 className="text-lg font-semibold text-foreground">{t('score.domainsHeading')}</h2>
      <p className="text-sm text-muted-foreground">{t('score.domainsDescription')}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PILLARS.map((pillar) => {
          const match = pillarScores.find((p) => p.pillar === pillar.id);
          return (
            <Card key={pillar.id} className="p-3">
              <p className="text-sm font-medium text-foreground">{pillar.shortName}</p>
              <p className="text-xs text-muted-foreground">
                {match && match.endorsementCount > 0
                  ? t('score.domainEndorsements', {
                      score: formatScoreValue(match.score),
                      count: match.endorsementCount,
                    })
                  : t('score.domainNoActivity')}
              </p>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function scoreCategoryShortLabels(): Array<{ id: ScoreCategoryId; shortLabel: string }> {
  return SCORE_CATEGORIES.map((c) => ({ id: c.id, shortLabel: c.shortLabel }));
}
