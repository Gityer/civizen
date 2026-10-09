import { Link, useLocation } from 'react-router-dom';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { consultationOptionLabel, describeConsultationOutcome, readConsultationOutcome } from '@/lib/civic-voting/outcome';
import { readBallotMethod, readMaxSelections } from '@/lib/civic-voting/voting-proposals';
import { ConsultationApprovalPicker } from '@/pages/governance/civic-voting-election/ConsultationApprovalPicker';
import { ConsultationRankedPicker } from '@/pages/governance/civic-voting-election/ConsultationRankedPicker';
import { formatReceipt } from '@/pages/governance/civic-voting-election/consultation-receipt';
import { shortHash } from '@/lib/civic-voting/merkle';
import type { useCivicVotingElection } from '@/pages/governance/civic-voting-election/useCivicVotingElection';

type CivicVotingElectionModel = ReturnType<typeof useCivicVotingElection>;

const DEFAULT_OPTION_KEYS = ['support', 'oppose', 'abstain'];

function formatDate(date: Date | undefined, language: string): string {
  if (!date || Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(language || 'en', { dateStyle: 'medium' }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Vote-first block for ordinary consultations: shown directly under the question so the
 * choice (or the sign-up that leads to it) is visible without scrolling past tallies.
 */
export function CivicVotingConsultationVote({ model }: { model: CivicVotingElectionModel }) {
  const {
    myOption, myOptions, myReceipt, myBallotAdvisory, advisoryVoter, eligibilityReason, votingWindow, casting, withdrawing, t, language, user,
    votingOpen, votingClosed, castConsultation, withdrawConsultation, verifyReceipt, merkleRoot, ballotSignature,
    directoryVisible, directoryBusy, toggleDirectoryPresence, detail,
  } = model;
  const location = useLocation();
  // Sign-in / sign-up send the voter back to this ballot once they have an account.
  const authState = { from: { pathname: location.pathname, search: location.search } };
  const closesText = votingWindow
    ? t('civicBallot.closesOn', { date: formatDate(votingWindow.closesAt, language) })
    : null;
  const candidates = detail?.contests?.[0]?.candidates ?? [];
  const options = candidates.length > 0
    ? candidates
        .filter((candidate) => candidate.optionKey)
        .map((candidate) => ({ key: String(candidate.optionKey), label: consultationOptionLabel(t, candidate.optionKey, candidate.displayName) }))
    : DEFAULT_OPTION_KEYS.map((key) => ({ key, label: consultationOptionLabel(t, key) }));
  const optionLabel = (key: string) => options.find((option) => option.key === key)?.label ?? consultationOptionLabel(t, key);
  const ballotMethod = readBallotMethod(detail?.election.metadata);
  const approval = ballotMethod === 'approval';
  const ranked = ballotMethod === 'ranked';
  const maxSelections = readMaxSelections(detail?.election.metadata, options.length);
  const picks: string[] = approval || ranked ? (myOptions ?? []) : myOption ? [myOption] : [];
  const outcome = readConsultationOutcome(detail?.election.metadata);
  const outcomeLine = outcome ? describeConsultationOutcome(outcome, optionLabel) : null;
  const outcomeBlock = outcomeLine ? (
    <p className="text-sm text-foreground" data-testid="consultation-outcome">
      <span className="font-medium">{t('civicBallot.outcomeTitle')}: </span>
      {t(outcomeLine.key, outcomeLine.params)}
    </p>
  ) : null;

  const directoryToggle = myOption ? (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border/50 p-3">
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-foreground">
          {t('civicVoting.participation.directoryToggle')}
        </p>
        <p className="text-xs text-muted-foreground">
          {t('civicVoting.participation.directoryToggleHint')}
        </p>
      </div>
      <Switch
        checked={directoryVisible}
        disabled={directoryBusy || withdrawing}
        onCheckedChange={(checked) => void toggleDirectoryPresence(checked)}
        aria-label={t('civicVoting.participation.directoryToggle')}
      />
    </div>
  ) : null;

  // D2: an advisory ballot (unverified voter) has a receipt but is not on the counted list.
  const receiptBlock = myOption && myReceipt ? (
    <div className="space-y-1 rounded-xl border border-border/50 p-3" data-testid="consultation-receipt">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
        {t(myBallotAdvisory ? 'civicBallot.advisoryReceiptTitle' : 'civicBallot.receiptTitle')}
      </div>
      <p className="font-mono text-sm tracking-wide text-foreground" data-testid="consultation-receipt-code">{formatReceipt(myReceipt)}</p>
      <p className="text-xs text-muted-foreground">{t(myBallotAdvisory ? 'civicBallot.advisoryReceiptHint' : 'civicBallot.receiptHint')}</p>
      {merkleRoot ? (
        <p className="text-xs text-muted-foreground" data-testid="consultation-merkle-root" title={merkleRoot}>
          {t('civicBallot.merkleRoot')} <span className="font-mono">{shortHash(merkleRoot)}</span>
        </p>
      ) : null}
      {ballotSignature ? (
        <p className="text-xs text-muted-foreground" data-testid="consultation-signature" data-status={ballotSignature.status}>
          {t(`civicBallot.signature.${ballotSignature.status}`, { fingerprint: ballotSignature.fingerprint ?? '' })}
        </p>
      ) : null}
      {myBallotAdvisory ? null : (
        <Button type="button" size="sm" variant="outline" onClick={() => void verifyReceipt()}>
          {t('civicBallot.verifyReceipt')}
        </Button>
      )}
    </div>
  ) : null;

  const advisoryNote = user && (myBallotAdvisory || (advisoryVoter && !eligibilityReason)) ? (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3" data-testid="consultation-advisory">
      <p className="text-sm font-medium text-foreground">{t('civicBallot.advisoryTitle')}</p>
      <p className="text-xs text-muted-foreground">
        {t('civicBallot.advisoryBody')}{' '}
        <Link to="/settings/profile" className="font-medium text-primary hover:underline">
          {t('civicBallot.advisoryVerifyLink')}
        </Link>
      </p>
    </div>
  ) : null;

  if (votingClosed) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {votingWindow
            ? t('civicBallot.closedOn', { date: formatDate(votingWindow.closesAt, language) })
            : t('civicVoting.proposals.votingClosed')}
        </p>
        {outcomeBlock}
        {advisoryNote}
        {receiptBlock}
        {directoryToggle}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3" data-testid="consultation-guest-cta">
        <p className="text-sm font-medium text-foreground">{t('civicVoting.consultation.participate')}</p>
        <p className="text-sm text-muted-foreground">{t('civicVoting.consultation.guestQuickCta')}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" asChild>
            <Link to="/signup" state={authState}>{t('civicVoting.consultation.createAccountToVote')}</Link>
          </Button>
          <Button type="button" size="sm" variant="outline" asChild>
            <Link to="/login" state={authState}>{t('civicVoting.publicLanding.signIn')}</Link>
          </Button>
        </div>
        {closesText ? <p className="text-xs text-muted-foreground">{closesText}</p> : null}
      </div>
    );
  }

  if (!votingOpen) {
    return (
      <p className="text-sm text-muted-foreground">
        {votingWindow?.state === 'scheduled'
          ? t('civicBallot.opensOn', { date: formatDate(votingWindow.opensAt, language) })
          : detail
            ? t(`civicVoting.status.${detail.election.status}`)
            : null}
      </p>
    );
  }

  const blocked = Boolean(eligibilityReason);

  return (
    <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3" data-testid="consultation-vote">
      <p className="text-sm font-medium text-foreground">{t('civicVoting.consultation.participate')}</p>
      {blocked ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3" data-testid="consultation-blocked">
          <p className="text-sm font-medium text-foreground">{t('civicBallot.notEligibleTitle')}</p>
          <p className="text-xs text-muted-foreground">{t(`civicBallot.reason.${eligibilityReason}`)}</p>
        </div>
      ) : null}
      {advisoryNote}
      {myOption ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {t(ranked ? 'civicBallot.yourRanking' : approval ? 'civicBallot.yourChoices' : 'civicVoting.proposals.yourChoice')}:{' '}
            <span className="font-medium text-foreground">
              {ranked ? picks.map((key, index) => `${index + 1}. ${optionLabel(key)}`).join(', ') : picks.map(optionLabel).join(', ')}
            </span>
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={casting || withdrawing}
            onClick={() => void withdrawConsultation()}
          >
            {withdrawing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t('civicVoting.proposals.withdrawBallot')}
          </Button>
        </div>
      ) : null}
      {ranked ? (
        <ConsultationRankedPicker
          options={options}
          selected={picks}
          disabled={withdrawing || blocked}
          casting={casting}
          onCast={(keys) => void castConsultation(keys)}
          t={t}
        />
      ) : approval ? (
        <ConsultationApprovalPicker
          options={options}
          selected={picks}
          max={maxSelections}
          disabled={withdrawing || blocked}
          casting={casting}
          onCast={(keys) => void castConsultation(keys)}
          t={t}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <Button
              key={option.key}
              type="button"
              size="sm"
              variant={myOption === option.key ? 'default' : 'outline'}
              disabled={casting || withdrawing || blocked}
              onClick={() => void castConsultation(option.key)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {t('civicVoting.proposals.changeUntilClose')}
        {closesText ? ` ${closesText}` : ''}
      </p>
      {receiptBlock}
      {directoryToggle}
    </div>
  );
}
