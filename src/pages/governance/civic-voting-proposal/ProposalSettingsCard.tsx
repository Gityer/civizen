import { useState } from 'react';
import { Loader2, Settings2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { VotingProposal } from '@/lib/civic-voting';
import { fromLocalInput, toLocalInput } from '@/pages/governance/civic-voting-proposal/proposal-settings-time';

type Translate = (key: string) => string;

export type ProposalSettingsInput = {
  scopeKind: 'global' | 'country';
  scopeCountryCode: string | null;
  votingOpensAt: string | null;
  votingClosesAt: string | null;
};

/** Draft-only settings the author (or a manager) controls: scope, opening and closing time. */
export function ProposalSettingsCard({
  t,
  proposal,
  busy,
  onSave,
}: {
  t: Translate;
  proposal: VotingProposal;
  busy: boolean;
  onSave: (input: ProposalSettingsInput) => void;
}) {
  const [scopeKind, setScopeKind] = useState<'global' | 'country'>(proposal.scopeKind === 'country' ? 'country' : 'global');
  const [country, setCountry] = useState(proposal.scopeCountryCode ?? '');
  const [opensAt, setOpensAt] = useState(toLocalInput(proposal.votingOpensAt));
  const [closesAt, setClosesAt] = useState(toLocalInput(proposal.votingClosesAt));
  if (proposal.status !== 'draft') return null;

  return (
    <Card className="space-y-3 rounded-2xl border-border/60 p-4 shadow-sm" data-testid="proposal-settings-card">
      <div className="flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="text-sm font-semibold text-foreground">{t('proposalSupport.settingsTitle')}</h2>
      </div>
      <p className="text-xs text-muted-foreground">{t('proposalSupport.settingsBody')}</p>

      <fieldset className="space-y-2">
        <legend className="text-xs font-medium text-muted-foreground">{t('proposalSupport.scopeLabel')}</legend>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant={scopeKind === 'global' ? 'default' : 'outline'} onClick={() => setScopeKind('global')}>
            {t('civicVoting.filters.global')}
          </Button>
          <Button type="button" size="sm" variant={scopeKind === 'country' ? 'default' : 'outline'} onClick={() => setScopeKind('country')}>
            {t('proposalSupport.scopeCountry')}
          </Button>
          {scopeKind === 'country' ? (
            <Input
              value={country}
              onChange={(event) => setCountry(event.target.value.toUpperCase().slice(0, 2))}
              placeholder="AM"
              maxLength={2}
              className="h-9 w-20 uppercase"
              aria-label={t('proposalSupport.countryCodeLabel')}
            />
          ) : null}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-muted-foreground">
          <span>{t('proposalSupport.opensAtLabel')}</span>
          <Input type="datetime-local" value={opensAt} onChange={(event) => setOpensAt(event.target.value)} className="h-9" />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          <span>{t('proposalSupport.closesAtLabel')}</span>
          <Input type="datetime-local" value={closesAt} onChange={(event) => setClosesAt(event.target.value)} className="h-9" />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">{t('proposalSupport.timesHint')}</p>

      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={busy || (scopeKind === 'country' && !/^[A-Z]{2}$/.test(country))}
        onClick={() =>
          onSave({
            scopeKind,
            scopeCountryCode: scopeKind === 'country' ? country : null,
            votingOpensAt: fromLocalInput(opensAt),
            votingClosesAt: fromLocalInput(closesAt),
          })
        }
      >
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
        {t('proposalSupport.saveSettings')}
      </Button>
    </Card>
  );
}
