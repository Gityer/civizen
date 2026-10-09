import { ArrowRight, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { VotingProposal, VotingProposalSupport } from '@/lib/civic-voting';
import type { ProposalGroups } from './governance-member-model';

type Translate = (key: string, params?: Record<string, string>) => string;

function ProposalRow({
  t,
  proposal,
  support,
  onOpen,
  onSupport,
}: {
  t: Translate;
  proposal: VotingProposal;
  support: VotingProposalSupport | null | undefined;
  onOpen: (id: string) => void;
  onSupport?: (id: string) => void;
}) {
  return (
    <Card className="space-y-2 rounded-2xl border-border/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{proposal.title}</p>
          {proposal.summary ? (
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{proposal.summary}</p>
          ) : null}
        </div>
        <Badge variant="outline" className="shrink-0">{t(`civicVoting.proposals.status.${proposal.status}`)}</Badge>
      </div>
      {support && proposal.status === 'draft' ? (
        <p className="inline-flex items-center gap-1 text-xs text-muted-foreground" data-testid="proposal-support-count">
          <Users className="h-3.5 w-3.5" aria-hidden />
          {t('proposalSupport.progress', { count: String(support.count), threshold: String(support.threshold) })}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" className="gap-2" onClick={() => onOpen(proposal.id)}>
          {t('civicVoting.proposals.openProposal')}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
        {onSupport && support && !support.isAuthor && proposal.status === 'draft' ? (
          <Button
            type="button"
            size="sm"
            variant={support.supported ? 'secondary' : 'default'}
            onClick={() => onSupport(proposal.id)}
          >
            {support.supported ? t('proposalSupport.withdrawSupport') : t('proposalSupport.support')}
          </Button>
        ) : null}
        {proposal.electionId ? (
          <Button type="button" size="sm" asChild>
            <Link to={`/governance/voting/${proposal.electionId}`}>{t('civicVoting.proposals.openBallot')}</Link>
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

export function GovernanceProposalsTab({
  t,
  groups,
  support,
  onOpen,
  onSupport,
}: {
  t: Translate;
  groups: ProposalGroups;
  support: Record<string, VotingProposalSupport | null>;
  onOpen: (id: string) => void;
  onSupport: (id: string) => void;
}) {
  const nothing =
    groups.openForSupport.length + groups.mine.length + groups.published.length + groups.closed.length === 0;
  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-dashed border-border/70 p-4 text-sm text-muted-foreground">
        <p>{t('proposalSupport.howToStart')}</p>
        <Button type="button" size="sm" variant="outline" className="mt-2" asChild>
          <Link to="/contribute/matters">{t('proposalSupport.openMatters')}</Link>
        </Button>
      </Card>

      {nothing ? <p className="text-sm text-muted-foreground">{t('proposalSupport.none')}</p> : null}

      {groups.openForSupport.length > 0 ? (
        <Section title={t('proposalSupport.openForSupport')}>
          {groups.openForSupport.map((proposal) => (
            <ProposalRow key={proposal.id} t={t} proposal={proposal} support={support[proposal.id]} onOpen={onOpen} onSupport={onSupport} />
          ))}
        </Section>
      ) : null}

      {groups.mine.length > 0 ? (
        <Section title={t('proposalSupport.mine')}>
          {groups.mine.map((proposal) => (
            <ProposalRow key={proposal.id} t={t} proposal={proposal} support={support[proposal.id]} onOpen={onOpen} />
          ))}
        </Section>
      ) : null}

      {groups.published.length > 0 ? (
        <Section title={t('proposalSupport.published')}>
          {groups.published.map((proposal) => (
            <ProposalRow key={proposal.id} t={t} proposal={proposal} support={null} onOpen={onOpen} />
          ))}
        </Section>
      ) : null}

      {groups.closed.length > 0 ? (
        <Section title={t('proposalSupport.closed')}>
          {groups.closed.map((proposal) => (
            <ProposalRow key={proposal.id} t={t} proposal={proposal} support={null} onOpen={onOpen} />
          ))}
        </Section>
      ) : null}
    </div>
  );
}
