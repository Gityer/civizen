import { getProtocolManager, ProtocolUpgradeProposal } from './protocol-versioning';
import { getDataSyncManager } from '../p2p/data-sync';

/**
 * Protocol Upgrade Executor
 * 
 * Safely executes protocol upgrades with rollback capabilities.
 * Implements timelock mechanism and gradual rollout.
 */

export interface ExecutionLog {
  proposalId: string;
  timestamp: number;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'rolled_back';
  error?: string;
  rollbackReason?: string;
}

export interface UpgradeCheckpoint {
  proposalId: string;
  version: string;
  timestamp: number;
  state: unknown;                   // Snapshot of app state before upgrade
}

/**
 * Protocol Executor
 */
export class ProtocolExecutor {
  private executionLogs: Map<string, ExecutionLog> = new Map();
  private checkpoints: Map<string, UpgradeCheckpoint> = new Map();
  private activeUpgrades: Set<string> = new Set();
  private rollbackHandlers: Map<string, () => Promise<void>> = new Map();

  /**
   * Check if an upgrade is ready to be executed
   */
  isUpgradeReady(proposalId: string): boolean {
    const protocolManager = getProtocolManager();
    const proposal = protocolManager.getProposal(proposalId);

    if (!proposal) {
      return false;
    }

    if (proposal.status !== 'approved') {
      return false;
    }

    if (Date.now() < proposal.activationTime!) {
      return false;
    }

    return true;
  }

  /**
   * Get time until upgrade can be executed
   */
  getTimeUntilExecution(proposalId: string): number {
    const protocolManager = getProtocolManager();
    const proposal = protocolManager.getProposal(proposalId);

    if (!proposal || !proposal.activationTime) {
      return 0;
    }

    const timeRemaining = proposal.activationTime - Date.now();
    return Math.max(0, timeRemaining);
  }

  /**
   * Create a checkpoint before executing upgrade
   */
  private createCheckpoint(proposalId: string, version: string, state: unknown): void {
    const checkpoint: UpgradeCheckpoint = {
      proposalId,
      version,
      timestamp: Date.now(),
      state,
    };

    this.checkpoints.set(proposalId, checkpoint);
  }

