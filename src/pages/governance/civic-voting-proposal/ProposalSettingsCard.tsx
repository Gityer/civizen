import { useState } from 'react';
import { Loader2, Settings2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { VotingProposal } from '@/lib/civic-voting';
import { fromLocalInput, toLocalInput } from '@/pages/governance/civic-voting-proposal/proposal-settings-time';
import { DEFAULT_OPTION_LABELS, parseOptionLines } from '@/pages/governance/civic-voting-proposal/proposal-options';

type Translate = (key: string) => string;

export type ProposalSettingsInput = {
  scopeKind: 'global' | 'country';
  scopeCountryCode: string | null;
  votingOpensAt: string | null;
  votingClosesAt: string | null;
  options: Array<{ label: string }>;
  quorum: number | null;
  passThresholdPercent: number | null;
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
  const [optionsText, setOptionsText] = useState(
    (proposal.options.length > 0 ? proposal.options.map((o) => o.label) : DEFAULT_OPTION_LABELS).join('\n'),
  );
  const [quorum, setQuorum] = useState(proposal.quorum === null ? '' : String(proposal.quorum));
  const [threshold, setThreshold] = useState(
    proposal.passThresholdPercent === null ? '' : String(proposal.passThresholdPercent),
  );
  const optionCount = optionsText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).length;
  const optionsValid = optionCount >= 2 && optionCount <= 12;
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

      <label className="block space-y-1 text-xs text-muted-foreground">
        <span>{t('proposalSupport.optionsLabel')}</span>
        <Textarea
          value={optionsText}
          onChange={(event) => setOptionsText(event.target.value)}
          rows={4}
          className="font-normal"
          aria-invalid={!optionsValid}
          data-testid="proposal-options"
        />
      </label>
      <p className="text-xs text-muted-foreground">{t('proposalSupport.optionsHint')}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-muted-foreground">
          <span>{t('proposalSupport.quorumLabel')}</span>
          <Input type="number" min={0} inputMode="numeric" value={quorum} onChange={(event) => setQuorum(event.target.value)} className="h-9" />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          <span>{t('proposalSupport.thresholdLabel2')}</span>
          <Input type="number" min={0} max={100} step={0.5} inputMode="decimal" value={threshold} onChange={(event) => setThreshold(event.target.value)} className="h-9" />
        </label>
      </div>

      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={busy || !optionsValid || (scopeKind === 'country' && !/^[A-Z]{2}$/.test(country))}
        onClick={() =>
          onSave({
            scopeKind,
            scopeCountryCode: scopeKind === 'country' ? country : null,
            votingOpensAt: fromLocalInput(opensAt),
            votingClosesAt: fromLocalInput(closesAt),
            options: parseOptionLines(optionsText),
            quorum: quorum.trim() === '' ? null : Math.max(0, Math.floor(Number(quorum) || 0)),
            passThresholdPercent: threshold.trim() === '' ? null : Math.min(100, Math.max(0, Number(threshold) || 0)),
          })
        }
      >
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
        {t('proposalSupport.saveSettings')}
      </Button>
    </Card>
  );
}
