/**
 * Environment Manager
 * 
 * Manages different deployment environments (Dev, Test, Prod)
 * and their configurations.
 */

export type EnvironmentType = 'development' | 'staging' | 'production';

export interface EnvironmentConfig {
  name: string;
  type: EnvironmentType;
  description: string;
  protocolVersion: string;
  features: FeatureConfig[];
  accessControl: AccessControlConfig;
  dataRetention: number;              // Days
  backupFrequency: number;            // Hours
  monitoringLevel: 'basic' | 'standard' | 'enhanced';
  rolloutPercentage: number;          // 0-100
  approvalRequired: boolean;
  timeToPromote: number;              // Hours before auto-promotion
}

export interface FeatureConfig {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  testingRequired: boolean;
  approvalRequired: boolean;
}

export interface AccessControlConfig {
  allowedRoles: string[];
  requiresVPN: boolean;
  ipWhitelist: string[];
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

export interface EnvironmentMetrics {
  environment: EnvironmentType;
  uptime: number;                     // Percentage
  errorRate: number;                  // Percentage
  averageLatency: number;             // Milliseconds
  activeUsers: number;
  totalRequests: number;
  failedRequests: number;
  lastHealthCheck: number;
}

export interface EnvironmentTransition {
  id: string;
  fromEnvironment: EnvironmentType;
  toEnvironment: EnvironmentType;
  proposalId: string;
  status: 'pending' | 'approved' | 'in-progress' | 'completed' | 'failed' | 'rolled-back';
  requestedAt: number;
  approvedAt?: number;
  completedAt?: number;
  approvedBy?: string;
  reason: string;
  rollbackReason?: string;
}

/**
 * Environment Manager
 */
export class EnvironmentManager {
  private environments: Map<EnvironmentType, EnvironmentConfig> = new Map();
  private metrics: Map<EnvironmentType, EnvironmentMetrics> = new Map();
  private transitions: Map<string, EnvironmentTransition> = new Map();
  private currentEnvironment: EnvironmentType = 'development';
  private listeners: Set<(event: EnvironmentEvent) => void> = new Set();

  constructor() {
    this.initializeEnvironments();
  }

  /**
   * Initialize default environments
   */
  private initializeEnvironments(): void {
    // Development Environment
    this.environments.set('development', {
      name: 'Development',
      type: 'development',
      description: 'Local development environment for feature development',
      protocolVersion: '1.0.0',
      features: [],
      accessControl: {
        allowedRoles: ['developer', 'admin'],
        requiresVPN: false,
        ipWhitelist: [],
        rateLimits: {
          requestsPerMinute: 1000,
          requestsPerHour: 50000,
        },
      },
      dataRetention: 7,
      backupFrequency: 24,
      monitoringLevel: 'basic',
      rolloutPercentage: 100,
      approvalRequired: false,
      timeToPromote: 0,
    });

    // Staging/Testing Environment
    this.environments.set('staging', {
      name: 'Staging',
      type: 'staging',
      description: 'Testing environment for authorized testers and stewards',
      protocolVersion: '1.0.0',
      features: [],
      accessControl: {
        allowedRoles: ['tester', 'steward', 'guardian', 'admin'],
        requiresVPN: false,
        ipWhitelist: [],
        rateLimits: {
          requestsPerMinute: 500,
          requestsPerHour: 30000,
        },
      },
      dataRetention: 30,
      backupFrequency: 12,
      monitoringLevel: 'standard',
      rolloutPercentage: 50,
      approvalRequired: true,
      timeToPromote: 72,
    });

    // Production Environment
    this.environments.set('production', {
      name: 'Production',
      type: 'production',
      description: 'Live production environment for all users',
      protocolVersion: '1.0.0',
      features: [],
      accessControl: {
        allowedRoles: ['citizen', 'steward', 'guardian', 'admin'],
        requiresVPN: false,
        ipWhitelist: [],
        rateLimits: {
          requestsPerMinute: 100,
          requestsPerHour: 5000,
        },
      },
      dataRetention: 365,
      backupFrequency: 6,
      monitoringLevel: 'enhanced',
      rolloutPercentage: 100,
      approvalRequired: true,
      timeToPromote: 0,
    });

    // Initialize metrics
    for (const env of ['development', 'staging', 'production'] as EnvironmentType[]) {
      this.metrics.set(env, {
        environment: env,
        uptime: 100,
        errorRate: 0,
        averageLatency: 0,
        activeUsers: 0,
        totalRequests: 0,
        failedRequests: 0,
        lastHealthCheck: Date.now(),
      });
    }
  }

  /**
   * Get environment configuration
   */
  getEnvironment(type: EnvironmentType): EnvironmentConfig | null {
    return this.environments.get(type) || null;
  }

  /**
   * Get all environments
   */
  getAllEnvironments(): EnvironmentConfig[] {
    return Array.from(this.environments.values());
  }

  /**
   * Get current environment
   */
  getCurrentEnvironment(): EnvironmentType {
    return this.currentEnvironment;
  }

