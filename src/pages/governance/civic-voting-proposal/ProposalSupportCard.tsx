import { useState } from 'react';
import { Loader2, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import type { VotingProposal, VotingProposalSupport } from '@/lib/civic-voting';

type Translate = (key: string, params?: Record<string, string>) => string;

/**
 * Support progress for a draft proposal. Authors open it for support (with a threshold); every
 * signed-in member can then add or withdraw their support until it is published.
 */
export function ProposalSupportCard({
  t,
  proposal,
  support,
  isAuthorOrManager,
  signedIn,
  busy,
  onOpenForSupport,
  onToggleSupport,
}: {
  t: Translate;
  proposal: VotingProposal;
  support: VotingProposalSupport | null;
  isAuthorOrManager: boolean;
  signedIn: boolean;
  busy: boolean;
  onOpenForSupport: (threshold: number) => void;
  onToggleSupport: () => void;
}) {
  const [threshold, setThreshold] = useState(String(proposal.supportThreshold));
  if (proposal.status !== 'draft') return null;

  const open = support?.openForSupport ?? proposal.openForSupport;
  const count = support?.count ?? 0;
  const goal = support?.threshold ?? proposal.supportThreshold;
  const pct = goal > 0 ? Math.min(100, Math.round((count / goal) * 100)) : 0;

  return (
    <Card className="space-y-3 rounded-2xl border-border/60 p-4 shadow-sm" data-testid="proposal-support-card">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="text-sm font-semibold text-foreground">{t('proposalSupport.title')}</h2>
      </div>

      {open ? (
        <>
          <p className="text-sm text-muted-foreground">{t('proposalSupport.openBody')}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground">
                {t('proposalSupport.progress', { count: String(count), threshold: String(goal) })}
              </span>
              {support?.ready ? (
                <span className="text-xs font-medium text-primary">{t('proposalSupport.ready')}</span>
              ) : null}
            </div>
            <Progress value={pct} className="h-1.5" />
          </div>
          {signedIn ? (
            <Button
              type="button"
              size="sm"
              variant={support?.supported ? 'secondary' : 'default'}
              disabled={busy}
              onClick={onToggleSupport}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              {support?.supported ? t('proposalSupport.withdrawSupport') : t('proposalSupport.support')}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">{t('proposalSupport.signInToSupport')}</p>
          )}
        </>
      ) : isAuthorOrManager ? (
        <>
          <p className="text-sm text-muted-foreground">{t('proposalSupport.notOpenAuthorBody')}</p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="space-y-1 text-xs text-muted-foreground">
              <span>{t('proposalSupport.thresholdLabel')}</span>
              <Input
                type="number"
                min={1}
                max={1000}
                inputMode="numeric"
                value={threshold}
                onChange={(event) => setThreshold(event.target.value)}
                className="h-9 w-28"
                aria-label={t('proposalSupport.thresholdLabel')}
              />
            </label>
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => onOpenForSupport(Math.max(1, Math.min(1000, Number(threshold) || proposal.supportThreshold)))}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              {t('proposalSupport.openForSupportAction')}
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{t('proposalSupport.notOpenBody')}</p>
      )}
    </Card>
  );
}
