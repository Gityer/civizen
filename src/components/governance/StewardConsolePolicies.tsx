import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  formatApprovalShare,
  getGovernanceEligibilityPolicy,
  listGovernanceVotingPolicies,
  type GovernanceVotingPolicyRow,
} from '@/lib/governance-policy-catalog';

const VOTING_POLICIES = listGovernanceVotingPolicies();
const ELIGIBILITY_POLICY = getGovernanceEligibilityPolicy();

export function StewardConsolePolicies() {
  const { t } = useLanguage();

  const ruleLabel = (row: GovernanceVotingPolicyRow) =>
    row.scope === 'decision_class' ? t(`governanceDashboard.policies.decisionClasses.${row.key}`) : row.key.replace(/_/g, ' ');

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t('governanceDashboard.policies.intro')}</p>

      <PolicyTable
        title={t('governanceDashboard.policies.votingTitle')}
        help={t('governanceDashboard.policies.votingHelp')}
        rows={VOTING_POLICIES.decisionClasses}
        ruleLabel={ruleLabel}
      />

      {VOTING_POLICIES.actionOverrides.length > 0 && (
        <PolicyTable
          title={t('governanceDashboard.policies.actionsTitle')}
          help={t('governanceDashboard.policies.actionsHelp')}
          rows={VOTING_POLICIES.actionOverrides}
          ruleLabel={ruleLabel}
        />
      )}

      <Card className="space-y-2 p-4">
        <h3 className="font-semibold">{t('governanceDashboard.policies.eligibilityTitle')}</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>{t('governanceDashboard.policies.minScore', { score: ELIGIBILITY_POLICY.minGovernanceScore })}</li>
          <li>{t('governanceDashboard.policies.verifiedRequired')}</li>
          <li>{t('governanceDashboard.policies.nativeRequired')}</li>
          <li>{t('governanceDashboard.policies.windowHours', { hours: ELIGIBILITY_POLICY.votingWindowHours })}</li>
          <li>{t('governanceDashboard.policies.weight')}</li>
        </ul>
      </Card>

      <Card className="space-y-3 p-4">
        <h3 className="font-semibold">{t('governanceDashboard.policies.changeTitle')}</h3>
        <p className="text-sm text-muted-foreground">{t('governanceDashboard.policies.changeHelp')}</p>
        <Button asChild size="sm">
          <Link to="/governance/tools">{t('governanceDashboard.policies.changeAction')}</Link>
        </Button>
      </Card>
    </div>
  );
}

function PolicyTable({
  title,
  help,
  rows,
  ruleLabel,
}: {
  title: string;
  help: string;
  rows: GovernanceVotingPolicyRow[];
  ruleLabel: (row: GovernanceVotingPolicyRow) => string;
}) {
  const { t } = useLanguage();

  return (
    <Card className="space-y-3 p-4">
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{help}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="py-2 pr-4 font-medium">{t('governanceDashboard.policies.colRule')}</th>
              <th className="py-2 pr-4 font-medium">{t('governanceDashboard.policies.colApproval')}</th>
              <th className="py-2 pr-4 font-medium">{t('governanceDashboard.policies.colShare')}</th>
              <th className="py-2 pr-4 font-medium">{t('governanceDashboard.policies.colQuorum')}</th>
              <th className="py-2 font-medium">{t('governanceDashboard.policies.colWindow')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t">
                <td className="py-2 pr-4 font-medium capitalize">{ruleLabel(row)}</td>
                <td className="py-2 pr-4">{t(`governanceDashboard.policies.approvalClasses.${row.approvalClass}`)}</td>
                <td className="py-2 pr-4">{formatApprovalShare(row.minApprovalShare)}</td>
                <td className="py-2 pr-4">{row.minQuorum}</td>
                <td className="py-2">{t(row.requiresWindowClose ? 'governanceDashboard.policies.yes' : 'governanceDashboard.policies.no')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