  /**
   * Update environment configuration
   */
  updateEnvironmentConfig(
    type: EnvironmentType,
    config: Partial<EnvironmentConfig>
  ): void {
    const env = this.environments.get(type);
    if (!env) {
      throw new Error(`Environment ${type} not found`);
    }

    Object.assign(env, config);

    this.emit({
      type: 'environment-updated',
      environment: type,
      config: env,
    });
  }

  /**
   * Request environment transition
   */
  requestTransition(
    fromEnv: EnvironmentType,
    toEnv: EnvironmentType,
    proposalId: string,
    reason: string,
    requester: string
  ): EnvironmentTransition {
    if (!this.environments.has(fromEnv) || !this.environments.has(toEnv)) {
      throw new Error('Invalid environment');
    }

    const transition: EnvironmentTransition = {
      id: `transition-${Date.now()}`,
      fromEnvironment: fromEnv,
      toEnvironment: toEnv,
      proposalId,
      status: 'pending',
      requestedAt: Date.now(),
      reason,
    };

    this.transitions.set(transition.id, transition);

    this.emit({
      type: 'transition-requested',
      transition,
      requester,
    });

    return transition;
  }

  /**
   * Approve environment transition
   */
  approveTransition(transitionId: string, approver: string): void {
    const transition = this.transitions.get(transitionId);
    if (!transition) {
      throw new Error(`Transition ${transitionId} not found`);
    }

    if (transition.status !== 'pending') {
      throw new Error(`Transition is already ${transition.status}`);
    }

    transition.status = 'approved';
    transition.approvedAt = Date.now();
    transition.approvedBy = approver;

    this.emit({
      type: 'transition-approved',
      transition,
      approver,
    });
  }

  /**
   * Reject environment transition
   */
  rejectTransition(transitionId: string, reason: string, rejector: string): void {
    const transition = this.transitions.get(transitionId);
    if (!transition) {
      throw new Error(`Transition ${transitionId} not found`);
    }

    if (transition.status !== 'pending') {
      throw new Error(`Transition is already ${transition.status}`);
    }

    transition.status = 'failed';
    transition.rollbackReason = reason;

    this.emit({
      type: 'transition-rejected',
      transition,
      rejector,
      reason,
    });
  }

  /**
   * Execute environment transition
   */
  async executeTransition(transitionId: string): Promise<void> {
    const transition = this.transitions.get(transitionId);
    if (!transition) {
      throw new Error(`Transition ${transitionId} not found`);
    }

    if (transition.status !== 'approved') {
      throw new Error('Transition must be approved before execution');
    }

    try {
      transition.status = 'in-progress';

      this.emit({
        type: 'transition-started',
        transition,
      });

      // Simulate transition process
      await this.performTransition(transition);

      transition.status = 'completed';
      transition.completedAt = Date.now();

      this.emit({
        type: 'transition-completed',
        transition,
      });
    } catch (error) {
      transition.status = 'failed';
      transition.rollbackReason = error instanceof Error ? error.message : 'Unknown error';

      this.emit({
        type: 'transition-failed',
        transition,
        error,
      });

      throw error;
    }
  }

  /**
   * Perform the actual transition
   */
  private async performTransition(transition: EnvironmentTransition): Promise<void> {
    // Validate target environment
    const targetEnv = this.environments.get(transition.toEnvironment);
    if (!targetEnv) {
      throw new Error(`Target environment ${transition.toEnvironment} not found`);
    }

    // Check health of target environment
    const metrics = this.metrics.get(transition.toEnvironment);
    if (metrics && metrics.errorRate > 5) {
      throw new Error(`Target environment has high error rate: ${metrics.errorRate}%`);
    }

    // Perform pre-transition checks
    await this.runPreTransitionChecks(transition);

    // Update current environment
    this.currentEnvironment = transition.toEnvironment;

    // Perform post-transition validation
    await this.runPostTransitionValidation(transition);
  }

  /**
   * Run pre-transition checks
   */
  private async runPreTransitionChecks(transition: EnvironmentTransition): Promise<void> {
    // Backup current state
    await this.backupEnvironmentState(transition.fromEnvironment);

    // Validate data consistency
    await this.validateDataConsistency(transition.fromEnvironment);

    // Check network connectivity
    await this.checkNetworkConnectivity(transition.toEnvironment);
  }

  /**
   * Run post-transition validation
   */
  private async runPostTransitionValidation(transition: EnvironmentTransition): Promise<void> {
    // Verify environment health
    await this.verifyEnvironmentHealth(transition.toEnvironment);

    // Validate feature flags
    await this.validateFeatureFlags(transition.toEnvironment);

    // Check data integrity
    await this.checkDataIntegrity(transition.toEnvironment);
  }

