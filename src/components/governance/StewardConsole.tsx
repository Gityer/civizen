import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGovernanceToolAccess } from '@/hooks/useGovernanceToolAccess';
import { StewardConsoleElections } from './election-admin/StewardConsoleElections';
import { StewardConsoleIdentityVerification } from './StewardConsoleIdentityVerification';
import { StewardConsoleOfficeManagement } from './StewardConsoleOfficeManagement';
import { StewardConsolePolicies } from './StewardConsolePolicies';

interface StewardConsoleProps {
  canManageOffices: boolean;
}

export function StewardConsole({ canManageOffices }: StewardConsoleProps) {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const { electionAdmin } = useGovernanceToolAccess(profile?.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t('governanceDashboard.tabSteward')}</h2>
        <p className="mt-1 text-muted-foreground">{t('governanceDashboard.stewardSubtitle')}</p>
      </div>

      <Tabs defaultValue="verifications">
        <TabsList>
          <TabsTrigger value="verifications">{t('governanceDashboard.tabVerifications')}</TabsTrigger>
          {electionAdmin ? <TabsTrigger value="elections">{t('electionAdmin.tab')}</TabsTrigger> : null}
          <TabsTrigger value="offices">{t('governanceDashboard.tabOffices')}</TabsTrigger>
          <TabsTrigger value="policies">{t('governanceDashboard.tabPolicies')}</TabsTrigger>
        </TabsList>

        <TabsContent value="verifications" className="space-y-4">
          <StewardConsoleIdentityVerification />
        </TabsContent>

        {electionAdmin ? (
          <TabsContent value="elections" className="space-y-4">
            <StewardConsoleElections />
          </TabsContent>
        ) : null}

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
