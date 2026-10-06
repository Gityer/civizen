import { motion } from 'framer-motion';
import { HomeHappinessShortcut } from '@/components/home/HomeHappinessShortcut';
import { CivizenScore } from '@/components/ui/CivizenScore';
import { Card } from '@/components/ui/card';
import { formatScoreValue } from '@/lib/civizen-score';
import { scoreCoverageCaption, scoreEvidenceEstimateCaption } from '@/lib/civizen-score-caption';
import { getDevelopmentalScoreColor } from '@/lib/civizen-score-tiers';
import { TrendingUp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { useHome } from '@/pages/home/useHome';

type HomeModel = ReturnType<typeof useHome>;

export function HomeScoreCard({ model }: { model: HomeModel }) {
  const {
    profile, t, navigate, score, showScoreCard, homeScoreTierId, homeScoreTierLabel,
    homePointsToNextLabel, homeRing,
  } = model;
  return (
    <>
    {showScoreCard ? (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-border/70 bg-linear-to-br from-primary/5 via-card to-accent/5 p-5 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md sm:p-6">
          <TooltipProvider delayDuration={200}>
            <div className="flex items-start gap-4 sm:gap-6">
              {homePointsToNextLabel ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="shrink-0 cursor-default outline-none"
                      tabIndex={0}
                      aria-label={homePointsToNextLabel}
                    >
                      <CivizenScore
                        score={homeRing.value}
                        size="md"
                        showLabel={false}
                        tier={score.tier.finalTier}
                        emptyLabel="—"
                        presentation={homeRing.presentation === 'provisional' ? 'provisional' : 'established'}
                        centerCaption={homeRing.presentation === 'provisional' ? t('score.estimateLabel') : null}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{homePointsToNextLabel}</TooltipContent>
                </Tooltip>
              ) : (
                <div className="shrink-0">
                  <CivizenScore
                    score={homeRing.value}
                    size="md"
                    showLabel={false}
                    tier={score.tier.finalTier}
                    emptyLabel="—"
                    presentation={homeRing.presentation === 'provisional' ? 'provisional' : 'established'}
                    centerCaption={homeRing.presentation === 'provisional' ? t('score.estimateLabel') : null}
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-xl font-bold uppercase tracking-wide text-foreground">
                  {t('home.yourCivizenScore')}
                </h2>
                {score.overall.score == null ? (
                  <>
                    <div className="mt-1 flex items-center gap-1.5">
                      {homePointsToNextLabel ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p
                              className={`cursor-default font-display text-2xl font-bold outline-none ${getDevelopmentalScoreColor(
                                null,
                                homeScoreTierId,
                              )}`}
                              tabIndex={0}
                              aria-label={`${t('score.notEstablishedYet')}. ${homePointsToNextLabel}`}
                            >
                              {t('score.notEstablishedYet')}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">{homePointsToNextLabel}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <p
                          className={`font-display text-2xl font-bold ${getDevelopmentalScoreColor(
                            null,
                            homeScoreTierId,
                          )}`}
                        >
                          {t('score.notEstablishedYet')}
                        </p>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex h-[28px] w-[28px] min-h-[28px] min-w-[28px] shrink-0 items-center justify-center rounded-full border border-border/70 bg-card/80 text-primary outline-none transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-primary/20"
                            aria-label={t('home.viewScoreDetails')}
                            onClick={() => navigate('/profile')}
                          >
                            <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[16rem] space-y-1">
                          <p>{t('home.viewScoreDetails')}</p>
                          <p className="text-xs opacity-90">{t('home.viewScoreDetailsFormationNote')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {scoreEvidenceEstimateCaption(score, t) ?? t('home.scoreBuildingHint')}
                    </p>
                    {scoreCoverageCaption(score, t) ? (
                      <p className="text-sm text-muted-foreground">{scoreCoverageCaption(score, t)}</p>
                    ) : null}
                    <div className="mt-2 flex justify-end">
                      <HomeHappinessShortcut profileId={profile?.id} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mt-1 flex items-center gap-1.5">
                      <p className="font-display text-2xl font-bold text-foreground">
                        {formatScoreValue(score.overall.score)} / 100
                      </p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex h-[28px] w-[28px] min-h-[28px] min-w-[28px] shrink-0 items-center justify-center rounded-full border border-border/70 bg-card/80 text-primary outline-none transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-primary/20"
                            aria-label={t('home.viewScoreDetails')}
                            onClick={() => navigate('/profile')}
                          >
                            <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[16rem] space-y-1">
                          <p>{t('home.viewScoreDetails')}</p>
                          <p className="text-xs opacity-90">{t('home.viewScoreDetailsFormationNote')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      {score.tier.finalTier ? (
                        homePointsToNextLabel ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p
                                className={`min-w-0 truncate cursor-default text-sm font-semibold uppercase tracking-wide outline-none ${getDevelopmentalScoreColor(
                                  score.overall.score,
                                  score.tier.finalTier,
                                )}`}
                                tabIndex={0}
                                aria-label={`${homeScoreTierLabel}. ${homePointsToNextLabel}`}
                              >
                                {homeScoreTierLabel}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">{homePointsToNextLabel}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <p
                            className={`min-w-0 truncate text-sm font-semibold uppercase tracking-wide ${getDevelopmentalScoreColor(
                              score.overall.score,
                              score.tier.finalTier,
                            )}`}
                          >
                            {homeScoreTierLabel}
                          </p>
                        )
                      ) : null}
                      <HomeHappinessShortcut profileId={profile?.id} className="shrink-0" />
                    </div>
                  </>
                )}
              </div>
            </div>
          </TooltipProvider>
        </Card>
      </motion.div>
    ) : null}
    </>
  );
}