  /**
   * Execute an upgrade
   */
  async executeUpgrade(
    proposalId: string,
    currentState: unknown,
    onProgress?: (stage: string) => void
  ): Promise<void> {
    const protocolManager = getProtocolManager();
    const proposal = protocolManager.getProposal(proposalId);

    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found`);
    }

    if (!this.isUpgradeReady(proposalId)) {
      throw new Error(`Upgrade ${proposalId} is not ready to execute`);
    }

    // Create checkpoint
    onProgress?.('Creating checkpoint');
    this.createCheckpoint(proposalId, proposal.version.version, currentState);

    // Log execution start
    this.logExecution(proposalId, 'executing');

    try {
      // Stage 1: Validate upgrade
      onProgress?.('Validating upgrade');
      await this.validateUpgrade(proposal);

      // Stage 2: Apply feature flags
      onProgress?.('Applying feature flags');
      await this.applyFeatureFlags(proposal);

      // Stage 3: Execute hooks
      onProgress?.('Executing upgrade hooks');
      await this.executeUpgradeHooks(proposal);

      // Stage 4: Activate version
      onProgress?.('Activating new version');
      protocolManager.activateUpgrade(proposalId);

      // Mark as active
      this.activeUpgrades.add(proposalId);

      // Log execution success
      this.logExecution(proposalId, 'completed');

      // Sync to network
      const dataSync = getDataSyncManager();
      await dataSync.syncProposal(
        proposalId,
        proposal,
        proposal.proposer,
        new Uint8Array()  // Would be actual private key in real implementation
      );

      onProgress?.('Upgrade completed successfully');
    } catch (error) {
      // Log execution failure
      this.logExecution(
        proposalId,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );

      throw error;
    }
  }

  /**
   * Validate upgrade before execution
   */
  private async validateUpgrade(proposal: ProtocolUpgradeProposal): Promise<void> {
    // Validate version structure
    if (!proposal.version.version) {
      throw new Error('Invalid version: missing version string');
    }

    if (!proposal.version.contentHash) {
      throw new Error('Invalid version: missing content hash');
    }

    // Validate features
    for (const feature of proposal.version.features) {
      if (!feature.name) {
        throw new Error('Invalid feature: missing name');
      }

      // Check dependencies
      for (const dep of feature.dependencies) {
        const depFeature = proposal.version.features.find((f) => f.name === dep);
        if (!depFeature) {
          throw new Error(`Feature ${feature.name} depends on missing feature ${dep}`);
        }
      }
    }
  }

  /**
   * Apply feature flags from upgrade
   */
  private async applyFeatureFlags(proposal: ProtocolUpgradeProposal): Promise<void> {
    const protocolManager = getProtocolManager();

    for (const feature of proposal.version.features) {
      // Start with 0% rollout for new features
      if (feature.rolloutPercentage > 0) {
        protocolManager.updateFeatureRollout(
          feature.name,
          Math.min(feature.rolloutPercentage, 10)  // Start at 10%
        );
      }
    }
  }

  /**
   * Execute upgrade hooks
   */
  private async executeUpgradeHooks(proposal: ProtocolUpgradeProposal): Promise<void> {
    // In a real implementation, this would execute custom upgrade logic
    // For now, we'll just simulate the process
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * Gradually increase feature rollout
   */
  async increaseFeatureRollout(
    featureName: string,
    targetPercentage: number
  ): Promise<void> {
    const protocolManager = getProtocolManager();
    const feature = protocolManager.getFeature(featureName);

    if (!feature) {
      throw new Error(`Feature ${featureName} not found`);
    }

    if (targetPercentage < feature.rolloutPercentage) {
      throw new Error('Can only increase rollout percentage');
    }

    // Increase in 10% increments
    let currentPercentage = feature.rolloutPercentage;
    while (currentPercentage < targetPercentage) {
      currentPercentage = Math.min(currentPercentage + 10, targetPercentage);
      protocolManager.updateFeatureRollout(featureName, currentPercentage);

      // Wait before next increment
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  /**
   * Rollback an upgrade
   */
  async rollbackUpgrade(proposalId: string, reason: string): Promise<void> {
    const checkpoint = this.checkpoints.get(proposalId);
    if (!checkpoint) {
      throw new Error(`No checkpoint found for proposal ${proposalId}`);
    }

    try {
      // Execute rollback handler if registered
      const rollbackHandler = this.rollbackHandlers.get(proposalId);
      if (rollbackHandler) {
        await rollbackHandler();
      }

      // Restore previous version
      const protocolManager = getProtocolManager();
      const proposal = protocolManager.getProposal(proposalId);
      if (proposal && proposal.version.previousVersion) {
        const previousVersion = protocolManager.getVersion(
          proposal.version.previousVersion
        );
        if (previousVersion) {
          // Revert to previous version
          for (const feature of previousVersion.features) {
            protocolManager.updateFeatureRollout(feature.name, feature.rolloutPercentage);
          }
        }
      }

      // Log rollback
      this.logExecution(proposalId, 'rolled_back', undefined, reason);

      // Remove from active upgrades
      this.activeUpgrades.delete(proposalId);
    } catch (error) {
      throw new Error(`Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        cause: error,
      });
    }
  }

  /**
   * Register a rollback handler
   */
  registerRollbackHandler(
    proposalId: string,
    handler: () => Promise<void>
  ): void {
    this.rollbackHandlers.set(proposalId, handler);
  }

  /**
   * Log execution event
   */
  private logExecution(
    proposalId: string,
    status: 'pending' | 'executing' | 'completed' | 'failed' | 'rolled_back',
    error?: string,
    rollbackReason?: string
  ): void {
    const log: ExecutionLog = {
      proposalId,
      timestamp: Date.now(),
      status,
      error,
      rollbackReason,
    };

    this.executionLogs.set(`${proposalId}-${Date.now()}`, log);
  }

  /**
   * Get execution logs for a proposal
   */
  getExecutionLogs(proposalId: string): ExecutionLog[] {
    const logs: ExecutionLog[] = [];

    for (const [key, log] of this.executionLogs) {
      if (log.proposalId === proposalId) {
        logs.push(log);
      }
    }

    return logs.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get all execution logs
   */
  getAllExecutionLogs(): ExecutionLog[] {
    return Array.from(this.executionLogs.values()).sort(
      (a, b) => a.timestamp - b.timestamp
    );
  }

  /**
   * Get active upgrades
   */
  getActiveUpgrades(): string[] {
    return Array.from(this.activeUpgrades);
  }

  /**
   * Get checkpoint for proposal
   */
  getCheckpoint(proposalId: string): UpgradeCheckpoint | null {
    return this.checkpoints.get(proposalId) || null;
  }

  /**
   * Get executor statistics
   */
  getStats(): {
    totalExecutions: number;
    completedExecutions: number;
    failedExecutions: number;
    rolledBackExecutions: number;
    activeUpgrades: number;
  } {
    let completed = 0;
    let failed = 0;
    let rolledBack = 0;

    for (const log of this.executionLogs.values()) {
      if (log.status === 'completed') completed++;
      if (log.status === 'failed') failed++;
      if (log.status === 'rolled_back') rolledBack++;
    }

    return {
      totalExecutions: this.executionLogs.size,
      completedExecutions: completed,
      failedExecutions: failed,
      rolledBackExecutions: rolledBack,
      activeUpgrades: this.activeUpgrades.size,
    };
  }
}

// Global executor instance
let globalExecutor: ProtocolExecutor | null = null;

/**
 * Get the global protocol executor
 */
export function getProtocolExecutor(): ProtocolExecutor {
  if (!globalExecutor) {
    globalExecutor = new ProtocolExecutor();
  }
  return globalExecutor;
}

export function resetProtocolExecutor(): void {
  globalExecutor = new ProtocolExecutor();
}
