import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { listBudgetGroups, listBudgetLines, listProjectBudgets } from '@/lib/finance/budget-api';
import { formatMinor, parseMajorToMinor } from '@/lib/finance/money';
import { canFinanceAdmin, canFinanceEdit, canPerformAllocationOverride } from '@/lib/finance/permissions';
import {
  allocateReceipt,
  assessTransactionCost,
  createFinanceCommitment,
  createFinanceReceipt,
  createFinanceSource,
  listCostAssessments,
  listFinanceAllocations,
  listFinanceCommitments,
  listFinanceReceipts,
  listFinanceSources,
  listSourceEvents,
  logSourceEvent,
  setSourcePublishFlags,
  updateFinanceSourceStatus,
  type FinanceAllocationRow,
  type FinanceCommitmentRow,
  type FinanceCostAssessmentRow,
  type FinanceReceiptRow,
  type FinanceSourceEventRow,
  type FinanceSourceRow,
} from '@/lib/finance/source-api';
import {
  FUNDING_SOURCE_CATEGORIES,
  RELATIONSHIP_STATUSES,
  reconcileFundingTotals,
  unallocatedReceiptBalance,
  type FundingSourceCategory,
  type RelationshipStatus,
} from '@/lib/finance/source-rules';
import {
  FUNDING_SOURCE_WORK_PANELS,
  parseFundingSourceWorkPanel,
  type FundingSourceWorkPanel,
} from '@/lib/funding/admin-sections';
import { cn } from '@/lib/utils';

type FundingSourcesAdminProps = { embedded?: boolean };

const CATEGORY_LABEL_KEY: Record<FundingSourceCategory, string> = {
  government: 'settings.adminFundingSourcesCategoryGovernment',
  multilateral: 'settings.adminFundingSourcesCategoryMultilateral',
  grant: 'settings.adminFundingSourcesCategoryGrant',
  philanthropy: 'settings.adminFundingSourcesCategoryPhilanthropy',
  private_capital: 'settings.adminFundingSourcesCategoryPrivateCapital',
  contributor: 'settings.adminFundingSourcesCategoryContributor',
  system_revenue: 'settings.adminFundingSourcesCategorySystemRevenue',
  other: 'settings.adminFundingSourcesCategoryOther',
};

const STATUS_LABEL_KEY: Record<RelationshipStatus, string> = {
  identified: 'settings.adminFundingSourcesStatusIdentified',
  researching: 'settings.adminFundingSourcesStatusResearching',
  contact_planned: 'settings.adminFundingSourcesStatusContactPlanned',
  contacted: 'settings.adminFundingSourcesStatusContacted',
  engaged: 'settings.adminFundingSourcesStatusEngaged',
  application_or_proposal: 'settings.adminFundingSourcesStatusApplication',
  due_diligence: 'settings.adminFundingSourcesStatusDueDiligence',
  decision_pending: 'settings.adminFundingSourcesStatusDecisionPending',
  committed: 'settings.adminFundingSourcesStatusCommitted',
  declined: 'settings.adminFundingSourcesStatusDeclined',
  paused: 'settings.adminFundingSourcesStatusPaused',
  closed: 'settings.adminFundingSourcesStatusClosed',
};

const WORK_PANEL_LABEL_KEY: Record<FundingSourceWorkPanel, string> = {
  outreach: 'settings.adminFundingSourcesOutreach',
  commitments: 'settings.adminFundingSourcesCommitment',
  receipts: 'settings.adminFundingSourcesReceipt',
  allocations: 'settings.adminFundingSourcesAllocate',
  fees: 'settings.adminFundingSourcesFees',
};

