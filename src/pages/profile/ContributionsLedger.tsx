import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { ContributionRecordDetail } from '@/components/profile/ContributionRecordDetail';
import { DeclaredContextEditor } from '@/components/profile/DeclaredContextEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  canonicalContributionRecords,
  contributionRecordKey,
  findContributionRecord,
  queryContributionLedger,
  summarizeContributionFunctions,
  summarizeArtifactFunctions,
  summarizeContributionTypes,
  type ContributionLedgerSort,
} from '@/lib/civizen-contribution-ledger';
import {
  contributionTimeSpanDays,
  improvementGuidance,
} from '@/lib/civizen-contribution-observation';
import { summarizeContributionEvidenceConfidence } from '@/lib/civizen-contribution-confidence';
import { buildCivizenContext } from '@/lib/civizen-context-model';
import { loadDeclaredContext, type PersistedDeclaredContext } from '@/lib/civizen-declared-context';
import {
  loadContributionEventsThenSync,
  scoreContributionsFromEvents,
  type ContributionEvent,
} from '@/lib/civizen-contributions';
import { formatScoreValue } from '@/lib/civizen-score';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

function formatDate(iso: string): string {
  const value = Date.parse(iso);
  if (!Number.isFinite(value)) return '';
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value));
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

export default function ContributionsLedger() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const { userId } = useParams();
  const [params, setParams] = useSearchParams();
  const profileId = userId || profile?.id || '';
  const isOwn = !userId || userId === profile?.id;
  const recordKey = params.get('record');

  const [events, setEvents] = useState<ContributionEvent[]>([]);
  const [declared, setDeclared] = useState<PersistedDeclaredContext | null>(null);
  const [loading, setLoading] = useState(true);
  const search = params.get('q') ?? '';
  const sort = (params.get('sort') as ContributionLedgerSort) || 'newest';
  const verified = (params.get('verified') as 'all' | 'verified' | 'unverified') || 'all';
  const fn = params.get('fn') ?? '';
  const vk = params.get('vk') ?? '';
  const page = Number(params.get('page') || '1');

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    setLoading(true);
    void loadContributionEventsThenSync(profileId, isOwn ? profile?.user_id : null, undefined, (synced) => {
      if (!cancelled) setEvents(synced);
    }).then((loaded) => {
      if (!cancelled) {
        setEvents(loaded);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [profileId, isOwn, profile?.user_id]);

  useEffect(() => {
    if (!profileId) return;
    void loadDeclaredContext(profileId).then(setDeclared);
  }, [profileId]);

  const scored = useMemo(() => scoreContributionsFromEvents(events), [events]);
  const ledger = useMemo(
    () =>
      queryContributionLedger(events, {
        search,
        sort,
        verified,
        contributionFunction: fn || undefined,
        verificationKind: vk || undefined,
        page,
        pageSize: 20,
      }),
    [events, search, sort, verified, fn, vk, page],
  );
  const selected = findContributionRecord(events, recordKey);
  const types = summarizeContributionTypes(events);
  const functions = summarizeContributionFunctions(events);
  const artifacts = summarizeArtifactFunctions(events);
  const context = useMemo(() => buildCivizenContext({ events, declared: declared ?? undefined }), [events, declared]);
  const evidenceConfidence = useMemo(() => summarizeContributionEvidenceConfidence(events), [events]);
  const verifiedCount = scored?.verifiedSourceCount ?? events.filter((item) => item.verified).length;
  const otherCount = Math.max(0, events.length - verifiedCount);
  const unknown = t('profile.contributionsDetails.unknown');
  const labelFn = (value: string) => t(`profile.contributionsLedger.functions.${value}`);
  const labelKind = (value: string) => t(`profile.contributionsLedger.verificationKinds.${value}`);

  const setQuery = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (!value || value === 'all' || value === '1' && key === 'page') next.delete(key);
      else next.set(key, value);
    }
    if (!patch.page) next.delete('page');
    setParams(next);
  };

  const reload = () => {
    if (!profileId) return;
    void loadContributionEventsThenSync(profileId, isOwn ? profile?.user_id : null, undefined, setEvents).then(setEvents);
  };

  const tips = improvementGuidance({
    independentValidation: (scored?.independentEvidenceCount ?? 0) > 0,
    realizedImpactKnown: canonicalContributionRecords(events).some((item) => item.observation.realizedImpact !== 'unknown'),
    timeSpanDays: contributionTimeSpanDays(events),
    verifiedCount,
  });

  return (
    <AppLayout>
      <div className="space-y-6 px-4 py-6">
        <AppPageHeader
          title={t('profile.contributionsLedger.title')}
          subtitle={t('profile.contributionsLedger.subtitle')}
          fallbackPath={isOwn ? '/profile' : `/user/${profileId}`}
          actions={isOwn ? (
            <Button asChild size="sm" variant="outline"><Link to="/contribute/impact">{t('profile.contributionsLedger.openImpact')}</Link></Button>
          ) : undefined}
        />

        <section className="space-y-2 rounded-xl border border-border/80 p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Field label={t('profile.contributionsDetails.score')} value={`${formatScoreValue(scored?.score)} / 100`} />
            <Field label={t('profile.contributionsDetails.verified')} value={String(verifiedCount)} />
            <Field label={t('profile.contributionsDetails.otherActivity')} value={String(otherCount)} />
            <Field label={t('profile.contributionsDetails.confidence')} value={String(scored?.confidence ?? unknown)} />
          </div>
          <details className="text-sm text-muted-foreground" data-testid="confidence-breakdown">
            <summary className="cursor-pointer text-foreground">{t('profile.contributionsLedger.confidenceBreakdown')}</summary>
            <p className="mt-2">{t(`profile.contributionsLedger.confidenceReasons.${evidenceConfidence.reason}`)}</p>
            <ul className="mt-2 space-y-1">
              {evidenceConfidence.factors.map((factor) => (
                <li key={factor.id}>
                  {t(`profile.contributionsLedger.confidenceFactors.${factor.id}`)}: {t(`profile.contributionsLedger.confidenceLevels.${factor.level}`)} ({factor.count})
                </li>
              ))}
            </ul>
          </details>
          <p className="text-sm text-muted-foreground">{t('profile.contributionsDetails.reputationIntro')}</p>
          <details className="text-sm text-muted-foreground">
            <summary className="cursor-pointer text-foreground">{t('profile.contributionsLedger.howReputation')}</summary>
            <p className="mt-2">{t('profile.contributionsLedger.howReputationDetail')}</p>
          </details>
          <p className="text-xs text-muted-foreground">
            {t('profile.contributionsDetails.typesCount')}:{' '}
            {types.map((item) => `${t(`profile.contributionsDetails.types.${item.eventType}`)} ${item.count}`).join(' · ') || unknown}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('profile.contributionsLedger.functionsCount')}:{' '}
            {functions.map((item) => `${labelFn(item.contributionFunction)} ${item.count}`).join(' · ') || unknown}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('profile.contributionsLedger.artifactTypes')}:{' '}
            {artifacts.map((item) => `${labelFn(item.artifactFunction)} ${item.count}`).join(' · ') || unknown}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('profile.contributionsLedger.currentFocus')}:{' '}
            {context.currentFocus.functions.map((item) => labelFn(item)).join(', ') || unknown}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('profile.contributionsLedger.demonstrated')}:{' '}
            {context.demonstrated.skills.join(', ') || unknown}
          </p>
        </section>

        {selected ? (
          <ContributionRecordDetail
            selected={selected}
            unknown={unknown}
            evaluatorProfileId={profile?.id}
            onClose={() => setQuery({ record: '' })}
            onEventsUpdated={reload}
          />
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={search}
            placeholder={t('profile.contributionsLedger.search')}
            onChange={(event) => setQuery({ q: event.target.value })}
            aria-label={t('profile.contributionsLedger.search')}
          />
          <select className="min-h-11 rounded-md border border-input bg-background px-3 text-sm" value={sort} onChange={(event) => setQuery({ sort: event.target.value })}>
            <option value="newest">{t('profile.contributionsLedger.sortNewest')}</option>
            <option value="oldest">{t('profile.contributionsLedger.sortOldest')}</option>
            <option value="highest_observation">{t('profile.contributionsLedger.sortObservation')}</option>
            <option value="highest_impact">{t('profile.contributionsLedger.sortImpact')}</option>
          </select>
          <select className="min-h-11 rounded-md border border-input bg-background px-3 text-sm" value={verified} onChange={(event) => setQuery({ verified: event.target.value })}>
            <option value="all">{t('profile.contributionsLedger.filterAll')}</option>
            <option value="verified">{t('profile.contributionsDetails.verified')}</option>
            <option value="unverified">{t('profile.contributionsLedger.filterUnverified')}</option>
          </select>
          <select className="min-h-11 rounded-md border border-input bg-background px-3 text-sm" value={vk} onChange={(event) => setQuery({ vk: event.target.value })}>
            <option value="">{t('profile.contributionsLedger.filterVerification')}</option>
            <option value="system_verified">{labelKind('system_verified')}</option>
            <option value="independently_validated">{labelKind('independently_validated')}</option>
            <option value="outcome_validated">{labelKind('outcome_validated')}</option>
            <option value="unverified">{labelKind('unverified')}</option>
          </select>
          <select className="min-h-11 rounded-md border border-input bg-background px-3 text-sm" value={fn} onChange={(event) => setQuery({ fn: event.target.value })}>
            <option value="">{t('profile.contributionsLedger.filterFunction')}</option>
            {functions.map((item) => (
              <option key={item.contributionFunction} value={item.contributionFunction}>
                {labelFn(item.contributionFunction)}
              </option>
            ))}
          </select>
        </div>

        {loading ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : null}
        <ul className="space-y-2" aria-label={t('profile.contributionsLedger.list')}>
          {ledger.records.map((item) => {
            const key = contributionRecordKey(item.event);
            return (
              <li key={key}>
                <Link
                  to={`?${new URLSearchParams({ ...Object.fromEntries(params.entries()), record: key }).toString()}`}
                  className="block rounded-lg border border-border/70 px-3 py-3 hover:bg-muted/40"
                >
                  <p className="font-medium">{item.event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {labelFn(item.observation.contributionFunction)}
                    {' · '}
                    {labelKind(item.observation.verificationKind)}
                    {item.event.occurredAt ? ` · ${formatDate(item.event.occurredAt)}` : ''}
                    {item.observation.observation != null ? ` · ${t('profile.contributionsLedger.observation')} ${Math.round(item.observation.observation)}` : ''}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{t('profile.contributionsLedger.pageStatus', { page: ledger.page, pages: ledger.pageCount, total: ledger.total })}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={ledger.page <= 1} onClick={() => setQuery({ page: String(ledger.page - 1) })}>
              {t('profile.contributionsLedger.prev')}
            </Button>
            <Button type="button" variant="outline" disabled={ledger.page >= ledger.pageCount} onClick={() => setQuery({ page: String(ledger.page + 1) })}>
              {t('profile.contributionsLedger.next')}
            </Button>
          </div>
        </div>
        {tips.length > 0 ? <p className="text-xs text-muted-foreground">{t('profile.contributionsDetails.guidance', { tips: tips.join('; ') })}</p> : null}
        {isOwn && profileId ? (
          <DeclaredContextEditor profileId={profileId} context={context} onSaved={setDeclared} />
        ) : null}
      </div>
    </AppLayout>
  );
}
