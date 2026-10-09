import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { FundingTransparencyPublishCard } from '@/components/fund/FundingTransparencyPublishCard';
import { fundingAdminPath, type FundingAdminPrimarySection } from '@/lib/funding/admin-sections';

type FundingOverviewAdminProps = {
  embedded?: boolean;
  onGoToSection?: (section: FundingAdminPrimarySection) => void;
};

/**
 * Level-1 Funding overview: orient and route. Does not duplicate Budget/Sources tables.
 */
export default function FundingOverviewAdmin({ onGoToSection }: FundingOverviewAdminProps = {}) {
  const { t } = useLanguage();

  const go = (section: FundingAdminPrimarySection) => {
    if (onGoToSection) onGoToSection(section);
  };

  return (
    <div className="space-y-4" data-build-key="fundingOverviewAdmin" data-build-label="Funding overview">
      <Card className="space-y-2 p-4">
        <h2 className="text-sm font-semibold">{t('settings.adminFundingOverview')}</h2>
        <p className="text-sm text-muted-foreground">{t('settings.adminFundingOverviewDescription')}</p>
        <p className="text-xs text-muted-foreground">{t('settings.adminFundingOverviewStatus')}</p>
      </Card>

      <Card className="space-y-3 p-4">
        <h3 className="text-sm font-medium">{t('settings.adminFundingOverviewSections')}</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2">
            <div>
              <div className="font-medium">{t('settings.adminFundingSectionProgramPlan')}</div>
              <div className="text-xs text-muted-foreground">{t('settings.adminFundingOverviewProgramPlanHint')}</div>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => go('program-plan')}>
              {t('settings.adminFundingOverviewOpen')}
            </Button>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2">
            <div>
              <div className="font-medium">{t('settings.adminFundingSectionEconomics')}</div>
              <div className="text-xs text-muted-foreground">{t('settings.adminFundingOverviewEconomicsHint')}</div>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => go('economics')}>
              {t('settings.adminFundingOverviewOpen')}
            </Button>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2">
            <div>
              <div className="font-medium">{t('settings.adminFundingSectionBudget')}</div>
              <div className="text-xs text-muted-foreground">{t('settings.adminFundingOverviewBudgetHint')}</div>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => go('budget')}>
              {t('settings.adminFundingOverviewOpen')}
            </Button>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2">
            <div>
              <div className="font-medium">{t('settings.adminFundingSectionSources')}</div>
              <div className="text-xs text-muted-foreground">{t('settings.adminFundingOverviewSourcesHint')}</div>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => go('sources')}>
              {t('settings.adminFundingOverviewOpen')}
            </Button>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2">
            <div>
              <div className="font-medium">{t('settings.adminFundingSectionInterest')}</div>
              <div className="text-xs text-muted-foreground">{t('settings.adminFundingOverviewInterestHint')}</div>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => go('interest')}>
              {t('settings.adminFundingOverviewOpen')}
            </Button>
          </li>
        </ul>
      </Card>

      <FundingTransparencyPublishCard />

      <Card className="space-y-2 p-4 text-sm">
        <h3 className="text-sm font-medium">{t('settings.adminFundingOverviewPublic')}</h3>
        <p className="text-xs text-muted-foreground">{t('settings.adminFundingOverviewPublicHint')}</p>
        <Link
          to="/fund/project-finance"
          className="inline-flex text-sm font-medium text-primary underline underline-offset-2"
        >
          {t('settings.adminFundingOverviewPublicLink')}
        </Link>
        <p className="text-xs text-muted-foreground">
          <Link to={fundingAdminPath('budget')} className="underline underline-offset-2">
            {t('settings.adminFundingOverviewDefaultNote')}
          </Link>
        </p>
      </Card>
    </div>
  );
}