export default function FundingSourcesAdmin(_props: FundingSourcesAdminProps = {}) {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const permissions = profile?.effective_permissions || [];
  const allowEdit = canFinanceEdit(permissions);
  const allowAdmin = canFinanceAdmin(permissions);
  const [sources, setSources] = useState<FinanceSourceRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workPanel, setWorkPanel] = useState<FundingSourceWorkPanel>('outreach');
  const [events, setEvents] = useState<FinanceSourceEventRow[]>([]);
  const [commitments, setCommitments] = useState<FinanceCommitmentRow[]>([]);
  const [receipts, setReceipts] = useState<FinanceReceiptRow[]>([]);
  const [allocations, setAllocations] = useState<FinanceAllocationRow[]>([]);
  const [assessments, setAssessments] = useState<FinanceCostAssessmentRow[]>([]);
  const [lineOptions, setLineOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [category, setCategory] = useState<FundingSourceCategory>('philanthropy');
  const [requestedMajor, setRequestedMajor] = useState('');
  const [status, setStatus] = useState<RelationshipStatus>('identified');
  const [eventSummary, setEventSummary] = useState('');
  const [commitmentMajor, setCommitmentMajor] = useState('');
  const [receiptMajor, setReceiptMajor] = useState('');
  const [allocMajor, setAllocMajor] = useState('');
  const [allocReceiptId, setAllocReceiptId] = useState('');
  const [allocLineId, setAllocLineId] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [liableType, setLiableType] = useState<'individual' | 'legal_entity'>('individual');
  const [entityName, setEntityName] = useState('');
  const [processorMajor, setProcessorMajor] = useState('0');
  const [auditMajor, setAuditMajor] = useState('0');

  const selected = useMemo(
    () => sources.find((s) => s.id === selectedId) ?? null,
    [sources, selectedId],
  );

  const summary = useMemo(() => {
    if (!selected) return null;
    return reconcileFundingTotals({
      requested: selected.requested_minor != null
        ? [{ amountMinor: Number(selected.requested_minor), currency: selected.currency }]
        : [],
      committed: commitments.map((c) => ({
        amountMinor: Number(c.amount_minor),
        currency: c.currency,
        status: c.status,
      })),
      receipts: receipts.map((r) => ({
        id: r.id,
        amountMinor: Number(r.amount_minor),
        currency: r.currency,
        reversesReceiptId: r.reverses_receipt_id,
      })),
      allocations: allocations.map((a) => ({
        amountMinor: Number(a.amount_minor),
        currency: a.currency,
        receiptId: a.receipt_id,
        reversesAllocationId: a.reverses_allocation_id,
      })),
      currency: selected.currency,
    });
  }, [allocations, commitments, receipts, selected]);

  const reload = useCallback(async (preferId?: string | null) => {
    setError(null);
    const list = await listFinanceSources();
    if (!list.ok) {
      setError(list.message);
      return;
    }
    setSources(list.data);
    const id = preferId ?? selectedId ?? list.data[0]?.id ?? null;
    setSelectedId(id);
    if (!id) {
      setEvents([]);
      setCommitments([]);
      setReceipts([]);
      setAllocations([]);
      return;
    }
    const [ev, cm, rc, al, fees, budgets] = await Promise.all([
      listSourceEvents(id),
      listFinanceCommitments(id),
      listFinanceReceipts(id),
      listFinanceAllocations(),
      listCostAssessments(),
      listProjectBudgets(),
    ]);
    if (ev.ok) setEvents(ev.data);
    if (cm.ok) setCommitments(cm.data);
    if (rc.ok) {
      setReceipts(rc.data);
      if (!allocReceiptId && rc.data[0]) setAllocReceiptId(rc.data[0].id);
    }
    if (al.ok) setAllocations(al.data.filter((a) => (rc.ok ? rc.data.some((r) => r.id === a.receipt_id) : true)));
    if (fees.ok) setAssessments(fees.data);
    if (budgets.ok && budgets.data[0]) {
      const active = budgets.data.find((b) => b.lifecycle_status === 'approved' || b.lifecycle_status === 'draft') ?? budgets.data[0];
      const groups = await listBudgetGroups(active.id);
      if (groups.ok) {
        const lines = await listBudgetLines(groups.data.map((g) => g.id));
        if (lines.ok) {
          const groupName = new Map(groups.data.map((g) => [g.id, g.name]));
          setLineOptions(
            lines.data
              .filter((l) => l.status === 'active')
              .map((l) => ({ id: l.id, label: `${groupName.get(l.group_id) ?? ''} / ${l.title}` })),
          );
          if (!allocLineId && lines.data[0]) setAllocLineId(lines.data[0].id);
        }
      }
    }
  }, [allocLineId, allocReceiptId, selectedId]);

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCreateSource = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await createFinanceSource({
        displayName,
        category,
        requestedMinor: requestedMajor.trim() ? parseMajorToMinor(requestedMajor) : null,
      });
      setBusy(false);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setDisplayName('');
      setRequestedMajor('');
      setSuccess(t('settings.adminFundingSourcesCreated'));
      await reload(result.data.id);
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : 'failed');
    }
  };

  return (
    <div className="space-y-4" data-build-key="fundingSourcesAdmin" data-build-label="Funding sources admin">
      <Card className="space-y-2 p-4">
        <h2 className="text-sm font-semibold">{t('settings.adminFundingSources')}</h2>
        <p className="text-sm text-muted-foreground">{t('settings.adminFundingSourcesDescription')}</p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-700 dark:text-emerald-400">{success}</p> : null}
      </Card>

      <Card className="space-y-3 p-4">
        <form className="grid gap-2 sm:grid-cols-2" onSubmit={onCreateSource}>
          <div className="space-y-1">
            <Label>{t('settings.adminFundingSourcesName')}</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>{t('settings.adminFundingSourcesCategory')}</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value as FundingSourceCategory)}
            >
              {FUNDING_SOURCE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{t(CATEGORY_LABEL_KEY[c])}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>{t('settings.adminFundingSourcesRequested')}</Label>
            <Input value={requestedMajor} onChange={(e) => setRequestedMajor(e.target.value)} placeholder="0.00" />
          </div>
          <Button type="submit" disabled={busy} className="sm:self-end">
            <Plus className="mr-2 h-4 w-4" />
            {t('settings.adminFundingSourcesCreate')}
          </Button>
        </form>
      </Card>

      {sources.length > 0 ? (
        <Card className="space-y-2 p-4">
          <div className="flex flex-wrap gap-2">
            {sources.map((s) => (
              <Button
                key={s.id}
                type="button"
                size="sm"
                variant={s.id === selectedId ? 'default' : 'outline'}
                onClick={() => void reload(s.id)}
              >
                {s.display_name} · {t(STATUS_LABEL_KEY[s.relationship_status as RelationshipStatus] ?? STATUS_LABEL_KEY.identified)}
              </Button>
            ))}
          </div>
        </Card>
      ) : null}

      {selected ? (
        <>
          <Card className="space-y-2 p-4 text-sm">
            <div className="font-medium">{selected.display_name}</div>
            <div className="text-muted-foreground">
              {t(CATEGORY_LABEL_KEY[selected.category as FundingSourceCategory] ?? CATEGORY_LABEL_KEY.other)}
              {' · '}
              {t(STATUS_LABEL_KEY[selected.relationship_status as RelationshipStatus] ?? STATUS_LABEL_KEY.identified)}
            </div>
            {summary ? (
              <div className="grid gap-1 sm:grid-cols-2 text-xs text-muted-foreground">
                <div>{t('settings.adminFundingSourcesRequested')}: {formatMinor(summary.requestedMinor, selected.currency)}</div>
                <div>{t('settings.adminFundingSourcesCommitted')}: {formatMinor(summary.committedMinor, selected.currency)}</div>
                <div>{t('settings.adminFundingSourcesReceived')}: {formatMinor(summary.receivedMinor, selected.currency)}</div>
                <div>{t('settings.adminFundingSourcesAllocated')}: {formatMinor(summary.allocatedMinor, selected.currency)}</div>
                <div>{t('settings.adminFundingSourcesUnallocated')}: {formatMinor(summary.unallocatedMinor, selected.currency)}</div>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-2">
              <select
                className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as RelationshipStatus)}
              >
                {RELATIONSHIP_STATUSES.map((s) => (
                  <option key={s} value={s}>{t(STATUS_LABEL_KEY[s])}</option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    setBusy(true);
                    const result = await updateFinanceSourceStatus(selected.id, status, `Status → ${status}`);
                    setBusy(false);
                    if (!result.ok) setError(result.message);
                    else {
                      setSuccess(t('settings.adminFundingSourcesStatusUpdated'));
                      await reload(selected.id);
                    }
                  })();
                }}
              >
                {t('settings.adminFundingSourcesUpdateStatus')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    setBusy(true);
                    const result = await setSourcePublishFlags({
                      sourceId: selected.id,
                      publishSource: !selected.publish_source,
                      publishRequestedAmount: selected.publish_requested_amount,
                      publicDisplayName: selected.public_display_name ?? selected.display_name,
                    });
                    setBusy(false);
                    if (!result.ok) setError(result.message);
                    else await reload(selected.id);
                  })();
                }}
              >
                {selected.publish_source ? t('settings.adminFundingSourcesUnpublishName') : t('settings.adminFundingSourcesPublishName')}
              </Button>
            </div>
          </Card>

          <Card className="space-y-2 p-4" data-build-key="fundingSourceWorkPanels">
            <p className="text-xs text-muted-foreground">{t('settings.adminFundingSourcesWorkPanelHint')}</p>
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t('settings.adminFundingSourcesWorkPanel')}>
              {FUNDING_SOURCE_WORK_PANELS.map((panel) => (
                <Button
                  key={panel}
                  type="button"
                  size="sm"
                  variant={workPanel === panel ? 'default' : 'outline'}
                  className={cn('text-xs', workPanel === panel && 'shadow-none')}
                  role="tab"
                  aria-selected={workPanel === panel}
                  onClick={() => setWorkPanel(parseFundingSourceWorkPanel(panel))}
                >
                  {t(WORK_PANEL_LABEL_KEY[panel])}
                </Button>
              ))}
            </div>
          </Card>

          {workPanel === 'outreach' ? (
          <Card className="space-y-2 p-4">
            <h3 className="text-sm font-medium">{t('settings.adminFundingSourcesOutreach')}</h3>
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void (async () => {
                  setBusy(true);
                  const result = await logSourceEvent({
                    sourceId: selected.id,
                    eventType: 'outreach',
                    summary: eventSummary,
                  });
                  setBusy(false);
                  if (!result.ok) setError(result.message);
                  else {
                    setEventSummary('');
                    await reload(selected.id);
                  }
                })();
              }}
            >
              <Input className="min-w-48 flex-1" value={eventSummary} onChange={(e) => setEventSummary(e.target.value)} required />
              <Button type="submit" size="sm" disabled={busy}>{t('settings.adminFundingSourcesLogEvent')}</Button>
            </form>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {events.map((ev) => (
                <li key={ev.id}>
                  {new Date(ev.event_at).toLocaleString()} · {ev.event_type}: {ev.summary}
                  {ev.actor_user_id ? ` · actor ${ev.actor_user_id.slice(0, 8)}` : ''}
                </li>
              ))}
            </ul>
          </Card>
          ) : null}

          {workPanel === 'commitments' ? (
          <Card className="space-y-2 p-4">
            <h3 className="text-sm font-medium">{t('settings.adminFundingSourcesCommitment')}</h3>
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void (async () => {
                  setBusy(true);
                  try {
                    const result = await createFinanceCommitment({
                      sourceId: selected.id,
                      amountMinor: parseMajorToMinor(commitmentMajor),
                      currency: selected.currency,
                      status: 'confirmed',
                    });
                    setBusy(false);
                    if (!result.ok) setError(result.message);
                    else {
                      setCommitmentMajor('');
                      setSuccess(t('settings.adminFundingSourcesCommitmentNote'));
                      await reload(selected.id);
                    }
                  } catch (err) {
                    setBusy(false);
                    setError(err instanceof Error ? err.message : 'failed');
                  }
                })();
              }}
            >
              <Input value={commitmentMajor} onChange={(e) => setCommitmentMajor(e.target.value)} placeholder="0.00" required />
              <Button type="submit" size="sm" disabled={busy}>{t('settings.adminFundingSourcesAddCommitment')}</Button>
            </form>
            <p className="text-xs text-muted-foreground">{t('settings.adminFundingSourcesCommitmentNotCash')}</p>
          </Card>
          ) : null}

          {workPanel === 'receipts' ? (
          <Card className="space-y-2 p-4">
            <h3 className="text-sm font-medium">{t('settings.adminFundingSourcesReceipt')}</h3>
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void (async () => {
                  setBusy(true);
                  try {
                    const result = await createFinanceReceipt({
                      sourceId: selected.id,
                      amountMinor: parseMajorToMinor(receiptMajor),
                      currency: selected.currency,
                    });
                    setBusy(false);
                    if (!result.ok) setError(result.message);
                    else {
                      setReceiptMajor('');
                      await reload(selected.id);
                    }
                  } catch (err) {
                    setBusy(false);
                    setError(err instanceof Error ? err.message : 'failed');
                  }
                })();
              }}
            >
              <Input value={receiptMajor} onChange={(e) => setReceiptMajor(e.target.value)} placeholder="0.00" required />
              <Button type="submit" size="sm" disabled={busy}>{t('settings.adminFundingSourcesAddReceipt')}</Button>
            </form>
          </Card>
          ) : null}

          {workPanel === 'allocations' ? (
          <Card className="space-y-2 p-4">
            <h3 className="text-sm font-medium">{t('settings.adminFundingSourcesAllocate')}</h3>
            <form
              className="grid gap-2 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                void (async () => {
                  setBusy(true);
                  try {
                    const amountMinor = parseMajorToMinor(allocMajor);
                    const receipt = receipts.find((r) => r.id === allocReceiptId);
                    if (!receipt) {
                      setBusy(false);
                      setError('receipt not found');
                      return;
                    }
                    const available = unallocatedReceiptBalance(
                      {
                        id: receipt.id,
                        amountMinor: Number(receipt.amount_minor),
                        currency: receipt.currency,
                        reversesReceiptId: receipt.reverses_receipt_id,
                      },
                      allocations.map((a) => ({
                        amountMinor: Number(a.amount_minor),
                        currency: a.currency,
                        receiptId: a.receipt_id,
                        reversesAllocationId: a.reverses_allocation_id,
                      })),
                    );
                    const gate = canPerformAllocationOverride(
                      permissions,
                      overrideReason,
                      amountMinor,
                      available,
                    );
                    if (!gate.ok) {
                      setBusy(false);
                      setError(gate.message);
                      return;
                    }
                    const result = await allocateReceipt({
                      receiptId: allocReceiptId,
                      lineItemId: allocLineId,
                      amountMinor,
                      overrideReason: overrideReason.trim() || undefined,
                    });
                    setBusy(false);
                    if (!result.ok) setError(result.message);
                    else {
                      setAllocMajor('');
                      setOverrideReason('');
                      await reload(selected.id);
                    }
                  } catch (err) {
                    setBusy(false);
                    setError(err instanceof Error ? err.message : 'failed');
                  }
                })();
              }}
            >
              <div className="space-y-1">
                <Label>{t('settings.adminFundingSourcesReceipt')}</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={allocReceiptId}
                  onChange={(e) => setAllocReceiptId(e.target.value)}
                  required
                  disabled={!allowEdit && !allowAdmin}
                >
                  {receipts.filter((r) => !r.reverses_receipt_id).map((r) => (
                    <option key={r.id} value={r.id}>
                      {formatMinor(Number(r.amount_minor), r.currency)} · {r.received_date}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>{t('settings.adminFundingBudgetLine')}</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={allocLineId}
                  onChange={(e) => setAllocLineId(e.target.value)}
                  required
                >
                  {lineOptions.map((l) => (
                    <option key={l.id} value={l.id}>{l.label}</option>
                  ))}
                </select>
              </div>
              <Input value={allocMajor} onChange={(e) => setAllocMajor(e.target.value)} placeholder="0.00" required />
              <Input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder={t('settings.adminFundingSourcesOverride')} />
              <Button type="submit" size="sm" disabled={busy || !allocReceiptId || !allocLineId} className="sm:col-span-2">
                {t('settings.adminFundingSourcesAddAllocation')}
              </Button>
            </form>
          </Card>
          ) : null}

          {workPanel === 'fees' ? (
          <Card className="space-y-2 p-4">
            <h3 className="text-sm font-medium">{t('settings.adminFundingSourcesFees')}</h3>
            <form
              className="grid gap-2 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                void (async () => {
                  setBusy(true);
                  try {
                    const result = await assessTransactionCost({
                      liablePartyType: liableType,
                      liableLegalEntityName: entityName,
                      processorCostMinor: parseMajorToMinor(processorMajor),
                      auditCostMinor: parseMajorToMinor(auditMajor),
                      otherAllowedCostMinor: 0,
                      currency: selected.currency,
                      reason: 'manual assessment',
                    });
                    setBusy(false);
                    if (!result.ok) setError(result.message);
                    else {
                      setSuccess(
                        liableType === 'individual'
                          ? t('settings.adminFundingSourcesFeeIndividualZero')
                          : t('settings.adminFundingSourcesFeeEntityRecorded'),
                      );
                      await reload(selected.id);
                    }
                  } catch (err) {
                    setBusy(false);
                    setError(err instanceof Error ? err.message : 'failed');
                  }
                })();
              }}
            >
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={liableType}
                onChange={(e) => setLiableType(e.target.value as 'individual' | 'legal_entity')}
              >
                <option value="individual">{t('settings.adminFundingSourcesLiableIndividual')}</option>
                <option value="legal_entity">{t('settings.adminFundingSourcesLiableEntity')}</option>
              </select>
              {liableType === 'legal_entity' ? (
                <Input value={entityName} onChange={(e) => setEntityName(e.target.value)} placeholder={t('settings.adminFundingSourcesEntityName')} required />
              ) : (
                <div />
              )}
              <Input value={processorMajor} onChange={(e) => setProcessorMajor(e.target.value)} placeholder={t('settings.adminFundingSourcesProcessorCost')} />
              <Input value={auditMajor} onChange={(e) => setAuditMajor(e.target.value)} placeholder={t('settings.adminFundingSourcesAuditCost')} />
              <Button type="submit" size="sm" disabled={busy} className="sm:col-span-2">
                {t('settings.adminFundingSourcesAssessFee')}
              </Button>
            </form>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {assessments.slice(0, 5).map((a) => (
                <li key={a.id}>
                  {a.liable_party_type}: {formatMinor(Number(a.assessed_user_fee_minor), a.currency)} · {a.calculation_note}
                </li>
              ))}
            </ul>
          </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
