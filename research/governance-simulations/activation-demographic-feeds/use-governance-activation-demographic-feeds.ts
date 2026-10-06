/**
 * NON-OPERATIONAL RESEARCH ONLY.
 * Demographic feed management lives under research/governance-simulations/.
 * Do not import this hook from the Civizen production application route graph.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';import type { Database } from '@/integrations/supabase/types';
import {
  buildFallbackWorkerAlertRows,
  FEED_WORKER_DEFAULT_FRESHNESS_HOURS,
  runActivationDemographicFeedWorkerSweep,
  type RecordFeedWorkerRunDraft,
} from './governance-activation-demographic-feed-workers';
import {
  readActivationFeedWorkerEscalationPolicyEventRows,
  readActivationFeedWorkerEscalationPolicySummary,
  type ActivationFeedWorkerEscalationPolicyEventRow,
  type ActivationFeedWorkerEscalationPolicySummaryRow,
} from './governance-activation-feed-worker-escalation-policy';
import {
  ACTIVATION_FEED_DATA_AUTO_RELOAD_MIN_MS,
  isFeedDataAutoReloadThrottled,
  isMissingActivationDemographicFeedBackend,
  isMissingActivationDemographicFeedScheduleRunHistoryRpc,
  isMissingActivationDemographicFeedSchedulerStatusRpc,
  isMissingActivationDemographicFeedWorkerBackend,
  isMissingActivationDemographicFeedWorkerEscalationAcknowledgePageRpc,
  isMissingActivationDemographicFeedWorkerEscalationPageBoardRpc,
  isMissingActivationDemographicFeedWorkerEscalationPageHistoryRpc,
  isMissingActivationDemographicFeedWorkerEscalationPolicyEventHistoryRpc,
  isMissingActivationDemographicFeedWorkerEscalationPolicySetRpc,
  isMissingActivationDemographicFeedWorkerEscalationPolicySummaryRpc,
  isMissingActivationDemographicFeedWorkerEscalationResolvePageRpc,
  type ActivationDemographicFeedAdapterRow,
  type ActivationDemographicFeedAlertType,
  type ActivationDemographicFeedIngestionRow,
  type ActivationDemographicFeedWorkerAlertSummaryRow,
  type ActivationDemographicFeedWorkerOutboxRow,
  type ActivationDemographicFeedWorkerRunRow,
} from './governance-activation-demographic-feeds';
import {
  GOVERNANCE_ACTIVATION_DEMOGRAPHIC_FEED_WORKER_ESCALATION_PAGE_KEY,
  GOVERNANCE_PUBLIC_AUDIT_EXTERNAL_EXECUTION_PAGE_BOARD_MAX_PAGES,
  countOpenGovernancePublicAuditExternalExecutionPagesForPageKeySubstring,
  readGovernancePublicAuditExternalExecutionPageBoardRows,
  type GovernancePublicAuditExternalExecutionPageBoardRow,
} from '@/lib/governance-public-audit-automation';
import { readGovernancePublicAuditVerifierFederationExchangeReceiptEscalationHistoryRows } from '@/lib/governance-public-audit-verifier-federation-distribution';
import type { GovernancePublicAuditVerifierFederationExchangeReceiptEscalationHistoryRow } from '@/lib/governance-public-audit-verifier-federation.types';
import {
  hashActivationDemographicPayload,
  verifyActivationDemographicPayloadSignature,
} from './governance-activation-demographic-signing';
import { appendUniqueById } from './governance-activation-demographic-feed-pagination';

export type ActivationDemographicFeedWorkerSchedulePolicyRow =
  Database['public']['Tables']['activation_demographic_feed_worker_schedule_policies']['Row'];

export type ActivationDemographicFeedWorkerScheduleAutomationStatusRow =
  Database['public']['Functions']['activation_demographic_feed_worker_schedule_automation_status']['Returns'][number];

export type ActivationDemographicFeedWorkerScheduleAutomationRunHistoryRow =
  Database['public']['Functions']['activation_feed_worker_schedule_automation_run_history']['Returns'][number];

export type ActivationDemographicFeedWorkerEscalationHistoryRow =
  GovernancePublicAuditVerifierFederationExchangeReceiptEscalationHistoryRow;

export type { ActivationFeedWorkerEscalationPolicyEventRow, ActivationFeedWorkerEscalationPolicySummaryRow };

export type SaveActivationFeedWorkerEscalationPolicyDraft = {
  policyName: string;
  escalationEnabled: boolean;
  freshnessHours: number;
  minimumAdapterIssuesForEscalation: number;
  escalationSeverity: 'warning' | 'critical';
};

/** First page size for steward ingestion history (matches prior single-query limit). */
const FEED_INGESTIONS_FIRST_PAGE = 120;
/** Page size when loading older ingestions after the first page. */
const FEED_INGESTIONS_APPEND_PAGE = 80;
const FEED_WORKER_RUNS_FIRST_PAGE = 35;
const FEED_WORKER_RUNS_APPEND_PAGE = 30;
const FEED_WORKER_OUTBOX_ACTIVE_FIRST_PAGE = 25;
const FEED_WORKER_OUTBOX_ACTIVE_APPEND_PAGE = 20;
const FEED_WORKER_OUTBOX_CLOSED_FIRST_PAGE = 15;
const FEED_WORKER_OUTBOX_CLOSED_APPEND_PAGE = 15;

