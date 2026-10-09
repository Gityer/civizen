import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { listVotingProposals, type VotingProposal } from '@/lib/civic-voting';
import type { MatterListRow } from '@/lib/matters';
import { listMatters } from '@/lib/matters-api';

/** The Matters a member raised and the proposals they drafted, on the Impact page (Phase 4 step 4.2). */
export function ImpactMattersAndProposals({ profileId }: { profileId: string }) {
  const { t } = useLanguage();
  const [matters, setMatters] = useState<MatterListRow[]>([]);
  const [proposals, setProposals] = useState<VotingProposal[]>([]);

  useEffect(() => {
    if (!profileId) return;
    let active = true;
    void Promise.all([
      listMatters('mine', profileId).catch(() => [] as MatterListRow[]),
      listVotingProposals().catch(() => [] as VotingProposal[]),
    ]).then(([rows, drafts]) => {
      if (!active) return;
      setMatters(rows.filter((row) => row.matter.initiator.profileId === profileId || row.matter.createdByProfileId === profileId));
      setProposals(drafts.filter((row) => row.createdByProfileId === profileId));
    });
    return () => {
      active = false;
    };
  }, [profileId]);

  if (matters.length === 0 && proposals.length === 0) return null;
  return (
    <div className="space-y-4" data-testid="impact-matters-proposals">
      {matters.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t('contribute.impact.mattersTitle')}</h2>
          <div className="grid gap-2">
            {matters.map((row) => (
              <Link key={row.matter.id} to={`/contribute/matters/${row.matter.id}`}>
                <Card className="flex items-center justify-between gap-3 border-border/70 bg-card/95 p-3">
                  <span className="min-w-0 truncate text-sm font-medium text-foreground">{row.matter.title}</span>
                  <Badge variant="outline" className="shrink-0 rounded-full text-xs">{t(`contribute.matters.status.${row.derivedStatus}`)}</Badge>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      {proposals.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t('contribute.impact.proposalsTitle')}</h2>
          <div className="grid gap-2">
            {proposals.map((proposal) => (
              <Link key={proposal.id} to={`/governance/voting/proposals/${proposal.id}`}>
                <Card className="flex items-center justify-between gap-3 border-border/70 bg-card/95 p-3">
                  <span className="min-w-0 truncate text-sm font-medium text-foreground">{proposal.title}</span>
                  <Badge variant="outline" className="shrink-0 rounded-full text-xs">{t(`civicVoting.proposals.status.${proposal.status}`)}</Badge>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
