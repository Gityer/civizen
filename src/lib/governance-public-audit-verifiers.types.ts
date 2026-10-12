import type { Database } from '@/integrations/supabase/types';
import {
  readGovernancePublicAuditClientVerifierBundleProductionData,
  type GovernancePublicAuditClientMirrorFailoverTarget,
  type GovernancePublicAuditVerifierMirrorFederationDiversitySummary,
  type GovernancePublicAuditVerifierMirrorDirectoryTrustSummary,
  type GovernancePublicAuditVerifierMirrorDirectorySummaryRow,
  type GovernancePublicAuditVerifierMirrorFailoverPolicySummary,
  type GovernancePublicAuditVerifierMirrorProbeJobBoardRow,
  type GovernancePublicAuditVerifierMirrorProbeJobStatus,
  type GovernancePublicAuditVerifierMirrorProbeJobSummary,
} from '@/lib/governance-public-audit-verifier-mirror-production';
import {
  readGovernancePublicAuditVerifierFederationExchangeAttestationRows,
  readGovernancePublicAuditVerifierFederationExchangeAttestationSummary,
  readGovernancePublicAuditVerifierFederationExchangeReceiptAutomationRunRows,
  readGovernancePublicAuditVerifierFederationExchangeReceiptEscalationHistoryRows,
  readGovernancePublicAuditVerifierFederationExchangeReceiptAutomationStatus,
  readGovernancePublicAuditVerifierFederationExchangeReceiptPolicyEventRows,
  readGovernancePublicAuditVerifierFederationExchangeReceiptPolicySummary,
  readGovernancePublicAuditVerifierFederationDistributionGateSnapshot,
  readGovernancePublicAuditVerifierFederationPackage,
  readGovernancePublicAuditVerifierFederationPackageDistributionSummary,
  readGovernancePublicAuditVerifierFederationPackageHistoryRows,
  readGovernancePublicAuditVerifierFederationPackageSignatureRows,
  readGovernancePublicAuditVerifierFederationRecentPackageRows,
  type GovernancePublicAuditVerifierFederationDistributionGateSnapshot,
  type GovernancePublicAuditVerifierFederationExchangeAttestationRow,
  type GovernancePublicAuditVerifierFederationExchangeAttestationSummary,
  type GovernancePublicAuditVerifierFederationExchangeReceiptAutomationRunRow,
  type GovernancePublicAuditVerifierFederationExchangeReceiptEscalationHistoryRow,
  type GovernancePublicAuditVerifierFederationExchangeReceiptAutomationStatus,
  type GovernancePublicAuditVerifierFederationExchangeReceiptPolicyEventRow,
  type GovernancePublicAuditVerifierFederationExchangeReceiptPolicySummary,
  type GovernancePublicAuditVerifierFederationPackage,
  type GovernancePublicAuditVerifierFederationPackageDistributionSummary,
  type GovernancePublicAuditVerifierFederationPackageHistoryRow,
  type GovernancePublicAuditVerifierFederationPackageSignatureRow,
  type GovernancePublicAuditVerifierFederationRecentPackageRow,
} from '@/lib/governance-public-audit-verifier-federation-distribution';
import {
  readGovernancePublicAuditVerifierMirrorFederationAlertBoardRows,
  readGovernancePublicAuditVerifierMirrorFederationOnboardingBoardRows,
  readGovernancePublicAuditVerifierMirrorFederationOperationsSummary,
  readGovernancePublicAuditVerifierMirrorFederationWorkerRunRows,
  readGovernancePublicAuditVerifierMirrorDiscoveredCandidateBoardRows,
  readGovernancePublicAuditVerifierMirrorDiscoverySourceBoardRows,
  readGovernancePublicAuditVerifierMirrorDiscoverySummary,
  readGovernancePublicAuditVerifierMirrorSignerGovernanceBoardRows,
  readGovernancePublicAuditVerifierMirrorSignerGovernanceSummary,
  readGovernancePublicAuditVerifierMirrorPolicyRatificationSummary,
  type GovernancePublicAuditVerifierMirrorFederationAlertBoardRow,
  type GovernancePublicAuditVerifierMirrorFederationOnboardingBoardRow,
  type GovernancePublicAuditVerifierMirrorFederationOperationsSummary,
  type GovernancePublicAuditVerifierMirrorFederationWorkerRunRow,
  type GovernancePublicAuditVerifierMirrorDiscoveredCandidateBoardRow,
  type GovernancePublicAuditVerifierMirrorDiscoverySourceBoardRow,
  type GovernancePublicAuditVerifierMirrorDiscoverySummary,
  type GovernancePublicAuditVerifierMirrorSignerGovernanceBoardRow,
  type GovernancePublicAuditVerifierMirrorSignerGovernanceSummary,
  type GovernancePublicAuditVerifierMirrorPolicyRatificationSummary,
} from '@/lib/governance-public-audit-verifier-federation';

/** Verifier, mirror and bundle shapes; the readers and labels live in governance-public-audit-verifiers.ts. */
export type GovernancePublicAuditVerifierNodeRow = Database['public']['Tables']['governance_public_audit_verifier_nodes']['Row'];

export type GovernancePublicAuditBatchVerificationRow = Database['public']['Tables']['governance_public_audit_batch_verifications']['Row'];

export type GovernancePublicAuditNetworkProofRow = Database['public']['Tables']['governance_public_audit_network_proofs']['Row'];

export type GovernancePublicAuditReplicationPolicyRow = Database['public']['Tables']['governance_public_audit_replication_policies']['Row'];

export interface GovernancePublicAuditVerifierMirrorHealthRow {
  mirrorId: string;
  mirrorKey: string;
  mirrorLabel: string | null;
  endpointUrl: string;
  mirrorType: string;
  regionCode: string;
  jurisdictionCountryCode: string;
  operatorLabel: string;
  isActive: boolean;
  lastCheckAt: string | null;
  lastCheckStatus: 'ok' | 'degraded' | 'failed' | 'unknown';
  lastCheckLatencyMs: number | null;
  lastObservedBatchId: string | null;
  lastObservedBatchHash: string | null;
  lastErrorMessage: string | null;
  isStale: boolean;
  healthStatus: 'healthy' | 'degraded' | 'critical' | 'unknown' | 'inactive';
}

export interface GovernancePublicAuditClientVerifierBundle {
  bundleVersion: string;
  bundleHash: string;
  bundlePayload: Record<string, unknown>;
  healthyMirrorCount: number;
  quorumMet: boolean;
  failoverPolicy: GovernancePublicAuditVerifierMirrorFailoverPolicySummary | null;
  failoverOrder: GovernancePublicAuditClientMirrorFailoverTarget[];
  signedDirectoryHash: string | null;
  signedDirectorySignature: string | null;
  signedDirectorySignerKey: string | null;
  signedDirectoryTrust: GovernancePublicAuditVerifierMirrorDirectoryTrustSummary | null;
  federationDiversity: GovernancePublicAuditVerifierMirrorFederationDiversitySummary | null;
  federationOperations: GovernancePublicAuditVerifierMirrorFederationOperationsSummary | null;
  federationDistribution: GovernancePublicAuditVerifierFederationPackageDistributionSummary | null;
  policyRatification: GovernancePublicAuditVerifierMirrorPolicyRatificationSummary | null;
}

export interface GovernancePublicAuditVerifierSummary {
  policyEnabled: boolean;
  requiredVerifiedCount: number;
  requiredNetworkProofCount: number;
  activeVerifierCount: number;
  verifiedCount: number;
  mismatchCount: number;
  unreachableCount: number;
  networkProofCount: number;
  meetsReplicationThreshold: boolean;
}