  /**
   * Backup environment state
   */
  private async backupEnvironmentState(env: EnvironmentType): Promise<void> {
    // Simulate backup
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * Validate data consistency
   */
  private async validateDataConsistency(env: EnvironmentType): Promise<void> {
    // Simulate validation
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * Check network connectivity
   */
  private async checkNetworkConnectivity(env: EnvironmentType): Promise<void> {
    // Simulate connectivity check
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * Verify environment health
   */
  private async verifyEnvironmentHealth(env: EnvironmentType): Promise<void> {
    // Simulate health check
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * Validate feature flags
   */
  private async validateFeatureFlags(env: EnvironmentType): Promise<void> {
    // Simulate feature flag validation
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * Check data integrity
   */
  private async checkDataIntegrity(env: EnvironmentType): Promise<void> {
    // Simulate integrity check
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * Rollback environment transition
   */
  async rollbackTransition(transitionId: string, reason: string): Promise<void> {
    const transition = this.transitions.get(transitionId);
    if (!transition) {
      throw new Error(`Transition ${transitionId} not found`);
    }

    if (transition.status !== 'completed') {
      throw new Error('Only completed transitions can be rolled back');
    }

    try {
      // Restore from backup
      await this.restoreFromBackup(transition.toEnvironment);

      // Revert to previous environment
      this.currentEnvironment = transition.fromEnvironment;

      transition.status = 'rolled-back';
      transition.rollbackReason = reason;

      this.emit({
        type: 'transition-rolled-back',
        transition,
        reason,
      });
    } catch (error) {
      throw new Error(`Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        cause: error,
      });
    }
  }

  /**
   * Restore from backup
   */
  private async restoreFromBackup(env: EnvironmentType): Promise<void> {
    // Simulate restore
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * Update environment metrics
   */
  updateMetrics(env: EnvironmentType, metrics: Partial<EnvironmentMetrics>): void {
    const current = this.metrics.get(env);
    if (!current) {
      throw new Error(`Environment ${env} not found`);
    }

    Object.assign(current, metrics);
    current.lastHealthCheck = Date.now();

    this.emit({
      type: 'metrics-updated',
      environment: env,
      metrics: current,
    });
  }

  /**
   * Get environment metrics
   */
  getMetrics(env: EnvironmentType): EnvironmentMetrics | null {
    return this.metrics.get(env) || null;
  }

  /**
   * Get all transitions
   */
  getAllTransitions(): EnvironmentTransition[] {
    return Array.from(this.transitions.values());
  }

  /**
   * Get transition by ID
   */
  getTransition(id: string): EnvironmentTransition | null {
    return this.transitions.get(id) || null;
  }

  /**
   * Get pending transitions
   */
  getPendingTransitions(): EnvironmentTransition[] {
    return Array.from(this.transitions.values()).filter((t) => t.status === 'pending');
  }

  /**
   * Subscribe to environment events
   */
  subscribe(listener: (event: EnvironmentEvent) => void): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Emit environment event
   */
  private emit(event: EnvironmentEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in environment event listener:', error);
      }
    }
  }

  /**
   * Get environment statistics
   */
  getStats(): {
    currentEnvironment: EnvironmentType;
    totalEnvironments: number;
    totalTransitions: number;
    pendingTransitions: number;
    completedTransitions: number;
    failedTransitions: number;
  } {
    let completed = 0;
    let failed = 0;

    for (const transition of this.transitions.values()) {
      if (transition.status === 'completed') completed++;
      if (transition.status === 'failed' || transition.status === 'rolled-back') failed++;
    }

    return {
      currentEnvironment: this.currentEnvironment,
      totalEnvironments: this.environments.size,
      totalTransitions: this.transitions.size,
      pendingTransitions: this.getPendingTransitions().length,
      completedTransitions: completed,
      failedTransitions: failed,
    };
  }
}

/**
 * Environment Events
 */
export type EnvironmentEvent =
  | {
      type: 'environment-updated';
      environment: EnvironmentType;
      config: EnvironmentConfig;
    }
  | {
      type: 'transition-requested';
      transition: EnvironmentTransition;
      requester: string;
    }
  | {
      type: 'transition-approved';
      transition: EnvironmentTransition;
      approver: string;
    }
  | {
      type: 'transition-rejected';
      transition: EnvironmentTransition;
      rejector: string;
      reason: string;
    }
  | {
      type: 'transition-started';
      transition: EnvironmentTransition;
    }
  | {
      type: 'transition-completed';
      transition: EnvironmentTransition;
    }
  | {
      type: 'transition-failed';
      transition: EnvironmentTransition;
      error: unknown;
    }
  | {
      type: 'transition-rolled-back';
      transition: EnvironmentTransition;
      reason: string;
    }
  | {
      type: 'metrics-updated';
      environment: EnvironmentType;
      metrics: EnvironmentMetrics;
    };

// Global environment manager instance
let globalEnvironmentManager: EnvironmentManager | null = null;

/**
 * Get the global environment manager
 */
export function getEnvironmentManager(): EnvironmentManager {
  if (!globalEnvironmentManager) {
    globalEnvironmentManager = new EnvironmentManager();
  }
  return globalEnvironmentManager;
}
