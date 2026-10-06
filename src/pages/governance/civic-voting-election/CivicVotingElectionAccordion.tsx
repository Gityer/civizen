import { CheckCircle2, Clock3, FileWarning, KeyRound, ShieldAlert, ShieldCheck, Vote } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { remainingCoolingOffHours } from '@/lib/civic-voting';
import type { useCivicVotingElection } from '@/pages/governance/civic-voting-election/useCivicVotingElection';

type CivicVotingElectionModel = ReturnType<typeof useCivicVotingElection>;

export function CivicVotingElectionAccordion({ model }: { model: CivicVotingElectionModel }) {
  const {
    detail, gates, windowOpen, boothOpen, castComplete, pinInput, setPinInput, assistedStatus,
    pinMessage, t, user, canOpenBooth, failed, isConsultation, policy, coolingOffUntil,
    coolingOffActive, attestation, challengeOpen, eligibility, secondsLeft, startSimulatedWindow,
    toggleGate, tryOpenBooth, enrollPins, unlockWithPin, castSimulatedBallot, runAssistedStep,
  } = model;
  return (
    <>
    <Accordion type="multiple" className="rounded-2xl border border-border/60 bg-card/40 px-4">
      {detail?.body || isConsultation ? (
        <AccordionItem value="about" className="border-border/40">
          <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline">
            {t('civicVoting.folds.aboutElection')}
          </AccordionTrigger>
          <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
            {isConsultation ? null : detail?.body}
            {isConsultation ? (
              <p className="text-xs">{t('civicVoting.proposals.limitations')}</p>
            ) : null}
            {isConsultation ? (
              <p className="mt-2 text-xs">{t('civicVoting.participation.privacyNote')}</p>
            ) : null}
          </AccordionContent>
        </AccordionItem>
      ) : null}

      {detail && !isConsultation ? (
      <AccordionItem value="session" className="border-border/40">
        <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline">
          {t('civicVoting.folds.sessionTools')}
        </AccordionTrigger>
        <AccordionContent className="space-y-4">
          <p className="text-xs text-muted-foreground">{t('civicVoting.sessionSimulatorHint')}</p>

          <div className="flex flex-wrap gap-2">
            <Badge variant={eligibility.eligible ? 'secondary' : 'outline'}>
              {eligibility.eligible ? t('civicVoting.eligible') : t('civicVoting.ineligible')}
            </Badge>
            <Badge variant="outline">
              {policy.primaryWindowSeconds / 60}-min · {policy.maxAttempts} attempts
            </Badge>
            <Badge variant={attestation.ok ? 'secondary' : 'destructive'}>
              {attestation.ok
                ? t('civicVoting.extras.attestationOk')
                : t('civicVoting.extras.attestationFail')}
            </Badge>
          </div>
          {!eligibility.eligible ? (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {eligibility.reasons.map((reason) => (
                <li key={reason}>• {t(`civicVoting.reasons.${reason}`)}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">{t('civicVoting.eligibleReady')}</p>
          )}
          {coolingOffActive && coolingOffUntil ? (
            <p className="text-xs text-muted-foreground">
              {t('civicVoting.extras.coolingOff', {
                hours: String(remainingCoolingOffHours({ now: new Date(), coolingOffUntil })),
              })}
            </p>
          ) : null}

          {!user ? (
            <p className="text-xs text-muted-foreground">{t('civicVoting.publicBrowseOnly')}</p>
          ) : (
            <div className="space-y-4">
              <section className="space-y-2 rounded-xl border border-border/50 p-3">
                <div className="flex items-center gap-2 text-primary">
                  <FileWarning className="h-4 w-4" />
                  <h3 className="text-sm font-semibold text-foreground">
                    {t('civicVoting.extras.challengeTitle')}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">{t('civicVoting.extras.challengeBody')}</p>
                <Badge variant={challengeOpen ? 'secondary' : 'outline'}>
                  {challengeOpen
                    ? t('civicVoting.extras.challengeOpen')
                    : t('civicVoting.extras.challengeClosed')}
                </Badge>
              </section>

              <section className="space-y-2 rounded-xl border border-border/50 p-3">
                <div className="flex items-center gap-2 text-primary">
                  <Clock3 className="h-4 w-4" />
                  <h3 className="text-sm font-semibold text-foreground">
                    {t('civicVoting.windowTitle')}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">{t('civicVoting.windowBody')}</p>
                {!windowOpen ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={startSimulatedWindow}
                    disabled={!eligibility.eligible}
                  >
                    {t('civicVoting.simulatePush')}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{t('civicVoting.timeRemaining')}</span>
                      <span className="font-semibold tabular-nums">
                        {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
                      </span>
                    </div>
                    <Progress value={(secondsLeft / policy.primaryWindowSeconds) * 100} />
                  </div>
                )}
              </section>

              <section className="space-y-2 rounded-xl border border-border/50 p-3">
                <div className="flex items-center gap-2 text-primary">
                  <ShieldAlert className="h-4 w-4" />
                  <h3 className="text-sm font-semibold text-foreground">
                    {t('civicVoting.gatesTitle')}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">{t('civicVoting.gatesBody')}</p>
                <div className="space-y-2">
                  {eligibility.requiredGates.map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      className="flex w-full items-center justify-between rounded-xl border border-border/60 px-3 py-2 text-left text-sm"
                      onClick={() => toggleGate(kind)}
                    >
                      <span>{t(`civicVoting.gateLabels.${kind}`)}</span>
                      <Badge variant={gates[kind] ? 'secondary' : 'outline'}>
                        {gates[kind] ? t('civicVoting.gatePassed') : t('civicVoting.gatePending')}
                      </Badge>
                    </button>
                  ))}
                </div>
                {failed.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t('civicVoting.gatesFailed', { gates: failed.join(', ') })}
                  </p>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  onClick={tryOpenBooth}
                  disabled={!windowOpen || !canOpenBooth || secondsLeft <= 0 || castComplete}
                >
                  {t('civicVoting.openBooth')}
                </Button>
              </section>

              <section className="space-y-2 rounded-xl border border-border/50 p-3">
                <div className="flex items-center gap-2 text-primary">
                  <KeyRound className="h-4 w-4" />
                  <h3 className="text-sm font-semibold text-foreground">
                    {t('civicVoting.extras.duressTitle')}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">{t('civicVoting.extras.duressBody')}</p>
                <Button type="button" size="sm" variant="outline" onClick={() => void enrollPins()}>
                  {t('civicVoting.extras.enrollPins')}
                </Button>
                <div className="flex gap-2">
                  <Input
                    inputMode="numeric"
                    placeholder={t('civicVoting.extras.pinPlaceholder')}
                    value={pinInput}
                    onChange={(event) => setPinInput(event.target.value)}
                  />
                  <Button type="button" size="sm" onClick={() => void unlockWithPin()}>
                    {t('civicVoting.extras.unlock')}
                  </Button>
                </div>
                {pinMessage ? <p className="text-xs text-muted-foreground">{pinMessage}</p> : null}
                <p className="text-[11px] text-muted-foreground">{t('civicVoting.extras.duressHint')}</p>
              </section>

              <section className="space-y-2 rounded-xl border border-border/50 p-3">
                <div className="flex items-center gap-2 text-primary">
                  <ShieldCheck className="h-4 w-4" />
                  <h3 className="text-sm font-semibold text-foreground">
                    {t('civicVoting.extras.assistedTitle')}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">{t('civicVoting.extras.assistedBody')}</p>
                <Badge variant="outline">{assistedStatus}</Badge>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => runAssistedStep('assistant_confirm')}
                  >
                    {t('civicVoting.extras.assistantConfirm')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => runAssistedStep('witness_confirm')}
                  >
                    {t('civicVoting.extras.witnessConfirm')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => runAssistedStep('steward_accept')}
                  >
                    {t('civicVoting.extras.stewardAccept')}
                  </Button>
                </div>
              </section>

              {boothOpen ? (
                <section className="space-y-2 rounded-xl border border-primary/40 bg-primary/5 p-3">
                  <div className="flex items-center gap-2 text-primary">
                    <Vote className="h-4 w-4" />
                    <h3 className="text-sm font-semibold text-foreground">
                      {t('civicVoting.boothTitle')}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{t('civicVoting.boothBody')}</p>
                  <Button type="button" size="sm" variant="secondary" onClick={() => void castSimulatedBallot()}>
                    {t('civicVoting.castSimulated')}
                  </Button>
                  <p className="text-[11px] text-muted-foreground">{t('civicVoting.noChoiceReceipt')}</p>
                </section>
              ) : null}

              {castComplete ? (
                <section className="space-y-1 rounded-xl border border-border/50 p-3">
                  <div className="flex items-center gap-2 text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                    <p className="text-sm font-semibold text-foreground">
                      {t('civicVoting.castComplete')}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('civicVoting.castCompleteBody')}</p>
                </section>
              ) : null}
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
      ) : null}
    </Accordion>
    </>
  );
}
