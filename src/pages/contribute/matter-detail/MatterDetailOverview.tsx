import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { OutlinedField } from '@/components/ui/outlined-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { consultationOptionLabel, describeConsultationOutcome, readConsultationOutcome } from '@/lib/civic-voting/outcome';
import { REOPEN_REASONS, actorLabel, type ReopenReason } from '@/lib/matters';
import type { useMatterDetail } from '@/pages/contribute/matter-detail/useMatterDetail';

type MatterDetailModel = ReturnType<typeof useMatterDetail>;

export function MatterDetailOverview({ model }: { model: MatterDetailModel }) {
  const {
    bundle, busy, selectedAction, setSelectedAction, actionMessage, setActionMessage, reopenReason,
    setReopenReason, targetQuery, setTargetQuery, target, setTarget, targetHits, setTargetHits,
    section, votingProposals, creatingProposal, t, matter, action, canDraftVotingProposal,
    openVotingDraft, hasWork, options, selectedOption, createVotingProposal, runAction,
  } = model;
  // Step 2.2: the close tick writes the consultation outcome onto the Matter as a system event.
  const outcomeFor = (proposalId: string) => {
    const event = bundle?.events.find(
      (item) => item.eventType === 'consultation_closed' && String(item.payload?.proposal_id ?? '') === proposalId,
    );
    const outcome = event ? readConsultationOutcome(event.payload) : null;
    if (!outcome) return null;
    const tally = Array.isArray(event?.payload?.final_tally) ? (event?.payload?.final_tally as Array<Record<string, unknown>>) : [];
    return describeConsultationOutcome(outcome, (key) =>
      consultationOptionLabel(t, key, tally.find((row) => String(row.option_key) === key)?.display_name as string | undefined),
    );
  };
  return (
    <>
    {(!hasWork || section === 'overview') ? (
    <section className="space-y-2">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {t('contribute.matters.descriptionHeading')}
      </h2>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{matter.description}</p>
      {(bundle?.attachments.filter((item) => !item.taskId && !item.decisionId).length ?? 0) > 0 ? (
        <ul className="space-y-1 text-sm">
          {bundle?.attachments
            .filter((item) => !item.taskId && !item.decisionId)
            .map((item) => (
            <li key={item.id} className="text-muted-foreground">
              {item.label || item.fileName || item.url || t('contribute.matters.attachment')}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
    ) : null}

    {(!hasWork || section === 'overview') && (canDraftVotingProposal || votingProposals.length > 0) ? (
      <section className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {t('civicVoting.proposals.title')}
        </h2>
        <p className="text-xs text-muted-foreground">{t('civicVoting.proposals.limitations')}</p>
        {votingProposals.length > 0 ? (
          <ul className="space-y-2">
            {votingProposals.map((proposal) => (
              <li key={proposal.id}>
                <Card className="flex flex-wrap items-center gap-2 p-3">
                  <Badge variant="outline">
                    {t(`civicVoting.proposals.status.${proposal.status}`)}
                  </Badge>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {proposal.title}
                  </span>
                  <Button type="button" size="sm" variant="outline" asChild>
                    <Link to={`/governance/voting/proposals/${proposal.id}`}>
                      {t('civicVoting.proposals.openProposal')}
                    </Link>
                  </Button>
                  {proposal.electionId ? (
                    <Button type="button" size="sm" asChild>
                      <Link to={`/governance/voting/${proposal.electionId}`}>
                        {t('civicVoting.proposals.openBallot')}
                      </Link>
                    </Button>
                  ) : null}
                  {(() => {
                    const line = outcomeFor(proposal.id);
                    return line ? (
                      <p className="w-full text-sm text-foreground" data-testid="matter-consultation-outcome">
                        <span className="font-medium">{t('civicBallot.outcomeTitle')}: </span>
                        {t(line.key, line.params)}
                      </p>
                    ) : null;
                  })()}
                </Card>
              </li>
            ))}
          </ul>
        ) : null}
        {canDraftVotingProposal && !openVotingDraft ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={creatingProposal}
            onClick={() => void createVotingProposal()}
          >
            {creatingProposal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t('civicVoting.proposals.createFromMatter')}
          </Button>
        ) : null}
        {canDraftVotingProposal && matter.visibility !== 'public' ? (
          <p className="text-xs text-muted-foreground">{t('civicVoting.proposals.createFromMatterHint')}</p>
        ) : null}
      </section>
    ) : null}

    {bundle && bundle.parties.length > 0 && (!hasWork || section === 'overview') ? (
    <section className="space-y-2">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {t('contribute.matters.participantsHeading')}
      </h2>
      <ul className="space-y-1">
        {bundle.parties.map((party) => (
          <li key={party.id} className="flex flex-wrap items-center gap-2 text-sm">
            <span>{actorLabel(party.actor)}</span>
            {party.actor.kind === 'ai_agent' ? (
              <Badge variant="outline" className="text-xs">AI</Badge>
            ) : null}
            <span className="text-muted-foreground">· {party.role.replaceAll('_', ' ')}</span>
          </li>
        ))}
      </ul>
    </section>
    ) : null}

    {options.length > 0 && (!hasWork || section === 'overview') ? (
      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {t('contribute.matters.formalActions')}
        </h2>
        <p className="text-xs text-muted-foreground">{t('contribute.matters.formalActionsHint')}</p>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <Button
              key={option.action}
              type="button"
              size="sm"
              variant={selectedAction === option.action ? 'default' : 'outline'}
              onClick={() => setSelectedAction(option.action)}
            >
              {option.action === 'confirm_resolved' && matter.matterType === 'question'
                ? t('contribute.matters.actions.confirm_resolved_question')
                : t(`contribute.matters.actions.${option.action}`)}
            </Button>
          ))}
        </div>
        {selectedOption ? (
          <Card className="space-y-3 border-primary/30 bg-card p-4">
            {selectedOption.action === 'reopen' ? (
              <OutlinedField label={t('contribute.matters.reopenReasonLabel')}>
                <Select value={reopenReason} onValueChange={(value) => setReopenReason(value as ReopenReason)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REOPEN_REASONS.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {t(`contribute.matters.reopenReasons.${reason}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </OutlinedField>
            ) : null}
            {selectedOption.needsMessage || selectedOption.action === 'reopen' ? (
              <OutlinedField label={t('contribute.matters.actionNoteLabel')} htmlFor="matter-action-note">
                <Textarea
                  id="matter-action-note"
                  value={actionMessage}
                  onChange={(event) => setActionMessage(event.target.value)}
                  rows={3}
                />
              </OutlinedField>
            ) : null}
            {selectedOption.needsTarget ? (
              <OutlinedField label={t('contribute.matters.targetLabel')} htmlFor="matter-target">
                {target ? (
                  <div className="flex items-center justify-between gap-2 py-1">
                    <p className="text-sm">{target.displayName}</p>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setTarget(null)}>
                      {t('common.edit')}
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Input
                      id="matter-target"
                      value={targetQuery}
                      onChange={(event) => setTargetQuery(event.target.value)}
                      placeholder={t('contribute.matters.recipientHint')}
                    />
                    {targetHits.map((hit) => (
                      <button
                        key={hit.profileId}
                        type="button"
                        className="mt-1 block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          setTarget(hit);
                          setTargetQuery('');
                          setTargetHits([]);
                        }}
                      >
                        {hit.displayName}
                      </button>
                    ))}
                  </div>
                )}
              </OutlinedField>
            ) : null}
            <Button type="button" onClick={() => void runAction()} disabled={busy}>
              {t('contribute.matters.confirmAction')}
            </Button>
          </Card>
        ) : null}
      </section>
    ) : null}

    </>
  );
}
