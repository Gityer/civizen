import { Button } from '@/components/ui/button';
import { MarketJobsBoard } from '@/components/market/MarketJobsBoard';
import { useMarketJobsInterestForm } from '@/components/market/useMarketJobsInterestForm';
import { MarketJobsSentence } from '@/components/market/MarketJobsSentence';
import { MarketJobsContact } from '@/components/market/MarketJobsContact';

export function MarketJobsInterestForm() {
  const model = useMarketJobsInterestForm();
  const {
    mode, setMode, jobTypes, city, countryCode, boardRefreshKey, t, showModeTabs,
  } = model;

  return (
    <div className="space-y-5 px-1" data-testid="market-jobs-interest-form">
      {showModeTabs ? (
        <div className="flex justify-center">
          <div
            className="inline-flex rounded-full border border-border/70 bg-muted/20 p-0.5"
            role="group"
            aria-label={t('market.jobsForm.modeLabel')}
            data-testid="market-jobs-mode-tabs"
          >
            <Button
              type="button"
              size="sm"
              variant={mode === 'seeker' ? 'default' : 'ghost'}
              className="h-8 rounded-full px-4 text-xs"
              onClick={() => setMode('seeker')}
              aria-pressed={mode === 'seeker'}
            >
              {t('market.jobsForm.modeSeeker')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === 'employer' ? 'default' : 'ghost'}
              className="h-8 rounded-full px-4 text-xs"
              onClick={() => setMode('employer')}
              aria-pressed={mode === 'employer'}
            >
              {t('market.jobsForm.modeEmployer')}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="space-y-2 text-center">
        <h3 className="text-xl font-display font-semibold text-foreground sm:text-2xl">
          {mode === 'seeker' ? t('market.jobsForm.seekerHeadline') : t('market.jobsForm.employerHeadline')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {mode === 'seeker' ? t('market.jobsForm.seekerSubtitle') : t('market.jobsForm.employerSubtitle')}
        </p>
      </div>

      <MarketJobsSentence model={model} />
      <MarketJobsContact model={model} />
      <MarketJobsBoard
        viewerMode={mode}
        jobTypes={jobTypes}
        countryCode={countryCode}
        city={city}
        refreshKey={boardRefreshKey}
      />
    </div>
  );
}