export function useGovernanceActivationDemographicFeeds() {
  const [loadingFeedData, setLoadingFeedData] = useState(true);
  const [feedBackendUnavailable, setFeedBackendUnavailable] = useState(false);
  const [feedWorkerBackendUnavailable, setFeedWorkerBackendUnavailable] = useState(false);
  const [canManageFeeds, setCanManageFeeds] = useState(false);
  const [registeringFeedAdapter, setRegisteringFeedAdapter] = useState(false);
  const [ingestingSignedFeedSnapshot, setIngestingSignedFeedSnapshot] = useState(false);
  const [runningFeedWorkers, setRunningFeedWorkers] = useState(false);
  const [schedulingFeedWorkerJobs, setSchedulingFeedWorkerJobs] = useState(false);
  const [processingFeedOutbox, setProcessingFeedOutbox] = useState(false);
  const [releasingStaleFeedWorkerClaims, setReleasingStaleFeedWorkerClaims] = useState(false);
  const [escalatingFeedWorkerPublicExecution, setEscalatingFeedWorkerPublicExecution] = useState(false);
  const [resolvingFeedAlertKey, setResolvingFeedAlertKey] = useState<string | null>(null);
  const [pendingFeedOutboxCount, setPendingFeedOutboxCount] = useState(0);
  const [claimedFeedOutboxCount, setClaimedFeedOutboxCount] = useState(0);
  const [closedFeedOutboxCount, setClosedFeedOutboxCount] = useState(0);
  const [feedAdapters, setFeedAdapters] = useState<ActivationDemographicFeedAdapterRow[]>([]);
  const [feedIngestions, setFeedIngestions] = useState<ActivationDemographicFeedIngestionRow[]>([]);
  const [feedIngestionsHasMore, setFeedIngestionsHasMore] = useState(false);
  const [loadingMoreFeedIngestions, setLoadingMoreFeedIngestions] = useState(false);
  const [feedWorkerAlerts, setFeedWorkerAlerts] = useState<ActivationDemographicFeedWorkerAlertSummaryRow[]>([]);
  const [feedWorkerOutboxActiveJobs, setFeedWorkerOutboxActiveJobs] = useState<ActivationDemographicFeedWorkerOutboxRow[]>([]);
  const [feedWorkerOutboxRecentClosedJobs, setFeedWorkerOutboxRecentClosedJobs] = useState<ActivationDemographicFeedWorkerOutboxRow[]>([]);
  const [feedWorkerOutboxActiveJobsHasMore, setFeedWorkerOutboxActiveJobsHasMore] = useState(false);
  const [feedWorkerOutboxRecentClosedJobsHasMore, setFeedWorkerOutboxRecentClosedJobsHasMore] = useState(false);
  const [loadingMoreFeedWorkerOutboxActiveJobs, setLoadingMoreFeedWorkerOutboxActiveJobs] = useState(false);
  const [loadingMoreFeedWorkerOutboxRecentClosedJobs, setLoadingMoreFeedWorkerOutboxRecentClosedJobs] = useState(false);
  const [feedWorkerRecentRuns, setFeedWorkerRecentRuns] = useState<ActivationDemographicFeedWorkerRunRow[]>([]);
  const [feedWorkerRunsHasMore, setFeedWorkerRunsHasMore] = useState(false);
  const [loadingMoreFeedWorkerRuns, setLoadingMoreFeedWorkerRuns] = useState(false);
  const [feedWorkerSchedulePolicy, setFeedWorkerSchedulePolicy] =
    useState<ActivationDemographicFeedWorkerSchedulePolicyRow | null>(null);
  const [feedWorkerScheduleAutomationStatus, setFeedWorkerScheduleAutomationStatus] =
    useState<ActivationDemographicFeedWorkerScheduleAutomationStatusRow | null>(null);
  const [feedWorkerScheduleAutomationRunHistory, setFeedWorkerScheduleAutomationRunHistory] =
    useState<ActivationDemographicFeedWorkerScheduleAutomationRunHistoryRow[]>([]);
  const [feedWorkerEscalationPageHistory, setFeedWorkerEscalationPageHistory] =
    useState<ActivationDemographicFeedWorkerEscalationHistoryRow[]>([]);
  const [feedWorkerEscalationBoardPages, setFeedWorkerEscalationBoardPages] =
    useState<GovernancePublicAuditExternalExecutionPageBoardRow[]>([]);
  const [acknowledgingFeedWorkerEscalationPageId, setAcknowledgingFeedWorkerEscalationPageId] = useState<string | null>(null);
  const [resolvingFeedWorkerEscalationPageId, setResolvingFeedWorkerEscalationPageId] = useState<string | null>(null);
  const [feedWorkerEscalationPolicySummary, setFeedWorkerEscalationPolicySummary] =
    useState<ActivationFeedWorkerEscalationPolicySummaryRow | null>(null);
  const [feedWorkerEscalationPolicyEventRows, setFeedWorkerEscalationPolicyEventRows] =
    useState<ActivationFeedWorkerEscalationPolicyEventRow[]>([]);
  const [savingFeedWorkerEscalationPolicy, setSavingFeedWorkerEscalationPolicy] = useState(false);
  const lastFeedDataAutoReloadAtRef = useRef(Date.now());
  const loadFeedDataInFlightRef = useRef(false);

  const openFeedWorkerAlertsCount = useMemo(
    () => feedWorkerAlerts.reduce((count, alert) => count
      + (alert.freshness_alert ? 1 : 0)
      + alert.signature_failure_count
      + alert.connectivity_failure_count
      + alert.payload_failure_count, 0),
    [feedWorkerAlerts],
  );

  const feedWorkerEscalationOpenOrAckPageCount = useMemo(
    () => countOpenGovernancePublicAuditExternalExecutionPagesForPageKeySubstring(
      feedWorkerEscalationBoardPages,
      GOVERNANCE_ACTIVATION_DEMOGRAPHIC_FEED_WORKER_ESCALATION_PAGE_KEY,
    ),
    [feedWorkerEscalationBoardPages],
  );

  const recordFeedWorkerRun = useCallback(async (draft: RecordFeedWorkerRunDraft) => {
    if (feedBackendUnavailable || feedWorkerBackendUnavailable) {
      return;
    }

    const { error } = await supabase.rpc('record_activation_demographic_feed_worker_run', {
      target_adapter_id: draft.adapterId,
      worker_status: draft.status,
      worker_alert_type: draft.alertType,
      worker_alert_severity: draft.severity,
      worker_message: draft.message,
      worker_observed_at: draft.observedAt ?? new Date().toISOString(),
      worker_payload_hash: draft.payloadHash ?? null,
      worker_metadata: draft.metadata ?? {},
      worker_resolved_at: draft.resolvedAt ?? null,
    });

    if (!error) return;

    if (isMissingActivationDemographicFeedWorkerBackend(error)) {
      setFeedWorkerBackendUnavailable(true);
      return;
    }

    console.error('Failed to record activation demographic feed worker run:', {
      draft,
      error,
    });
  }, [feedBackendUnavailable, feedWorkerBackendUnavailable]);

  const loadFeedData = useCallback(async () => {
    if (loadFeedDataInFlightRef.current) {
      return;
    }
    loadFeedDataInFlightRef.current = true;
    lastFeedDataAutoReloadAtRef.current = Date.now();
    setLoadingFeedData(true);

    try {
    const [
      adapterResponse,
      ingestionResponse,
      permissionResponse,
      workerSummaryResponse,
      pendingOutboxResponse,
      claimedOutboxResponse,
      closedOutboxResponse,
      activeOutboxJobsResponse,
      recentClosedOutboxJobsResponse,
      workerRunsResponse,
      schedulePolicyResponse,
      scheduleAutomationStatusResponse,
      scheduleAutomationRunHistoryResponse,
      feedWorkerEscalationPageHistoryResponse,
      feedWorkerEscalationPageBoardResponse,
      feedWorkerEscalationPolicySummaryResponse,
      feedWorkerEscalationPolicyEventHistoryResponse,
    ] = await Promise.all([
      supabase
        .from('activation_demographic_feed_adapters')
        .select('*')
        .order('is_active', { ascending: false })
        .order('updated_at', { ascending: false }),
      supabase
        .from('activation_demographic_feed_ingestions')
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, FEED_INGESTIONS_FIRST_PAGE - 1),
      supabase.rpc('current_profile_can_manage_activation_demographic_feeds'),
      supabase.rpc('activation_demographic_feed_worker_alert_summary', {
        requested_freshness_hours: FEED_WORKER_DEFAULT_FRESHNESS_HOURS,
      }),
      supabase
        .from('activation_demographic_feed_worker_outbox')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('activation_demographic_feed_worker_outbox')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'claimed'),
      supabase
        .from('activation_demographic_feed_worker_outbox')
        .select('id', { count: 'exact', head: true })
        .in('status', ['completed', 'cancelled', 'failed']),
      supabase
        .from('activation_demographic_feed_worker_outbox')
        .select('*')
        .in('status', ['pending', 'claimed'])
        .order('updated_at', { ascending: false })
        .range(0, FEED_WORKER_OUTBOX_ACTIVE_FIRST_PAGE - 1),
      supabase
        .from('activation_demographic_feed_worker_outbox')
        .select('*')
        .in('status', ['completed', 'cancelled', 'failed'])
        .order('updated_at', { ascending: false })
        .range(0, FEED_WORKER_OUTBOX_CLOSED_FIRST_PAGE - 1),
      supabase
        .from('activation_demographic_feed_worker_runs')
        .select('*')
        .order('observed_at', { ascending: false })
        .range(0, FEED_WORKER_RUNS_FIRST_PAGE - 1),
      supabase
        .from('activation_demographic_feed_worker_schedule_policies')
        .select('*')
        .eq('policy_key', 'default')
        .maybeSingle(),
      supabase.rpc('activation_demographic_feed_worker_schedule_automation_status'),
      supabase.rpc('activation_feed_worker_schedule_automation_run_history', {
        p_requested_lookback_hours: 336,
        p_max_runs: 25,
      }),
      supabase.rpc('activation_demographic_feed_worker_escalation_page_history', {
        requested_lookback_hours: 336,
        max_pages: 120,
      }),
      supabase.rpc('activation_demographic_feed_worker_escalation_page_board', {
        requested_batch_id: null,
        max_pages: GOVERNANCE_PUBLIC_AUDIT_EXTERNAL_EXECUTION_PAGE_BOARD_MAX_PAGES,
      }),
      supabase.rpc('activation_demographic_feed_worker_escalation_policy_summary', {
        requested_policy_key: 'default',
      }),
      supabase.rpc('act_feed_worker_esc_pol_evt_hist', {
        requested_policy_key: 'default',
        requested_lookback_hours: 336,
        max_events: 60,
      }),
    ]);

    const sharedError = adapterResponse.error || ingestionResponse.error || permissionResponse.error;
    if (isMissingActivationDemographicFeedBackend(sharedError)) {
      setFeedBackendUnavailable(true);
      setFeedIngestionsHasMore(false);
      setLoadingFeedData(false);
      return;
    }

    if (sharedError) {
      console.error('Failed to load activation demographic feed data:', {
        adapterError: adapterResponse.error,
        ingestionError: ingestionResponse.error,
        permissionError: permissionResponse.error,
      });
      toast.error('Could not load signed demographic feed data.');
      setFeedIngestionsHasMore(false);
      setLoadingFeedData(false);
      return;
    }

    const adapters = adapterResponse.data ?? [];
    const ingestions = ingestionResponse.data ?? [];
    setFeedAdapters(adapters);
    setFeedIngestions(ingestions);
    setFeedIngestionsHasMore(ingestions.length === FEED_INGESTIONS_FIRST_PAGE);
    setCanManageFeeds(Boolean(permissionResponse.data));
    setFeedBackendUnavailable(false);

    if (workerSummaryResponse?.error) {
      if (isMissingActivationDemographicFeedWorkerBackend(workerSummaryResponse.error)) {
        setFeedWorkerBackendUnavailable(true);
      } else {
        console.error('Failed to load activation feed worker alerts summary:', workerSummaryResponse.error);
      }
      setFeedWorkerAlerts(buildFallbackWorkerAlertRows(adapters));
    } else {
      const workerRows = workerSummaryResponse.data ?? [];
      setFeedWorkerAlerts(workerRows);
      setFeedWorkerBackendUnavailable(false);
    }

    if (pendingOutboxResponse.error) {
      if (isMissingActivationDemographicFeedWorkerBackend(pendingOutboxResponse.error)) {
        setFeedWorkerBackendUnavailable(true);
      }
      setPendingFeedOutboxCount(0);
    } else {
      setPendingFeedOutboxCount(pendingOutboxResponse.count ?? 0);
    }

    if (claimedOutboxResponse.error) {
      if (isMissingActivationDemographicFeedWorkerBackend(claimedOutboxResponse.error)) {
        setFeedWorkerBackendUnavailable(true);
      }
      setClaimedFeedOutboxCount(0);
    } else {
      setClaimedFeedOutboxCount(claimedOutboxResponse.count ?? 0);
    }

    if (closedOutboxResponse.error) {
      if (isMissingActivationDemographicFeedWorkerBackend(closedOutboxResponse.error)) {
        setFeedWorkerBackendUnavailable(true);
      }
      setClosedFeedOutboxCount(0);
    } else {
      setClosedFeedOutboxCount(closedOutboxResponse.count ?? 0);
    }

    if (activeOutboxJobsResponse.error) {
      if (isMissingActivationDemographicFeedWorkerBackend(activeOutboxJobsResponse.error)) {
        setFeedWorkerBackendUnavailable(true);
      }
      setFeedWorkerOutboxActiveJobs([]);
      setFeedWorkerOutboxActiveJobsHasMore(false);
    } else {
      const activeRows = activeOutboxJobsResponse.data ?? [];
      setFeedWorkerOutboxActiveJobs(activeRows);
      setFeedWorkerOutboxActiveJobsHasMore(activeRows.length === FEED_WORKER_OUTBOX_ACTIVE_FIRST_PAGE);
    }

    if (recentClosedOutboxJobsResponse.error) {
      if (isMissingActivationDemographicFeedWorkerBackend(recentClosedOutboxJobsResponse.error)) {
        setFeedWorkerBackendUnavailable(true);
      }
      setFeedWorkerOutboxRecentClosedJobs([]);
      setFeedWorkerOutboxRecentClosedJobsHasMore(false);
    } else {
      const closedRows = recentClosedOutboxJobsResponse.data ?? [];
      setFeedWorkerOutboxRecentClosedJobs(closedRows);
      setFeedWorkerOutboxRecentClosedJobsHasMore(closedRows.length === FEED_WORKER_OUTBOX_CLOSED_FIRST_PAGE);
    }

    if (workerRunsResponse.error) {
      if (isMissingActivationDemographicFeedWorkerBackend(workerRunsResponse.error)) {
        setFeedWorkerBackendUnavailable(true);
      }
      setFeedWorkerRecentRuns([]);
      setFeedWorkerRunsHasMore(false);
    } else {
      const runs = workerRunsResponse.data ?? [];
      setFeedWorkerRecentRuns(runs);
      setFeedWorkerRunsHasMore(runs.length === FEED_WORKER_RUNS_FIRST_PAGE);
    }

    if (schedulePolicyResponse.error) {
      if (isMissingActivationDemographicFeedWorkerBackend(schedulePolicyResponse.error)) {
        setFeedWorkerBackendUnavailable(true);
      }
      setFeedWorkerSchedulePolicy(null);
    } else {
      setFeedWorkerSchedulePolicy(
        schedulePolicyResponse.data ?? null,
      );
    }

    if (scheduleAutomationStatusResponse?.error) {
      const statusError = scheduleAutomationStatusResponse.error;
      if (isMissingActivationDemographicFeedSchedulerStatusRpc(statusError)) {
        setFeedWorkerScheduleAutomationStatus(null);
      } else if (isMissingActivationDemographicFeedWorkerBackend(statusError)) {
        setFeedWorkerBackendUnavailable(true);
        setFeedWorkerScheduleAutomationStatus(null);
      } else {
        setFeedWorkerScheduleAutomationStatus(null);
      }
    } else {
      const statusRows = scheduleAutomationStatusResponse.data ?? [];
      setFeedWorkerScheduleAutomationStatus(statusRows[0] ?? null);
    }

    if (scheduleAutomationRunHistoryResponse?.error) {
      const rhError = scheduleAutomationRunHistoryResponse.error;
      if (isMissingActivationDemographicFeedScheduleRunHistoryRpc(rhError)) {
        setFeedWorkerScheduleAutomationRunHistory([]);
      } else if (isMissingActivationDemographicFeedWorkerBackend(rhError)) {
        setFeedWorkerBackendUnavailable(true);
        setFeedWorkerScheduleAutomationRunHistory([]);
      } else {
        console.warn('Could not load activation feed worker schedule automation run history; continuing without ledger rows:', rhError);
        setFeedWorkerScheduleAutomationRunHistory([]);
      }
    } else {
      setFeedWorkerScheduleAutomationRunHistory(scheduleAutomationRunHistoryResponse.data ?? []);
    }

    if (feedWorkerEscalationPageHistoryResponse?.error) {
      const ehError = feedWorkerEscalationPageHistoryResponse.error;
      if (isMissingActivationDemographicFeedWorkerEscalationPageHistoryRpc(ehError)) {
        setFeedWorkerEscalationPageHistory([]);
      } else if (isMissingActivationDemographicFeedWorkerBackend(ehError)) {
        setFeedWorkerBackendUnavailable(true);
        setFeedWorkerEscalationPageHistory([]);
      } else {
        console.warn('Could not load activation feed worker escalation page history; continuing without analytics:', ehError);
        setFeedWorkerEscalationPageHistory([]);
      }
    } else {
      setFeedWorkerEscalationPageHistory(
        readGovernancePublicAuditVerifierFederationExchangeReceiptEscalationHistoryRows(
          feedWorkerEscalationPageHistoryResponse.data,
        ),
      );
    }

    if (feedWorkerEscalationPageBoardResponse?.error) {
      const boardError = feedWorkerEscalationPageBoardResponse.error;
      if (isMissingActivationDemographicFeedWorkerEscalationPageBoardRpc(boardError)) {
        setFeedWorkerEscalationBoardPages([]);
      } else if (isMissingActivationDemographicFeedWorkerBackend(boardError)) {
        setFeedWorkerBackendUnavailable(true);
        setFeedWorkerEscalationBoardPages([]);
      } else {
        console.warn('Could not load activation feed worker escalation page board; continuing without open pages:', boardError);
        setFeedWorkerEscalationBoardPages([]);
      }
    } else {
      setFeedWorkerEscalationBoardPages(
        readGovernancePublicAuditExternalExecutionPageBoardRows(feedWorkerEscalationPageBoardResponse.data),
      );
    }

    if (feedWorkerEscalationPolicySummaryResponse?.error) {
      const polError = feedWorkerEscalationPolicySummaryResponse.error;
      if (isMissingActivationDemographicFeedWorkerEscalationPolicySummaryRpc(polError)) {
        setFeedWorkerEscalationPolicySummary(null);
      } else if (isMissingActivationDemographicFeedWorkerBackend(polError)) {
        setFeedWorkerBackendUnavailable(true);
        setFeedWorkerEscalationPolicySummary(null);
      } else {
        console.warn('Could not load activation feed worker escalation policy summary; continuing without policy row:', polError);
        setFeedWorkerEscalationPolicySummary(null);
      }
    } else {
      setFeedWorkerEscalationPolicySummary(
        readActivationFeedWorkerEscalationPolicySummary(feedWorkerEscalationPolicySummaryResponse.data),
      );
    }

    if (feedWorkerEscalationPolicyEventHistoryResponse?.error) {
      const evtError = feedWorkerEscalationPolicyEventHistoryResponse.error;
      if (isMissingActivationDemographicFeedWorkerEscalationPolicyEventHistoryRpc(evtError)) {
        setFeedWorkerEscalationPolicyEventRows([]);
      } else if (isMissingActivationDemographicFeedWorkerBackend(evtError)) {
        setFeedWorkerBackendUnavailable(true);
        setFeedWorkerEscalationPolicyEventRows([]);
      } else {
        console.warn('Could not load activation feed worker escalation policy event history; continuing without audit trail:', evtError);
        setFeedWorkerEscalationPolicyEventRows([]);
      }
    } else {
      setFeedWorkerEscalationPolicyEventRows(
        readActivationFeedWorkerEscalationPolicyEventRows(feedWorkerEscalationPolicyEventHistoryResponse.data),
      );
    }

    setLoadingFeedData(false);
    } catch (caught: unknown) {
      console.error('Unexpected error loading activation demographic feed data:', caught);
      toast.error('Could not refresh signed demographic feed data.');
      setLoadingFeedData(false);
    } finally {
      loadFeedDataInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    void loadFeedData();
  }, [loadFeedData]);

  useEffect(() => {
    if (feedBackendUnavailable) {
      return;
    }
    const autoReloadIsThrottled = (now: number) =>
      isFeedDataAutoReloadThrottled(now, lastFeedDataAutoReloadAtRef.current, ACTIVATION_FEED_DATA_AUTO_RELOAD_MIN_MS);

    const onVisibilityChange = () => {
      if (typeof document === 'undefined' || document.visibilityState !== 'visible') {
        return;
      }
      if (autoReloadIsThrottled(Date.now())) {
        return;
      }
      void loadFeedData();
    };
    const onOnline = () => {
      if (autoReloadIsThrottled(Date.now())) {
        return;
      }
      void loadFeedData();
    };
    const onPageShow = (event: Event) => {
      const pageEvent = event as PageTransitionEvent;
      if (!pageEvent.persisted) {
        return;
      }
      if (autoReloadIsThrottled(Date.now())) {
        return;
      }
      void loadFeedData();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('online', onOnline);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [feedBackendUnavailable, loadFeedData]);

  const loadMoreFeedIngestions = useCallback(async () => {
    if (feedBackendUnavailable || loadingMoreFeedIngestions || !feedIngestionsHasMore) {
      return;
    }

    setLoadingMoreFeedIngestions(true);
    const offset = feedIngestions.length;

    const { data, error } = await supabase
      .from('activation_demographic_feed_ingestions')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + FEED_INGESTIONS_APPEND_PAGE - 1);

    if (error) {
      console.error('Failed to load older activation feed ingestions:', error);
      if (isMissingActivationDemographicFeedBackend(error)) {
        setFeedBackendUnavailable(true);
      } else {
        toast.error('Could not load older signed feed ingestions.');
      }
      setLoadingMoreFeedIngestions(false);
      return;
    }

    const rows = (data as ActivationDemographicFeedIngestionRow[]) || [];
    setFeedIngestions((previous) => appendUniqueById(previous, rows));
    setFeedIngestionsHasMore(rows.length === FEED_INGESTIONS_APPEND_PAGE);
    setLoadingMoreFeedIngestions(false);
  }, [feedBackendUnavailable, feedIngestions.length, feedIngestionsHasMore, loadingMoreFeedIngestions]);

  const loadMoreFeedWorkerRuns = useCallback(async () => {
    if (feedWorkerBackendUnavailable || loadingMoreFeedWorkerRuns || !feedWorkerRunsHasMore) {
      return;
    }

    setLoadingMoreFeedWorkerRuns(true);
    const offset = feedWorkerRecentRuns.length;

    const { data, error } = await supabase
      .from('activation_demographic_feed_worker_runs')
      .select('*')
      .order('observed_at', { ascending: false })
      .range(offset, offset + FEED_WORKER_RUNS_APPEND_PAGE - 1);

    if (error) {
      console.error('Failed to load older activation feed worker runs:', error);
      if (isMissingActivationDemographicFeedWorkerBackend(error)) {
        setFeedWorkerBackendUnavailable(true);
      } else {
        toast.error('Could not load older worker runs.');
      }
      setLoadingMoreFeedWorkerRuns(false);
      return;
    }

    const rows = (data as ActivationDemographicFeedWorkerRunRow[]) || [];
    setFeedWorkerRecentRuns((previous) => appendUniqueById(previous, rows));
    setFeedWorkerRunsHasMore(rows.length === FEED_WORKER_RUNS_APPEND_PAGE);
    setLoadingMoreFeedWorkerRuns(false);
  }, [
    feedWorkerBackendUnavailable,
    feedWorkerRecentRuns.length,
    feedWorkerRunsHasMore,
    loadingMoreFeedWorkerRuns,
  ]);

  const loadMoreFeedWorkerOutboxActiveJobs = useCallback(async () => {
    if (
      feedWorkerBackendUnavailable
      || loadingMoreFeedWorkerOutboxActiveJobs
      || !feedWorkerOutboxActiveJobsHasMore
    ) {
      return;
    }

    setLoadingMoreFeedWorkerOutboxActiveJobs(true);
    const offset = feedWorkerOutboxActiveJobs.length;

    const { data, error } = await supabase
      .from('activation_demographic_feed_worker_outbox')
      .select('*')
      .in('status', ['pending', 'claimed'])
      .order('updated_at', { ascending: false })
      .range(offset, offset + FEED_WORKER_OUTBOX_ACTIVE_APPEND_PAGE - 1);

    if (error) {
      console.error('Failed to load older activation feed worker outbox active jobs:', error);
      if (isMissingActivationDemographicFeedWorkerBackend(error)) {
        setFeedWorkerBackendUnavailable(true);
      } else {
        toast.error('Could not load older queued sweep jobs.');
      }
      setLoadingMoreFeedWorkerOutboxActiveJobs(false);
      return;
    }

    const rows = (data as ActivationDemographicFeedWorkerOutboxRow[]) || [];
    setFeedWorkerOutboxActiveJobs((previous) => appendUniqueById(previous, rows));
    setFeedWorkerOutboxActiveJobsHasMore(rows.length === FEED_WORKER_OUTBOX_ACTIVE_APPEND_PAGE);
    setLoadingMoreFeedWorkerOutboxActiveJobs(false);
  }, [
    feedWorkerBackendUnavailable,
    feedWorkerOutboxActiveJobs.length,
    feedWorkerOutboxActiveJobsHasMore,
    loadingMoreFeedWorkerOutboxActiveJobs,
  ]);

  const loadMoreFeedWorkerOutboxRecentClosedJobs = useCallback(async () => {
    if (
      feedWorkerBackendUnavailable
      || loadingMoreFeedWorkerOutboxRecentClosedJobs
      || !feedWorkerOutboxRecentClosedJobsHasMore
    ) {
      return;
    }

    setLoadingMoreFeedWorkerOutboxRecentClosedJobs(true);
    const offset = feedWorkerOutboxRecentClosedJobs.length;

    const { data, error } = await supabase
      .from('activation_demographic_feed_worker_outbox')
      .select('*')
      .in('status', ['completed', 'cancelled', 'failed'])
      .order('updated_at', { ascending: false })
      .range(offset, offset + FEED_WORKER_OUTBOX_CLOSED_APPEND_PAGE - 1);

    if (error) {
      console.error('Failed to load older activation feed worker outbox closed jobs:', error);
      if (isMissingActivationDemographicFeedWorkerBackend(error)) {
        setFeedWorkerBackendUnavailable(true);
      } else {
        toast.error('Could not load older closed sweep jobs.');
      }
      setLoadingMoreFeedWorkerOutboxRecentClosedJobs(false);
      return;
    }

    const rows = (data as ActivationDemographicFeedWorkerOutboxRow[]) || [];
    setFeedWorkerOutboxRecentClosedJobs((previous) => appendUniqueById(previous, rows));
    setFeedWorkerOutboxRecentClosedJobsHasMore(rows.length === FEED_WORKER_OUTBOX_CLOSED_APPEND_PAGE);
    setLoadingMoreFeedWorkerOutboxRecentClosedJobs(false);
  }, [
    feedWorkerBackendUnavailable,
    feedWorkerOutboxRecentClosedJobs.length,
    feedWorkerOutboxRecentClosedJobsHasMore,
    loadingMoreFeedWorkerOutboxRecentClosedJobs,
  ]);

  const fetchFeedAdapterById = useCallback(async (adapterId: string) => {
    const { data, error } = await supabase
      .from('activation_demographic_feed_adapters')
      .select('*')
      .eq('id', adapterId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data as ActivationDemographicFeedAdapterRow;
  }, []);

  const registerFeedAdapter = useCallback(async (draft: {
    adapterKey: string;
    adapterName: string;
    scopeType: 'world' | 'country';
    countryCode: string;
    endpointUrl: string;
    publicSignerKey: string;
    keyAlgorithm: string;
  }) => {
    if (!canManageFeeds || feedBackendUnavailable) return;

    const normalizedKey = draft.adapterKey.trim();
    const normalizedName = draft.adapterName.trim();
    const normalizedSignerKey = draft.publicSignerKey.trim();

    if (!normalizedKey || !normalizedName || !normalizedSignerKey) {
      toast.error('Adapter key, name, and signer key are required.');
      return;
    }

    if (draft.scopeType === 'country' && !draft.countryCode.trim()) {
      toast.error('Country code is required for country-scoped adapters.');
      return;
    }

    setRegisteringFeedAdapter(true);

    const { error } = await supabase.rpc('register_activation_demographic_feed_adapter', {
      adapter_key: normalizedKey,
      adapter_name: normalizedName,
      adapter_type: 'signed_json_feed',
      scope_type: draft.scopeType,
      country_code: draft.scopeType === 'world' ? '' : draft.countryCode.trim().toUpperCase(),
      endpoint_url: draft.endpointUrl.trim() || null,
      public_signer_key: normalizedSignerKey,
      key_algorithm: draft.keyAlgorithm.trim() || 'ECDSA_P256_SHA256_V1',
      metadata: {
        source: 'governance_activation_feed_panel',
      },
    });

    if (error) {
      console.error('Failed to register activation demographic feed adapter:', error);
      toast.error('Could not register feed adapter.');
      setRegisteringFeedAdapter(false);
      return;
    }

    toast.success('Signed demographic feed adapter saved.');
    setRegisteringFeedAdapter(false);
    await loadFeedData();
  }, [canManageFeeds, feedBackendUnavailable, loadFeedData]);

  const ingestSignedFeedSnapshot = useCallback(async (draft: {
    adapterId: string;
    targetPopulation: string;
    observedAt: string;
    sourceUrl: string;
    signedPayload: string;
    payloadSignature: string;
    ingestionNotes: string;
  }) => {
    if (!canManageFeeds || feedBackendUnavailable) return;

    const adapter = feedAdapters.find((candidate) => candidate.id === draft.adapterId);
    if (!adapter) {
      toast.error('Select a signed feed adapter first.');
      return;
    }

    const signedPayload = draft.signedPayload.trim();
    const payloadSignature = draft.payloadSignature.trim();
    if (!signedPayload || !payloadSignature) {
      toast.error('Signed payload and signature are required.');
      return;
    }

    const parsedPopulation = Number.parseInt(draft.targetPopulation, 10);
    if (!Number.isFinite(parsedPopulation) || parsedPopulation <= 0) {
      toast.error('Signed payload fields are incomplete.');
      return;
    }

    setIngestingSignedFeedSnapshot(true);

    let payloadHash: string;
    try {
      const verified = await verifyActivationDemographicPayloadSignature({
        keyAlgorithm: adapter.key_algorithm,
        signerPublicKey: adapter.public_signer_key,
        signedPayload,
        signature: payloadSignature,
      });
      if (!verified) {
        toast.error('Signed payload verification failed for this adapter signer key.');
        setIngestingSignedFeedSnapshot(false);
        return;
      }
      payloadHash = await hashActivationDemographicPayload(signedPayload);
    } catch (verificationError) {
      console.error('Failed to verify signed demographic payload:', verificationError);
      toast.error('Could not verify signed payload.');
      setIngestingSignedFeedSnapshot(false);
      return;
    }

    const { error } = await supabase.rpc('ingest_signed_activation_demographic_feed_snapshot', {
      target_adapter_id: adapter.id,
      requested_target_population: parsedPopulation,
      requested_source_url: draft.sourceUrl.trim() || null,
      requested_observed_at: draft.observedAt ? new Date(draft.observedAt).toISOString() : new Date().toISOString(),
      signed_payload: signedPayload,
      payload_hash: payloadHash,
      payload_signature: payloadSignature,
      signature_verified: true,
      ingestion_notes: draft.ingestionNotes.trim() || null,
      ingestion_metadata: {
        source: 'governance_activation_feed_panel',
      },
    });

    if (error) {
      console.error('Failed to ingest signed activation demographic feed snapshot:', error);
      toast.error('Could not ingest signed feed snapshot.');
      setIngestingSignedFeedSnapshot(false);
      return;
    }

    toast.success('Signed readiness evidence snapshot ingested and program readiness refreshed.');
    setIngestingSignedFeedSnapshot(false);
    await loadFeedData();
  }, [canManageFeeds, feedAdapters, feedBackendUnavailable, loadFeedData]);

  const scheduleFeedWorkerJobs = useCallback(async (forceReschedule = false) => {
    if (!canManageFeeds || feedBackendUnavailable || feedWorkerBackendUnavailable) return;

    setSchedulingFeedWorkerJobs(true);
    const { data, error } = await supabase.rpc('schedule_activation_demographic_feed_worker_jobs', {
      force_reschedule: forceReschedule,
    });

    if (error) {
      if (isMissingActivationDemographicFeedWorkerBackend(error)) {
        setFeedWorkerBackendUnavailable(true);
      } else {
        console.error('Failed to schedule activation demographic feed worker jobs:', error);
        toast.error('Could not queue scheduled feed worker sweeps.');
      }
      setSchedulingFeedWorkerJobs(false);
      return;
    }

    const count = typeof data === 'number' && Number.isFinite(data) ? Math.max(0, Math.floor(data)) : 0;
    if (forceReschedule) {
      toast.success(
        count > 0
          ? `Cleared the sweep queue and queued ${count} new job${count === 1 ? '' : 's'}.`
          : 'Cleared pending or in-progress sweep jobs. Nothing new was due for the cadence, so the queue may stay empty until the next interval.',
      );
    } else {
      toast.success(
        count > 0
          ? `Queued ${count} feed worker sweep job${count === 1 ? '' : 's'}.`
          : 'No additional feed worker sweeps are due for the configured cadence.',
      );
    }
    setSchedulingFeedWorkerJobs(false);
    await loadFeedData();
  }, [canManageFeeds, feedBackendUnavailable, feedWorkerBackendUnavailable, loadFeedData]);

  const releaseStaleFeedWorkerClaims = useCallback(async () => {
    if (!canManageFeeds || feedBackendUnavailable || feedWorkerBackendUnavailable) {
      return;
    }

    setReleasingStaleFeedWorkerClaims(true);
    const { data, error } = await supabase.rpc('release_stale_activation_demographic_feed_worker_claims');

    if (error) {
      if (isMissingActivationDemographicFeedWorkerBackend(error)) {
        setFeedWorkerBackendUnavailable(true);
      } else {
        console.error('Failed to release stale activation feed worker claims:', error);
        toast.error('Could not release stuck sweep queue claims.');
      }
      setReleasingStaleFeedWorkerClaims(false);
      return;
    }

    const released = typeof data === 'number' && Number.isFinite(data) ? Math.max(0, Math.floor(data)) : 0;
    toast.success(
      released > 0
        ? `Released ${released} stuck sweep queue claim${released === 1 ? '' : 's'}.`
        : 'No stuck claims were found on the sweep queue.',
    );
    setReleasingStaleFeedWorkerClaims(false);
    await loadFeedData();
  }, [canManageFeeds, feedBackendUnavailable, feedWorkerBackendUnavailable, loadFeedData]);

  const processFeedWorkerOutboxQueue = useCallback(async () => {
    if (!canManageFeeds || feedBackendUnavailable || feedWorkerBackendUnavailable) return;

    setProcessingFeedOutbox(true);

    const authResponse = await supabase.auth.getUser();
    const userId = authResponse.data.user?.id;
    const workerIdentity = userId
      ? `governance_activation_feed_ui:${userId}`
      : `governance_activation_feed_ui:${typeof globalThis.crypto?.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : String(Date.now())}`;

    const { data: claimedRows, error: claimError } = await supabase.rpc('claim_activation_demographic_feed_worker_jobs', {
      worker_identity: workerIdentity,
      job_limit: 8,
    });

    if (claimError) {
      if (isMissingActivationDemographicFeedWorkerBackend(claimError)) {
        setFeedWorkerBackendUnavailable(true);
      } else {
        console.error('Failed to claim feed worker outbox jobs:', claimError);
        toast.error('Could not claim queued feed worker jobs.');
      }
      setProcessingFeedOutbox(false);
      return;
    }

    const rows = Array.isArray(claimedRows) ? claimedRows : [];
    if (rows.length === 0) {
      toast.message('No pending feed worker jobs in the queue.');
      setProcessingFeedOutbox(false);
      await loadFeedData();
      return;
    }

    for (const row of rows) {
      let adapterRow = feedAdapters.find((adapter) => adapter.id === row.adapter_id) ?? null;
      if (!adapterRow) {
        adapterRow = await fetchFeedAdapterById(row.adapter_id);
      }

      if (!adapterRow) {
        await supabase.rpc('complete_activation_demographic_feed_worker_outbox', {
          target_outbox_id: row.outbox_job_id,
          completed_ok: false,
          resolution_message: 'Adapter row not found while processing outbox job.',
        });
        continue;
      }

      let completedOk = false;
      let resolutionMessage: string | null = null;

      try {
        if (!adapterRow.endpoint_url?.trim()) {
          resolutionMessage = 'Adapter is missing an endpoint URL.';
        } else {
          const stats = await runActivationDemographicFeedWorkerSweep({
            adapters: [adapterRow],
            recordFeedWorkerRun,
          });
          const failures =
            stats.signatureFailures + stats.fetchFailures + stats.invalidPayloads + stats.ingestionFailures;
          completedOk = failures === 0;
          if (!completedOk) {
            resolutionMessage = 'Worker sweep finished with ingestion, signature, or connectivity failures.';
          }
        }
      } catch (caught) {
        completedOk = false;
        resolutionMessage = caught instanceof Error ? caught.message : String(caught);
      }

      const { error: completeError } = await supabase.rpc('complete_activation_demographic_feed_worker_outbox', {
        target_outbox_id: row.outbox_job_id,
        completed_ok: completedOk,
        resolution_message: resolutionMessage,
      });

      if (completeError) {
        console.error('Failed to complete feed worker outbox job:', completeError);
      }
    }

    toast.success(`Processed ${rows.length} queued feed worker job${rows.length === 1 ? '' : 's'}.`);
    setProcessingFeedOutbox(false);
    await loadFeedData();
  }, [
    canManageFeeds,
    feedBackendUnavailable,
    feedWorkerBackendUnavailable,
    feedAdapters,
    recordFeedWorkerRun,
    fetchFeedAdapterById,
    loadFeedData,
  ]);

  const runFeedWorkerSweep = useCallback(async () => {
    if (!canManageFeeds || feedBackendUnavailable || feedWorkerBackendUnavailable || runningFeedWorkers) return;

    const activeAdaptersWithEndpoints = feedAdapters.filter((adapter) =>
      adapter.is_active && Boolean(adapter.endpoint_url?.trim()));

    if (activeAdaptersWithEndpoints.length === 0) {
      toast.error('At least one active adapter endpoint is required for worker sweep.');
      return;
    }

    setRunningFeedWorkers(true);
    const stats = await runActivationDemographicFeedWorkerSweep({
      adapters: activeAdaptersWithEndpoints,
      recordFeedWorkerRun,
    });
    setRunningFeedWorkers(false);

    await loadFeedData();

    if (stats.signatureFailures || stats.fetchFailures || stats.invalidPayloads || stats.ingestionFailures) {
      toast.warning(
        `Feed worker sweep completed with alerts (${stats.ingested} ingested, ${stats.signatureFailures} signature failures, ${stats.fetchFailures} fetch failures, ${stats.invalidPayloads} payload failures, ${stats.ingestionFailures} ingestion failures).`,
      );
      return;
    }

    toast.success(`Feed worker sweep completed: ${stats.ingested} signed snapshots ingested.`);
  }, [canManageFeeds, feedAdapters, feedBackendUnavailable, feedWorkerBackendUnavailable, loadFeedData, recordFeedWorkerRun, runningFeedWorkers]);

  const escalateFeedWorkerAlertsToPublicExecution = useCallback(async () => {
    if (!canManageFeeds || feedBackendUnavailable || feedWorkerBackendUnavailable) return;

    setEscalatingFeedWorkerPublicExecution(true);

    const { error } = await supabase.rpc('maybe_escalate_activation_feed_worker_exec_page', {
      target_batch_id: null,
      requested_freshness_hours: null,
      escalation_context: {
        source: 'governance_activation_feed_adapters_panel',
        force_manual_escalation: true,
      },
    });

    if (error) {
      if (isMissingActivationDemographicFeedWorkerBackend(error)) {
        setFeedWorkerBackendUnavailable(true);
      } else {
        console.error('Failed to escalate activation demographic feed worker alerts:', error);
        toast.error('Could not update the public audit on-call page for feed worker alerts.');
      }
      setEscalatingFeedWorkerPublicExecution(false);
      return;
    }

    toast.success('Public audit on-call page evaluated for activation feed worker alerts.');
    setEscalatingFeedWorkerPublicExecution(false);
    await loadFeedData();
  }, [canManageFeeds, feedBackendUnavailable, feedWorkerBackendUnavailable, loadFeedData]);

  const saveFeedWorkerEscalationPolicy = useCallback(async (draft: SaveActivationFeedWorkerEscalationPolicyDraft) => {
    if (!canManageFeeds || feedBackendUnavailable || feedWorkerBackendUnavailable) return;

    setSavingFeedWorkerEscalationPolicy(true);
    const { error } = await supabase.rpc('set_activation_demographic_feed_worker_escalation_policy', {
      requested_policy_key: 'default',
      requested_policy_name: draft.policyName.trim() || 'Default activation feed worker escalation policy',
      requested_escalation_enabled: draft.escalationEnabled,
      requested_freshness_hours: draft.freshnessHours,
      requested_minimum_adapter_issues_for_escalation: draft.minimumAdapterIssuesForEscalation,
      requested_escalation_severity: draft.escalationSeverity,
      metadata: {
        source: 'governance_activation_feed_adapters_panel',
      },
    });

    if (error) {
      if (isMissingActivationDemographicFeedWorkerEscalationPolicySetRpc(error)) {
        toast.error('Escalation policy updates are not available on this database revision yet.');
      } else if (isMissingActivationDemographicFeedWorkerBackend(error)) {
        setFeedWorkerBackendUnavailable(true);
      } else {
        console.error('Failed to save activation feed worker escalation policy:', error);
        toast.error('Could not save escalation policy.');
      }
      setSavingFeedWorkerEscalationPolicy(false);
      return;
    }

    toast.success('Escalation policy saved.');
    setSavingFeedWorkerEscalationPolicy(false);
    await loadFeedData();
  }, [canManageFeeds, feedBackendUnavailable, feedWorkerBackendUnavailable, loadFeedData]);

  const acknowledgeFeedWorkerEscalationPage = useCallback(async (pageId: string) => {
    if (!canManageFeeds || feedBackendUnavailable || feedWorkerBackendUnavailable || !pageId) return;
    setAcknowledgingFeedWorkerEscalationPageId(pageId);
    const notes = typeof window !== 'undefined'
      ? window.prompt('Optional acknowledgement notes for this feed worker escalation page:', '')
      : '';
    const { error } = await supabase.rpc('acknowledge_activation_demographic_feed_worker_escalation_page', {
      target_page_id: pageId,
      acknowledgement_notes: notes?.trim() || null,
    });
    if (error) {
      if (isMissingActivationDemographicFeedWorkerEscalationAcknowledgePageRpc(error)) {
        toast.error('Acknowledge action is not available on this database revision yet.');
      } else if (isMissingActivationDemographicFeedWorkerBackend(error)) {
        setFeedWorkerBackendUnavailable(true);
      } else {
        console.error('Failed to acknowledge activation feed worker escalation page:', error);
        toast.error('Could not acknowledge feed worker escalation page.');
      }
      setAcknowledgingFeedWorkerEscalationPageId(null);
      return;
    }
    toast.success('Feed worker escalation page acknowledged.');
    setAcknowledgingFeedWorkerEscalationPageId(null);
    await loadFeedData();
  }, [canManageFeeds, feedBackendUnavailable, feedWorkerBackendUnavailable, loadFeedData]);

  const resolveFeedWorkerEscalationPage = useCallback(async (pageId: string) => {
    if (!canManageFeeds || feedBackendUnavailable || feedWorkerBackendUnavailable || !pageId) return;
    setResolvingFeedWorkerEscalationPageId(pageId);
    const notes = typeof window !== 'undefined'
      ? window.prompt('Optional resolution notes for this feed worker escalation page:', '')
      : '';
    const { error } = await supabase.rpc('resolve_activation_demographic_feed_worker_escalation_page', {
      target_page_id: pageId,
      resolution_notes: notes?.trim() || null,
    });
    if (error) {
      if (isMissingActivationDemographicFeedWorkerEscalationResolvePageRpc(error)) {
        toast.error('Resolve action is not available on this database revision yet.');
      } else if (isMissingActivationDemographicFeedWorkerBackend(error)) {
        setFeedWorkerBackendUnavailable(true);
      } else {
        console.error('Failed to resolve activation feed worker escalation page:', error);
        toast.error('Could not resolve feed worker escalation page.');
      }
      setResolvingFeedWorkerEscalationPageId(null);
      return;
    }
    toast.success('Feed worker escalation page resolved.');
    setResolvingFeedWorkerEscalationPageId(null);
    await loadFeedData();
  }, [canManageFeeds, feedBackendUnavailable, feedWorkerBackendUnavailable, loadFeedData]);

  const resolveFeedAlert = useCallback(async (adapterId: string, alertType: ActivationDemographicFeedAlertType | null = null) => {
    if (!canManageFeeds || feedBackendUnavailable || feedWorkerBackendUnavailable) return;

    const resolveKey = `${adapterId}:${alertType ?? 'all'}`;
    setResolvingFeedAlertKey(resolveKey);

    const { error } = await supabase.rpc('resolve_activation_demographic_feed_worker_alerts', {
      target_adapter_id: adapterId,
      target_alert_type: alertType,
    });

    if (error) {
      console.error('Failed to resolve activation demographic feed alert:', {
        adapterId,
        alertType,
        error,
      });
      toast.error('Could not resolve feed worker alert.');
      setResolvingFeedAlertKey(null);
      return;
    }

    toast.success('Feed worker alert resolved.');
    setResolvingFeedAlertKey(null);
    await loadFeedData();
  }, [canManageFeeds, feedBackendUnavailable, feedWorkerBackendUnavailable, loadFeedData]);

  return {
    loadingFeedData,
    feedBackendUnavailable,
    feedWorkerBackendUnavailable,
    canManageFeeds,
    registeringFeedAdapter,
    ingestingSignedFeedSnapshot,
    runningFeedWorkers,
    schedulingFeedWorkerJobs,
    processingFeedOutbox,
    releasingStaleFeedWorkerClaims,
    escalatingFeedWorkerPublicExecution,
    pendingFeedOutboxCount,
    claimedFeedOutboxCount,
    closedFeedOutboxCount,
    resolvingFeedAlertKey,
    openFeedWorkerAlertsCount,
    feedAdapters,
    feedIngestions,
    feedIngestionsHasMore,
    loadingMoreFeedIngestions,
    feedWorkerAlerts,
    feedWorkerOutboxActiveJobs,
    feedWorkerOutboxRecentClosedJobs,
    feedWorkerOutboxActiveJobsHasMore,
    feedWorkerOutboxRecentClosedJobsHasMore,
    loadingMoreFeedWorkerOutboxActiveJobs,
    loadingMoreFeedWorkerOutboxRecentClosedJobs,
    feedWorkerRecentRuns,
    feedWorkerRunsHasMore,
    loadingMoreFeedWorkerRuns,
    feedWorkerSchedulePolicy,
    feedWorkerScheduleAutomationStatus,
    feedWorkerScheduleAutomationRunHistory,
    feedWorkerEscalationPageHistory,
    feedWorkerEscalationBoardPages,
    feedWorkerEscalationOpenOrAckPageCount,
    feedWorkerEscalationPolicySummary,
    feedWorkerEscalationPolicyEventRows,
    savingFeedWorkerEscalationPolicy,
    acknowledgingFeedWorkerEscalationPageId,
    resolvingFeedWorkerEscalationPageId,
    acknowledgeFeedWorkerEscalationPage,
    resolveFeedWorkerEscalationPage,
    loadFeedData,
    loadMoreFeedIngestions,
    loadMoreFeedWorkerRuns,
    loadMoreFeedWorkerOutboxActiveJobs,
    loadMoreFeedWorkerOutboxRecentClosedJobs,
    registerFeedAdapter,
    ingestSignedFeedSnapshot,
    scheduleFeedWorkerJobs,
    processFeedWorkerOutboxQueue,
    releaseStaleFeedWorkerClaims,
    runFeedWorkerSweep,
    escalateFeedWorkerAlertsToPublicExecution,
    saveFeedWorkerEscalationPolicy,
    resolveFeedAlert,
  };
}
