import { useCallback, useEffect, useMemo, useRef, useState, Fragment, type FormEvent } from 'react';
import { Check, ChevronDown, Download, EyeOff, Folder, FolderOpen, Globe, MoreHorizontal, Pencil, Plus, Send } from 'lucide-react';


import { BudgetAmount } from '@/components/funding/BudgetAmount';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  approveBudget,
  budgetLinesToCsv,
  createBudgetGroup,
  createProjectBudget,
  listBudgetGroups,
  listBudgetLines,
  listProjectBudgets,
  publishBudget,
  reviseApprovedBudget,
  submitBudgetForReview,
  unpublishBudget,
  upsertBudgetLine,
  type BudgetGroupRow,
  type BudgetLineRow,
  type ProjectBudgetRow,
} from '@/lib/finance/budget-api';
import {
  nestBudgetGroupsWithLines,
  formatBudgetLineTiming,
  formatGroupPeriodLabel,
  filterNestedBudgetGroupsByKeyword,
  parsePurposeFromDescription,
  splitBudgetLineTitle,
} from '@/lib/finance/budget-presentation';
import { useBudgetStructureWideLayout } from '@/lib/finance/use-budget-structure-layout';
import { canEditBudgetLifecycle, sumLineAmounts } from '@/lib/finance/budget-rules';
import { VALIDATION_BUDGET_V01 } from '@/lib/finance/validation-budget-v01';
import { VALIDATION_BUDGET_V02 } from '@/lib/finance/validation-budget-v02';
import { VALIDATION_BUDGET_V03 } from '@/lib/finance/validation-budget-v03';
import { parseMajorToMinor } from '@/lib/finance/money';
import {
  canApproveOwnSubmission,
  canFinanceApprove,
  canFinanceEdit,
  canFinancePublish,
  canFinanceView,
} from '@/lib/finance/permissions';
import { downloadTextFile } from '@/lib/funding/interest-csv';
import type { FundingAdminPrimarySection } from '@/lib/funding/admin-sections';
import { cn } from '@/lib/utils';
import { type WorkflowAction, classifyBudgetListState, ordinaryBudgetsForSelector, historicalBudgetsForSelector, preferredWorkingBudgetId, shouldUseBudgetSelector, budgetSelectorSizingLabel, budgetLifecycleBadgeKey, primaryBudgetWorkflowAction } from '@/pages/settings/FundingBudgetAdmin.list-state';

type FundingBudgetAdminProps = {
  embedded?: boolean;
  onGoToSection?: (section: FundingAdminPrimarySection) => void;
};

type CreationPanel = 'new-budget' | 'add-group' | 'add-line' | null;

function workflowActionIcon(action: WorkflowAction) {
  if (action === 'submit') return Send;
  if (action === 'approve') return Check;
  if (action === 'revise') return Pencil;
  if (action === 'publish') return Globe;
  return EyeOff;
}

