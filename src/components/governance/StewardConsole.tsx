import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { StewardConsoleIdentityVerification } from './StewardConsoleIdentityVerification';
import { StewardConsoleOfficeManagement } from './StewardConsoleOfficeManagement';
import { StewardConsolePolicies } from './StewardConsolePolicies';

interface StewardConsoleProps {
  canManageOffices: boolean;
}

export function StewardConsole({ canManageOffices }: StewardConsoleProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t('governanceDashboard.tabSteward')}</h2>
        <p className="mt-1 text-muted-foreground">{t('governanceDashboard.stewardSubtitle')}</p>
      </div>

      <Tabs defaultValue="verifications">
        <TabsList>
          <TabsTrigger value="verifications">{t('governanceDashboard.tabVerifications')}</TabsTrigger>
          <TabsTrigger value="offices">{t('governanceDashboard.tabOffices')}</TabsTrigger>
          <TabsTrigger value="policies">{t('governanceDashboard.tabPolicies')}</TabsTrigger>
        </TabsList>

        <TabsContent value="verifications" className="space-y-4">
          <StewardConsoleIdentityVerification />
        </TabsContent>

        <TabsContent value="offices" className="space-y-4">
          <StewardConsoleOfficeManagement canManage={canManageOffices} />
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <StewardConsolePolicies />
        </TabsContent>
      </Tabs>
    </div>
  );
}