export default function FundingBudgetAdmin({ onGoToSection }: FundingBudgetAdminProps = {}) {
  const { t } = useLanguage();
  const { profile, user } = useAuth();
  const permissions = profile?.effective_permissions || [];
  const allowView = canFinanceView(permissions);
  const allowEdit = canFinanceEdit(permissions);
  const allowApprove = canFinanceApprove(permissions);
  const allowPublish = canFinancePublish(permissions);
  const [budgets, setBudgets] = useState<ProjectBudgetRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [groups, setGroups] = useState<BudgetGroupRow[]>([]);
  const [lines, setLines] = useState<BudgetLineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [budgetName, setBudgetName] = useState('Civizen project budget');
  const [budgetPurpose, setBudgetPurpose] = useState('');
  const [groupName, setGroupName] = useState('');
  const [lineTitle, setLineTitle] = useState('');
  const [lineGroupId, setLineGroupId] = useState('');
  const [plannedMajor, setPlannedMajor] = useState('0');
  const [committedMajor, setCommittedMajor] = useState('0');
  const [actualMajor, setActualMajor] = useState('0');
  const [publishFlag, setPublishFlag] = useState(false);
  const [publicDescription, setPublicDescription] = useState('');
  const [reason, setReason] = useState('');
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
  const [creationPanel, setCreationPanel] = useState<CreationPanel>(null);
  const [workflowAction, setWorkflowAction] = useState<WorkflowAction | null>(null);
  const [structureQuery, setStructureQuery] = useState('');
  const addLineFormRef = useRef<HTMLFormElement | null>(null);
  const { containerRef: structureLayoutRef, isWide: structureIsWide } = useBudgetStructureWideLayout();

  const selected = useMemo(() => {
    const row = budgets.find((b) => b.id === selectedId) ?? null;
    if (row?.is_demonstration) return null;
    return row;
  }, [budgets, selectedId]);

  const nestedGroups = useMemo(
    () => nestBudgetGroupsWithLines(groups, lines),
    [groups, lines],
  );

  const visibleNestedGroups = useMemo(
    () => filterNestedBudgetGroupsByKeyword(nestedGroups, structureQuery),
    [nestedGroups, structureQuery],
  );

  const structureFilterActive = structureQuery.trim().length > 0;

  const isValidationBudget =
    selected?.name === VALIDATION_BUDGET_V03.name
    || selected?.name === VALIDATION_BUDGET_V02.name
    || selected?.name === VALIDATION_BUDGET_V01.name;

  const ordinaryBudgets = useMemo(() => ordinaryBudgetsForSelector(budgets), [budgets]);
  const historicalBudgets = useMemo(() => historicalBudgetsForSelector(budgets), [budgets]);

  const totals = useMemo(() => {
    if (!selected) return null;
    return sumLineAmounts(
      lines.map((l) => ({
        plannedMinor: Number(l.planned_minor),
        committedMinor: Number(l.committed_minor),
        actualMinor: Number(l.actual_minor),
        currency: l.currency,
        status: l.status,
      })),
      selected.currency,
    );
  }, [lines, selected]);

  const expandAllGroups = () => {
    setExpandedGroupIds(new Set(nestedGroups.map((row) => row.group.id)));
  };

  const collapseAllGroups = () => {
    setExpandedGroupIds(new Set());
  };

  const allGroupsExpanded = useMemo(
    () =>
      nestedGroups.length > 0
      && nestedGroups.every((row) => expandedGroupIds.has(row.group.id)),
    [expandedGroupIds, nestedGroups],
  );

  const toggleExpandCollapseAll = () => {
    if (allGroupsExpanded) collapseAllGroups();
    else expandAllGroups();
  };

  const toggleGroupExpanded = (groupId: string) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  useEffect(() => {
    if (!structureFilterActive) return;
    setExpandedGroupIds(new Set(visibleNestedGroups.map((row) => row.group.id)));
  }, [structureFilterActive, visibleNestedGroups]);

  const openCreationPanel = (panel: CreationPanel) => {
    setWorkflowAction(null);
    setCreationPanel(panel);
  };

  const closeCreationPanel = () => setCreationPanel(null);

  const startAddLineInGroup = (groupId: string) => {
    setLineGroupId(groupId);
    setExpandedGroupIds((prev) => new Set(prev).add(groupId));
    openCreationPanel('add-line');
    requestAnimationFrame(() => {
      addLineFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const titleInput = addLineFormRef.current?.querySelector<HTMLInputElement>('#line-title');
      titleInput?.focus();
    });
  };

  const loadBudgetDetail = async (budgetId: string) => {
    const g = await listBudgetGroups(budgetId);
    if (!g.ok) {
      setError(g.message);
      return;
    }
    setGroups(g.data);
    const l = await listBudgetLines(g.data.map((row) => row.id));
    if (!l.ok) {
      setError(l.message);
      return;
    }
    setLines(l.data);
    if (g.data[0] && (!lineGroupId || !g.data.some((row) => row.id === lineGroupId))) {
      setLineGroupId(g.data[0].id);
    }
  };

  const selectBudget = async (budgetId: string) => {
    setSelectedId(budgetId);
    setError(null);
    setSuccess(null);
    setCreationPanel(null);
    setWorkflowAction(null);
    setStructureQuery('');
    await loadBudgetDetail(budgetId);
  };

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const list = await listProjectBudgets();
    if (!list.ok) {
      setError(list.message);
      setLoading(false);
      return;
    }
    setBudgets(list.data);
    const ordinary = ordinaryBudgetsForSelector(list.data);
    const preferredId = preferredWorkingBudgetId(list.data);
    const nextId = selectedId && ordinary.some((b) => b.id === selectedId)
      ? selectedId
      : selectedId && list.data.some((b) => b.id === selectedId && b.lifecycle_status === 'superseded')
        ? selectedId
      : preferredId;
    setSelectedId(nextId);
    if (nextId) {
      const g = await listBudgetGroups(nextId);
      if (!g.ok) {
        setError(g.message);
        setLoading(false);
        return;
      }
      setGroups(g.data);
      const l = await listBudgetLines(g.data.map((row) => row.id));
      if (!l.ok) {
        setError(l.message);
        setLoading(false);
        return;
      }
      setLines(l.data);
      if (!lineGroupId && g.data[0]) setLineGroupId(g.data[0].id);
    } else {
      setGroups([]);
      setLines([]);
    }
    setLoading(false);
  }, [lineGroupId, selectedId]);

  useEffect(() => {
    void reload();
    // intentionally once on mount; subsequent via actions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const editable = selected ? canEditBudgetLifecycle(selected.lifecycle_status) && allowEdit : false;
  const canApproveSelected = Boolean(
    selected &&
      selected.lifecycle_status === 'under_review' &&
      allowApprove &&
      canApproveOwnSubmission(permissions, user?.id, selected.submitted_by),
  );

  const primaryAction = selected
    ? primaryBudgetWorkflowAction({
        lifecycleStatus: selected.lifecycle_status,
        publishedAt: selected.published_at,
        editable,
        canApproveSelected,
        allowEdit,
        allowPublish,
      })
    : null;

  const showOverflowMenu = Boolean(
    selected && (
      allowEdit
      || historicalBudgets.length > 0
      || (selected.lifecycle_status === 'under_review' && allowApprove && !canApproveSelected)
      || (selected.lifecycle_status === 'under_review' && canApproveSelected && primaryAction !== 'approve')
      || (selected.lifecycle_status === 'approved' && (
        (allowEdit && primaryAction !== 'revise')
        || (allowPublish && !selected.published_at && primaryAction !== 'publish')
        || (allowPublish && selected.published_at && primaryAction !== 'unpublish')
      ))
    ),
  );

  const PrimaryWorkflowIcon = primaryAction ? workflowActionIcon(primaryAction) : null;

  const onCreateBudget = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await createProjectBudget({
      name: budgetName,
      purpose: budgetPurpose,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSuccess(t('settings.adminFundingBudgetCreated'));
    setSelectedId(result.data.id);
    setCreationPanel(null);
    await reload();
  };

  const onAddGroup = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    const result = await createBudgetGroup({
      budgetId: selected.id,
      name: groupName,
      displayOrder: groups.length,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setGroupName('');
    setLineGroupId(result.data.id);
    setCreationPanel(null);
    await reload();
  };

  const onAddLine = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected || !lineGroupId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await upsertBudgetLine({
        budgetId: selected.id,
        groupId: lineGroupId,
        title: lineTitle,
        plannedMinor: parseMajorToMinor(plannedMajor),
        committedMinor: parseMajorToMinor(committedMajor),
        actualMinor: parseMajorToMinor(actualMajor),
        currency: selected.currency,
        publishFlag,
        publicDescription,
      });
      setBusy(false);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setLineTitle('');
      setPlannedMajor('0');
      setCommittedMajor('0');
      setActualMajor('0');
      setPublicDescription('');
      setPublishFlag(false);
      setCreationPanel(null);
      await reload();
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : 'invalid amount');
    }
  };

  const runAction = async (fn: () => Promise<{ ok: boolean; message?: string }>, okMsg: string) => {
    setBusy(true);
    setError(null);
    const result = await fn();
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? 'failed');
      return;
    }
    setSuccess(okMsg);
    setWorkflowAction(null);
    setReason('');
    await reload();
  };

  const confirmWorkflow = async () => {
    if (!selected || !workflowAction) return;
    if (workflowAction === 'submit') {
      await runAction(
        () => submitBudgetForReview(selected.id, reason),
        t('settings.adminFundingBudgetSubmitted'),
      );
      return;
    }
    if (workflowAction === 'approve') {
      if (!reason.trim()) return;
      await runAction(
        () => approveBudget(selected.id, reason),
        t('settings.adminFundingBudgetApproved'),
      );
      return;
    }
    if (workflowAction === 'revise') {
      await runAction(
        () => reviseApprovedBudget(selected.id, reason || 'revision'),
        t('settings.adminFundingBudgetRevised'),
      );
      return;
    }
    if (workflowAction === 'publish') {
      await runAction(
        () => publishBudget(selected.id, reason || 'publish'),
        t('settings.adminFundingBudgetPublished'),
      );
      return;
    }
    if (workflowAction === 'unpublish') {
      await runAction(
        () => unpublishBudget(selected.id, reason || 'unpublish'),
        t('settings.adminFundingBudgetUnpublished'),
      );
    }
  };

  const listState = classifyBudgetListState({
    loading,
    allowView,
    error,
    budgetCount: ordinaryBudgets.length + (selected?.lifecycle_status === 'superseded' ? 1 : 0),
    selectedId:
      ordinaryBudgets.some((b) => b.id === selectedId)
      || historicalBudgets.some((b) => b.id === selectedId)
        ? selectedId
        : null,
  });

  const viewingHistorical = selected?.lifecycle_status === 'superseded';
  const workingBudgetId = preferredWorkingBudgetId(budgets);
  const lifecycleLabel = (status: ProjectBudgetRow['lifecycle_status']) => {
    const key = budgetLifecycleBadgeKey(status);
    if (key === 'draft') return t('settings.adminFundingBudgetLifecycleDraft');
    if (key === 'review') return t('settings.adminFundingBudgetLifecycleReview');
    if (key === 'approved') return t('settings.adminFundingBudgetLifecycleApproved');
    return status;
  };

  const workflowCopy = (action: WorkflowAction) => {
    switch (action) {
      case 'submit':
        return {
          title: t('settings.adminFundingBudgetSubmit'),
          body: t('settings.adminFundingBudgetConfirmSubmitBody'),
          confirm: t('settings.adminFundingBudgetConfirmSubmit'),
          reasonRequired: false,
        };
      case 'approve':
        return {
          title: t('settings.adminFundingBudgetApprove'),
          body: t('settings.adminFundingBudgetConfirmApproveBody'),
          confirm: t('settings.adminFundingBudgetConfirmApprove'),
          reasonRequired: true,
        };
      case 'revise':
        return {
          title: t('settings.adminFundingBudgetRevise'),
          body: t('settings.adminFundingBudgetConfirmReviseBody'),
          confirm: t('settings.adminFundingBudgetConfirmRevise'),
          reasonRequired: false,
        };
      case 'publish':
        return {
          title: t('settings.adminFundingBudgetPublish'),
          body: t('settings.adminFundingBudgetConfirmPublishBody'),
          confirm: t('settings.adminFundingBudgetConfirmPublish'),
          reasonRequired: false,
        };
      case 'unpublish':
        return {
          title: t('settings.adminFundingBudgetUnpublish'),
          body: t('settings.adminFundingBudgetConfirmUnpublishBody'),
          confirm: t('settings.adminFundingBudgetConfirmUnpublish'),
          reasonRequired: false,
        };
    }
  };

  const openWorkflow = (action: WorkflowAction) => {
    setCreationPanel(null);
    setReason('');
    setWorkflowAction(action);
  };

  const primaryActionLabel = (action: WorkflowAction) => {
    const copy = workflowCopy(action);
    return copy.title;
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4 pb-8 md:pb-0" data-build-key="fundingBudgetAdmin" data-build-label="Funding budget admin">
        {(error && listState !== 'access_denied') || success || listState === 'loading' || listState === 'access_denied' || listState === 'load_failed' || listState === 'empty' || listState === 'no_selection' ? (
          <div className="space-y-2">
            {error && listState !== 'access_denied' ? (
              <p className="text-sm text-destructive" role="alert">{error}</p>
            ) : null}
            {success ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">{success}</p>
            ) : null}
            {listState === 'loading' ? (
              <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            ) : null}
            {listState === 'access_denied' ? (
              <p className="text-sm text-destructive" role="alert" data-build-key="fundingBudgetAccessDenied">
                {t('settings.adminFundingBudgetAccessDenied')}
              </p>
            ) : null}
            {listState === 'load_failed' ? (
              <p className="text-sm text-destructive" role="alert" data-build-key="fundingBudgetLoadFailed">
                {t('settings.adminFundingBudgetLoadFailed')}
              </p>
            ) : null}
            {listState === 'empty' ? (
              <p className="text-sm text-muted-foreground" data-build-key="fundingBudgetEmpty">
                {t('settings.adminFundingBudgetEmpty')}
              </p>
            ) : null}
            {listState === 'no_selection' ? (
              <p className="text-sm text-muted-foreground" data-build-key="fundingBudgetNoSelection">
                {t('settings.adminFundingBudgetNoSelection')}
              </p>
            ) : null}
          </div>
        ) : null}

        {allowEdit && listState === 'empty' ? (
          <Card className="space-y-3 p-4" data-build-key="fundingBudgetCreatePanel">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium">{t('settings.adminFundingBudgetNew')}</h3>
            </div>
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={onCreateBudget}>
              <div className="space-y-1">
                <Label htmlFor="budget-name">{t('settings.adminFundingBudgetName')}</Label>
                <Input
                  id="budget-name"
                  value={budgetName}
                  onChange={(e) => setBudgetName(e.target.value)}
                  required
                  disabled={!allowEdit}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="budget-purpose">{t('settings.adminFundingBudgetPurpose')}</Label>
                <Textarea
                  id="budget-purpose"
                  value={budgetPurpose}
                  onChange={(e) => setBudgetPurpose(e.target.value)}
                  disabled={!allowEdit}
                />
              </div>
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <Button type="submit" disabled={busy || !allowEdit}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('settings.adminFundingBudgetCreate')}
                </Button>
              </div>
            </form>
          </Card>
        ) : null}

        {selected ? (
          <>
            <Card className="space-y-4 p-4" data-build-key="fundingBudgetCompactHeader">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="min-w-0 max-w-full">
                      {viewingHistorical ? (
                        <div className="space-y-1">
                          <p
                            className="truncate text-sm font-medium leading-10 text-foreground"
                            title={selected.name}
                          >
                            {selected.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t('settings.adminFundingBudgetHistoricalView')}
                            {workingBudgetId ? (
                              <>
                                {' · '}
                                <button
                                  type="button"
                                  className="underline underline-offset-2 hover:text-foreground"
                                  onClick={() => void selectBudget(workingBudgetId)}
                                >
                                  {t('settings.adminFundingBudgetReturnWorking')}
                                </button>
                              </>
                            ) : null}
                          </p>
                        </div>
                      ) : shouldUseBudgetSelector(ordinaryBudgets.length) ? (
                        <div className="inline-grid max-w-full">
                          <span
                            className="invisible col-start-1 row-start-1 whitespace-pre px-3 pr-9 text-sm"
                            aria-hidden
                          >
                            {budgetSelectorSizingLabel(ordinaryBudgets, selected.name)}
                          </span>
                          <select
                            id="budget-selector"
                            className="col-start-1 row-start-1 h-10 w-full min-w-0 max-w-full rounded-md border border-input bg-background px-3 pr-9 text-sm"
                            value={selected.id}
                            aria-label={t('settings.adminFundingBudgetSelectorLabel')}
                            onChange={(e) => void selectBudget(e.target.value)}
                          >
                            {ordinaryBudgets.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <p
                          className="truncate text-sm font-medium leading-10 text-foreground"
                          title={selected.name}
                        >
                          {selected.name}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {primaryAction && PrimaryWorkflowIcon ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              size="icon"
                              className="h-9 w-9"
                              disabled={busy}
                              aria-label={primaryActionLabel(primaryAction)}
                              onClick={() => openWorkflow(primaryAction)}
                            >
                              <PrimaryWorkflowIcon className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{primaryActionLabel(primaryAction)}</TooltipContent>
                        </Tooltip>
                      ) : null}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-9 w-9"
                            aria-label={t('settings.adminFundingBudgetExportCsv')}
                            onClick={() =>
                              downloadTextFile(
                                `budget-${selected.name}-v${selected.version}.csv`,
                                budgetLinesToCsv(selected, groups, lines),
                              )
                            }
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('settings.adminFundingBudgetExportCsv')}</TooltipContent>
                      </Tooltip>
                      {allowEdit ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-9 w-9"
                              aria-label={t('settings.adminFundingBudgetNew')}
                              onClick={() => openCreationPanel('new-budget')}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t('settings.adminFundingBudgetNew')}</TooltipContent>
                        </Tooltip>
                      ) : null}
                      {showOverflowMenu ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-9 w-9"
                            aria-label={t('settings.adminFundingBudgetActionsMenu')}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {historicalBudgets.map((b) => (
                            <DropdownMenuItem key={b.id} onSelect={() => void selectBudget(b.id)}>
                              {t('settings.adminFundingBudgetViewHistorical')}: {b.name}
                            </DropdownMenuItem>
                          ))}
                          {selected.lifecycle_status === 'under_review' && canApproveSelected && primaryAction !== 'approve' ? (
                            <DropdownMenuItem onSelect={() => openWorkflow('approve')}>
                              {t('settings.adminFundingBudgetApprove')}
                            </DropdownMenuItem>
                          ) : null}
                          {selected.lifecycle_status === 'approved' ? (
                            <>
                              {allowEdit && primaryAction !== 'revise' ? (
                                <DropdownMenuItem onSelect={() => openWorkflow('revise')}>
                                  {t('settings.adminFundingBudgetRevise')}
                                </DropdownMenuItem>
                              ) : null}
                              {allowPublish && !selected.published_at && primaryAction !== 'publish' ? (
                                <DropdownMenuItem onSelect={() => openWorkflow('publish')}>
                                  {t('settings.adminFundingBudgetPublish')}
                                </DropdownMenuItem>
                              ) : null}
                              {allowPublish && selected.published_at && primaryAction !== 'unpublish' ? (
                                <DropdownMenuItem onSelect={() => openWorkflow('unpublish')}>
                                  {t('settings.adminFundingBudgetUnpublish')}
                                </DropdownMenuItem>
                              ) : null}
                            </>
                          ) : null}
                          {selected.lifecycle_status === 'under_review' && allowApprove && !canApproveSelected ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem disabled title={t('settings.adminFundingBudgetSelfApproveBlocked')}>
                                {t('settings.adminFundingBudgetApprove')}
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline">{lifecycleLabel(selected.lifecycle_status)}</Badge>
                    <Badge variant="outline">{selected.currency}</Badge>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="cursor-help">
                          {selected.published_at
                            ? t('settings.adminFundingBudgetPublishedAt')
                            : t('settings.adminFundingBudgetUnpublishedTag')}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        {selected.published_at
                          ? `${t('settings.adminFundingBudgetPublishedAt')} ${selected.published_at}`
                          : t('settings.adminFundingBudgetNotPublic')}
                      </TooltipContent>
                    </Tooltip>
                    {selected.is_demonstration ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="outline"
                            className="cursor-help border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100"
                          >
                            {t('settings.adminFundingBudgetDemoTag')}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          {t('settings.adminFundingBudgetDemoTimingNote')}
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                    {isValidationBudget ? (
                      <Badge variant="outline">{t('settings.adminFundingBudgetDurationBadge')}</Badge>
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      v{selected.version}
                      {' · '}
                      {groups.length} {t('settings.adminFundingBudgetGroupsCount')}
                      {' · '}
                      {lines.length} {t('settings.adminFundingBudgetLinesCount')}
                    </span>
                  </div>
                  {isValidationBudget ? (
                    <div
                      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground"
                      data-build-key="fundingBudgetValidationClassification"
                    >
                      <span>{t('settings.adminFundingBudgetValidationClassification')}</span>
                      <span aria-hidden>·</span>
                      <span>{t('settings.adminFundingBudgetValidationPathway')}</span>
                      {onGoToSection ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="link"
                          className="h-auto px-0 text-xs"
                          onClick={() => onGoToSection('program-plan')}
                        >
                          {t('settings.adminFundingBudgetViewProgramPlan')}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                  {selected.is_demonstration ? (
                    <p className="text-xs text-muted-foreground" data-build-key="fundingBudgetDemoClassification">
                      {t('settings.adminFundingBudgetDemoClassification')}
                    </p>
                  ) : null}
                  {!allowEdit && allowView ? (
                    <p className="text-xs text-muted-foreground">{t('settings.adminFundingBudgetViewOnly')}</p>
                  ) : null}
                  {!editable && selected.lifecycle_status !== 'draft' ? (
                    <p className="text-xs text-muted-foreground">{t('settings.adminFundingBudgetImmutable')}</p>
                  ) : null}
                </div>
              </div>

              {totals ? (
                <div
                  className="grid grid-cols-2 gap-3 border-t border-border/50 pt-3 sm:grid-cols-3 lg:grid-cols-5"
                  data-build-key="fundingBudgetTotals"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-xs text-muted-foreground">{t('settings.adminFundingBudgetPlanned')}</div>
                    <div className="text-sm font-medium">
                      <BudgetAmount amountMinor={totals.plannedMinor} currency={selected.currency} />
                    </div>
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-xs text-muted-foreground">{t('settings.adminFundingBudgetCommitted')}</div>
                    <div className="text-sm font-medium">
                      <BudgetAmount amountMinor={totals.committedMinor} currency={selected.currency} />
                    </div>
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-xs text-muted-foreground">{t('settings.adminFundingBudgetActual')}</div>
                    <div className="text-sm font-medium">
                      <BudgetAmount amountMinor={totals.actualMinor} currency={selected.currency} />
                    </div>
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-xs text-muted-foreground">{t('settings.adminFundingBudgetRemaining')}</div>
                    <div className="text-sm font-medium">
                      <BudgetAmount amountMinor={totals.remainingPlannedMinor} currency={selected.currency} />
                    </div>
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-xs text-muted-foreground">{t('settings.adminFundingBudgetUncommitted')}</div>
                    <div className="text-sm font-medium">
                      <BudgetAmount amountMinor={totals.uncommittedMinor} currency={selected.currency} />
                    </div>
                  </div>
                </div>
              ) : null}
            </Card>

            <Card className="space-y-3 p-4" data-build-key="fundingBudgetNestedGroups">
              <div className="flex flex-wrap items-center gap-1.5" data-build-key="fundingBudgetStructureToolbar">
                <h3 className="mr-1 text-sm font-medium">{t('settings.adminFundingBudgetStructure')}</h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      aria-label={
                        allGroupsExpanded
                          ? t('settings.adminFundingBudgetCollapse')
                          : t('settings.adminFundingBudgetExpand')
                      }
                      aria-pressed={allGroupsExpanded}
                      onClick={toggleExpandCollapseAll}
                      disabled={nestedGroups.length === 0}
                    >
                      {allGroupsExpanded ? (
                        <FolderOpen className="h-4 w-4" aria-hidden />
                      ) : (
                        <Folder className="h-4 w-4" aria-hidden />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {allGroupsExpanded
                      ? t('settings.adminFundingBudgetCollapse')
                      : t('settings.adminFundingBudgetExpand')}
                  </TooltipContent>
                </Tooltip>
                {editable ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        aria-label={t('settings.adminFundingBudgetAddGroup')}
                        onClick={() => openCreationPanel('add-group')}
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('settings.adminFundingBudgetAddGroup')}</TooltipContent>
                  </Tooltip>
                ) : null}
              </div>

              <div ref={structureLayoutRef} className="min-w-0 space-y-2" data-budget-structure-layout={structureIsWide ? 'wide' : 'narrow'}>
                  {structureIsWide ? (
                    <div className="min-w-0 overflow-x-auto" data-budget-structure-wide>
                      <table className="w-full table-fixed border-collapse text-sm">
                        <colgroup>
                          <col className="w-[42%]" />
                          <col className="w-[10%]" />
                          <col className="w-[14%]" />
                          <col className="w-[14%]" />
                          <col className="w-[14%]" />
                          <col className="w-[6%]" />
                        </colgroup>
                        <thead>
                          <tr className="border-b text-left text-xs text-muted-foreground">
                            <th className="py-2 pr-2 font-medium">
                              <input
                                type="search"
                                value={structureQuery}
                                onChange={(e) => setStructureQuery(e.target.value)}
                                placeholder={t('settings.adminFundingBudgetColName')}
                                aria-label={t('settings.adminFundingBudgetColName')}
                                autoComplete="off"
                                spellCheck={false}
                                className="w-full min-w-0 appearance-none border-0 bg-transparent p-0 text-xs font-medium text-muted-foreground shadow-none outline-none placeholder:text-muted-foreground focus:outline-none focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
                              />
                            </th>
                            <th className="py-2 pr-2 font-medium">{t('settings.adminFundingBudgetPeriod')}</th>
                            <th className="py-2 pr-2 text-right font-medium">{t('settings.adminFundingBudgetPlanned')}</th>
                            <th className="py-2 pr-2 text-right font-medium">{t('settings.adminFundingBudgetCommitted')}</th>
                            <th className="py-2 pr-2 text-right font-medium">{t('settings.adminFundingBudgetActual')}</th>
                            <th className="py-2 font-medium">{t('settings.adminFundingBudgetColPublic')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {structureFilterActive && visibleNestedGroups.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-4 text-sm text-muted-foreground">
                                —
                              </td>
                            </tr>
                          ) : null}
                          {visibleNestedGroups.map(({ group, lines: groupLines, totals: groupTotals }) => {
                            const open = expandedGroupIds.has(group.id);
                            const groupPeriod = formatGroupPeriodLabel(groupLines);
                            return (
                              <Fragment key={group.id}>
                                <tr
                                  className="group/budget-group border-b border-border/70 bg-muted/35 hover:bg-muted/45 focus-within:bg-muted/45"
                                  data-budget-group-id={group.id}
                                  data-budget-row="group"
                                >
                                  <td className="py-2.5 pr-2 align-middle text-sm">
                                    <div className="flex min-w-0 items-center gap-1">
                                      <button
                                        type="button"
                                        className="flex min-w-0 items-center gap-1.5 text-left text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        aria-expanded={open}
                                        onClick={() => toggleGroupExpanded(group.id)}
                                      >
                                        <ChevronDown
                                          className={cn(
                                            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                                            open ? 'rotate-0' : '-rotate-90',
                                          )}
                                          aria-hidden
                                        />
                                        <span className="truncate">{group.name}</span>
                                      </button>
                                      {editable ? (
                                        <button
                                          type="button"
                                          className="group/addline inline-flex h-6 shrink-0 items-center gap-1 rounded px-1 text-muted-foreground opacity-0 transition-opacity hover:bg-background/80 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring group-hover/budget-group:opacity-100"
                                          aria-label={t('settings.adminFundingBudgetAddLineInGroup')}
                                          onClick={() => startAddLineInGroup(group.id)}
                                        >
                                          <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                          <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs opacity-0 transition-all duration-150 group-hover/addline:max-w-[9rem] group-hover/addline:opacity-100 group-focus-visible/addline:max-w-[9rem] group-focus-visible/addline:opacity-100">
                                            {t('settings.adminFundingBudgetAddLineInGroup')}
                                          </span>
                                        </button>
                                      ) : null}
                                    </div>
                                  </td>
                                  <td className="py-2.5 pr-2 align-middle whitespace-nowrap text-sm font-normal text-muted-foreground">
                                    {groupPeriod.periodLabel}
                                  </td>
                                  <td className="py-2.5 pr-2 align-middle text-right text-sm font-semibold tabular-nums">
                                    <BudgetAmount amountMinor={groupTotals.plannedMinor} currency={selected.currency} />
                                  </td>
                                  <td className="py-2.5 pr-2 align-middle text-right text-sm font-semibold tabular-nums">
                                    <BudgetAmount amountMinor={groupTotals.committedMinor} currency={selected.currency} />
                                  </td>
                                  <td className="py-2.5 pr-2 align-middle text-right text-sm font-semibold tabular-nums">
                                    <BudgetAmount amountMinor={groupTotals.actualMinor} currency={selected.currency} />
                                  </td>
                                  <td className="py-2.5 align-middle text-sm text-muted-foreground">—</td>
                                </tr>
                                {open ? (
                                  groupLines.length === 0 ? (
                                    <tr data-budget-group-lines={group.id}>
                                      <td colSpan={6} className="bg-muted/5 py-2 pl-10 text-sm text-muted-foreground">
                                        {t('settings.adminFundingBudgetGroupEmpty')}
                                      </td>
                                    </tr>
                                  ) : (
                                    groupLines.map((line) => {
                                      const timing = formatBudgetLineTiming(line.period_label);
                                      const { workstreamId, displayTitle } = splitBudgetLineTitle(line.title);
                                      const purpose = parsePurposeFromDescription(line.description);
                                      const funding =
                                        line.owner_label
                                        || line.funding_restriction_tag
                                        || null;
                                      return (
                                        <tr
                                          key={line.id}
                                          className="group/line-item border-b border-border/30 bg-background/40 hover:bg-muted/15 focus-within:bg-muted/20"
                                          data-budget-line-id={line.id}
                                          data-budget-line-group={line.group_id}
                                          data-budget-row="line"
                                          tabIndex={0}
                                        >
                                          <td className="py-1.5 pr-2 align-middle text-sm font-normal">
                                            <div className="border-l border-border/50 pl-8">
                                              <div className="flex min-w-0 items-baseline gap-2 truncate text-sm font-normal leading-snug">
                                                {workstreamId ? (
                                                  <span className="shrink-0 text-sm font-normal text-muted-foreground">
                                                    {workstreamId}
                                                  </span>
                                                ) : null}
                                                <span className="truncate text-foreground">{displayTitle}</span>
                                              </div>
                                              <div className="mt-0.5 hidden space-y-0.5 text-[11px] leading-snug text-muted-foreground group-hover/line-item:block group-focus-within/line-item:block">
                                                {purpose ? (
                                                  <div className="line-clamp-2">
                                                    {t('settings.adminFundingBudgetPurposeLabel')}: {purpose}
                                                  </div>
                                                ) : null}
                                                {funding ? (
                                                  <div>
                                                    {t('settings.adminFundingBudgetFundingResponsibility')}: {funding}
                                                  </div>
                                                ) : null}
                                                {line.public_description ? (
                                                  <div className="line-clamp-2">
                                                    {t('settings.adminFundingBudgetPublicCandidate')}:{' '}
                                                    {line.public_description}
                                                  </div>
                                                ) : null}
                                                <div>{t('settings.adminFundingBudgetWorkingEstimate')}</div>
                                              </div>
                                            </div>
                                          </td>
                                          <td className="py-1.5 pr-2 align-middle whitespace-nowrap text-sm font-normal text-muted-foreground">
                                            {timing.timingLabel}
                                          </td>
                                          <td className="py-1.5 pr-2 align-middle text-right text-sm font-normal tabular-nums text-foreground">
                                            <BudgetAmount amountMinor={Number(line.planned_minor)} currency={line.currency} />
                                          </td>
                                          <td className="py-1.5 pr-2 align-middle text-right text-sm font-normal tabular-nums text-foreground">
                                            <BudgetAmount amountMinor={Number(line.committed_minor)} currency={line.currency} />
                                          </td>
                                          <td className="py-1.5 pr-2 align-middle text-right text-sm font-normal tabular-nums text-foreground">
                                            <BudgetAmount amountMinor={Number(line.actual_minor)} currency={line.currency} />
                                          </td>
                                          <td className="py-1.5 align-middle text-sm font-normal text-muted-foreground">
                                            <span
                                              aria-label={
                                                line.publish_flag
                                                  ? t('settings.adminFundingBudgetPublicYes')
                                                  : t('settings.adminFundingBudgetPublicNo')
                                              }
                                            >
                                              {line.publish_flag ? t('common.yes') : t('common.no')}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })
                                  )
                                ) : null}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <ul className="space-y-2" data-budget-structure-narrow>
                      {visibleNestedGroups.map(({ group, lines: groupLines, totals: groupTotals }) => {
                        const open = expandedGroupIds.has(group.id);
                        const groupPeriod = formatGroupPeriodLabel(groupLines);
                        return (
                          <li
                            key={group.id}
                            className="group/budget-group min-w-0 rounded-md border border-border/70 bg-muted/25"
                            data-budget-group-id={group.id}
                          >
                            <div className="flex min-w-0 items-start gap-2 p-3 hover:bg-muted/35 focus-within:bg-muted/35">
                              <div className="flex min-w-0 flex-1 items-start gap-1">
                                <button
                                  type="button"
                                  className="flex min-w-0 flex-1 items-start gap-2 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                  aria-expanded={open}
                                  onClick={() => toggleGroupExpanded(group.id)}
                                >
                                  <ChevronDown
                                    className={cn(
                                      'mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                                      open ? 'rotate-0' : '-rotate-90',
                                    )}
                                    aria-hidden
                                  />
                                  <span className="min-w-0 space-y-1">
                                    <span className="block text-sm font-semibold text-foreground">{group.name}</span>
                                    <span className="block text-sm font-normal text-muted-foreground">
                                      {groupPeriod.periodLabel}
                                    </span>
                                    <span className="block text-sm font-semibold tabular-nums text-foreground">
                                      <BudgetAmount amountMinor={groupTotals.plannedMinor} currency={selected.currency} />
                                      {' · '}
                                      <BudgetAmount amountMinor={groupTotals.committedMinor} currency={selected.currency} />
                                      {' · '}
                                      <BudgetAmount amountMinor={groupTotals.actualMinor} currency={selected.currency} />
                                    </span>
                                  </span>
                                </button>
                                {editable ? (
                                  <button
                                    type="button"
                                    className="group/addline mt-0.5 inline-flex h-6 shrink-0 items-center gap-1 rounded px-1 text-muted-foreground opacity-0 transition-opacity hover:bg-background/80 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring group-hover/budget-group:opacity-100"
                                    aria-label={t('settings.adminFundingBudgetAddLineInGroup')}
                                    onClick={() => startAddLineInGroup(group.id)}
                                  >
                                    <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                    <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs opacity-0 transition-all duration-150 group-hover/addline:max-w-[9rem] group-hover/addline:opacity-100 group-focus-visible/addline:max-w-[9rem] group-focus-visible/addline:opacity-100">
                                      {t('settings.adminFundingBudgetAddLineInGroup')}
                                    </span>
                                  </button>
                                ) : null}
                              </div>
                            </div>
                            {open ? (
                              <div className="border-t border-border/40 bg-background/50 px-3 pb-3 pt-2" data-budget-group-lines={group.id}>
                                {groupLines.length === 0 ? (
                                  <p className="pl-8 text-sm text-muted-foreground">
                                    {t('settings.adminFundingBudgetGroupEmpty')}
                                  </p>
                                ) : (
                                  <ul className="space-y-1.5 border-l border-border/40 pl-3 ml-2">
                                    {groupLines.map((line) => {
                                      const timing = formatBudgetLineTiming(line.period_label);
                                      const { workstreamId, displayTitle } = splitBudgetLineTitle(line.title);
                                      const purpose = parsePurposeFromDescription(line.description);
                                      const funding =
                                        line.owner_label
                                        || line.funding_restriction_tag
                                        || null;
                                      return (
                                        <li
                                          key={line.id}
                                          className="group/line-item min-w-0 rounded-md border border-border/30 bg-muted/10 px-3 py-1.5 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                          data-budget-line-id={line.id}
                                          data-budget-line-group={line.group_id}
                                          tabIndex={0}
                                        >
                                          <div className="flex min-w-0 flex-wrap items-baseline gap-2 text-sm font-normal leading-snug">
                                            {workstreamId ? (
                                              <span className="shrink-0 text-sm text-muted-foreground">{workstreamId}</span>
                                            ) : null}
                                            <span className="min-w-0 text-foreground">{displayTitle}</span>
                                          </div>
                                          <div className="mt-1 space-y-0.5 text-sm font-normal">
                                            <div className="text-muted-foreground">{timing.timingLabel}</div>
                                            <div className="tabular-nums text-foreground">
                                              <BudgetAmount amountMinor={Number(line.planned_minor)} currency={line.currency} />
                                              {' · '}
                                              <BudgetAmount amountMinor={Number(line.committed_minor)} currency={line.currency} />
                                              {' · '}
                                              <BudgetAmount amountMinor={Number(line.actual_minor)} currency={line.currency} />
                                            </div>
                                            <div className="text-muted-foreground">
                                              {t('settings.adminFundingBudgetColPublic')}:{' '}
                                              {line.publish_flag ? t('common.yes') : t('common.no')}
                                            </div>
                                          </div>
                                          <div className="mt-1 hidden space-y-0.5 text-xs text-muted-foreground group-hover/line-item:block group-focus-within/line-item:block">
                                            {purpose ? (
                                              <div>
                                                {t('settings.adminFundingBudgetPurposeLabel')}: {purpose}
                                              </div>
                                            ) : null}
                                            {funding ? (
                                              <div>
                                                {t('settings.adminFundingBudgetFundingResponsibility')}: {funding}
                                              </div>
                                            ) : null}
                                            {line.public_description ? (
                                              <div>
                                                {t('settings.adminFundingBudgetPublicCandidate')}:{' '}
                                                {line.public_description}
                                              </div>
                                            ) : null}
                                            <div>{t('settings.adminFundingBudgetWorkingEstimate')}</div>
                                          </div>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
            </Card>

            {allowEdit && creationPanel === 'new-budget' ? (
              <Card className="space-y-3 p-4" data-build-key="fundingBudgetCreatePanel">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium">{t('settings.adminFundingBudgetNew')}</h3>
                  <Button type="button" size="sm" variant="ghost" onClick={closeCreationPanel}>
                    {t('common.cancel')}
                  </Button>
                </div>
                <form className="grid gap-3 sm:grid-cols-2" onSubmit={onCreateBudget}>
                  <div className="space-y-1">
                    <Label htmlFor="budget-name">{t('settings.adminFundingBudgetName')}</Label>
                    <Input
                      id="budget-name"
                      value={budgetName}
                      onChange={(e) => setBudgetName(e.target.value)}
                      required
                      disabled={!allowEdit}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="budget-purpose">{t('settings.adminFundingBudgetPurpose')}</Label>
                    <Textarea
                      id="budget-purpose"
                      value={budgetPurpose}
                      onChange={(e) => setBudgetPurpose(e.target.value)}
                      disabled={!allowEdit}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                    <Button type="submit" disabled={busy || !allowEdit}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t('settings.adminFundingBudgetCreate')}
                    </Button>
                    <Button type="button" variant="outline" onClick={closeCreationPanel}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                </form>
              </Card>
            ) : null}

            {editable && creationPanel === 'add-group' ? (
              <Card className="space-y-3 p-4" data-build-key="fundingBudgetAddGroupPanel">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium">{t('settings.adminFundingBudgetAddGroup')}</h3>
                  <Button type="button" size="sm" variant="ghost" onClick={closeCreationPanel}>
                    {t('common.cancel')}
                  </Button>
                </div>
                <form className="flex flex-wrap items-end gap-2" onSubmit={onAddGroup}>
                  <div className="min-w-[12rem] flex-1 space-y-1">
                    <Label htmlFor="group-name">{t('settings.adminFundingBudgetGroup')}</Label>
                    <Input
                      id="group-name"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <Button type="submit" size="sm" disabled={busy}>
                    {t('settings.adminFundingBudgetAddGroup')}
                  </Button>
                </form>
              </Card>
            ) : null}

            {editable && creationPanel === 'add-line' ? (
              <Card className="space-y-3 p-4" data-build-key="fundingBudgetAddLinePanel">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium">{t('settings.adminFundingBudgetAddLine')}</h3>
                  <Button type="button" size="sm" variant="ghost" onClick={closeCreationPanel}>
                    {t('common.cancel')}
                  </Button>
                </div>
                <form ref={addLineFormRef} className="grid gap-2 sm:grid-cols-2" onSubmit={onAddLine}>
                  <div className="space-y-1">
                    <Label htmlFor="line-group">{t('settings.adminFundingBudgetGroup')}</Label>
                    <select
                      id="line-group"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={lineGroupId}
                      onChange={(e) => setLineGroupId(e.target.value)}
                      required
                    >
                      <option value="">{t('settings.adminFundingBudgetSelectGroup')}</option>
                      {nestedGroups.map(({ group: g }) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="line-title">{t('settings.adminFundingBudgetLine')}</Label>
                    <Input
                      id="line-title"
                      value={lineTitle}
                      onChange={(e) => setLineTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('settings.adminFundingBudgetPlanned')}</Label>
                    <Input value={plannedMajor} onChange={(e) => setPlannedMajor(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('settings.adminFundingBudgetCommitted')}</Label>
                    <Input value={committedMajor} onChange={(e) => setCommittedMajor(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('settings.adminFundingBudgetActual')}</Label>
                    <Input value={actualMajor} onChange={(e) => setActualMajor(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('settings.adminFundingBudgetPublicDescription')}</Label>
                    <Input value={publicDescription} onChange={(e) => setPublicDescription(e.target.value)} />
                  </div>
                  <label className="flex items-center gap-2 text-sm sm:col-span-2">
                    <input type="checkbox" checked={publishFlag} onChange={(e) => setPublishFlag(e.target.checked)} />
                    {t('settings.adminFundingBudgetPublishFlag')}
                  </label>
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                    <Button type="submit" size="sm" disabled={busy || !lineGroupId}>
                      {t('settings.adminFundingBudgetAddLine')}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={closeCreationPanel}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                </form>
              </Card>
            ) : null}
          </>
        ) : null}

        <Dialog
          open={workflowAction !== null}
          onOpenChange={(open) => {
            if (!open) {
              setWorkflowAction(null);
              setReason('');
            }
          }}
        >
          {workflowAction ? (
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{workflowCopy(workflowAction).title}</DialogTitle>
                <DialogDescription>{workflowCopy(workflowAction).body}</DialogDescription>
              </DialogHeader>
              <div className="space-y-1">
                <Label htmlFor="budget-workflow-reason">
                  {t('settings.adminFundingBudgetReason')}
                  {workflowCopy(workflowAction).reasonRequired ? ' *' : ''}
                </Label>
                <Textarea
                  id="budget-workflow-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required={workflowCopy(workflowAction).reasonRequired}
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setWorkflowAction(null);
                    setReason('');
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="button"
                  disabled={
                    busy
                    || (workflowCopy(workflowAction).reasonRequired && !reason.trim())
                  }
                  onClick={() => void confirmWorkflow()}
                >
                  {workflowCopy(workflowAction).confirm}
                </Button>
              </DialogFooter>
            </DialogContent>
          ) : null}
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
