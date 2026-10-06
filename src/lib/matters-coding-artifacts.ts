/**
 * Phase 4B1 Coding Agent — implementation plan / code change artifact parsing and output filtering.
 * Split from matters-coding-policy.ts; policy.ts re-exports these for existing importers.
 */

export type ImplementationPlan = {
  title: string;
  steps: string[];
  files: string[];
  tests: string[];
  concerns: string[];
};

export function parseImplementationPlan(body: string): ImplementationPlan {
  try {
    const data = JSON.parse(body) as Record<string, unknown>;
    return {
      title: String(data.title ?? 'Proposed implementation'),
      steps: Array.isArray(data.steps) ? data.steps.map((step) => String(step)) : [],
      files: Array.isArray(data.files) ? data.files.map((file) => String(file)) : [],
      tests: Array.isArray(data.tests) ? data.tests.map((test) => String(test)) : [],
      concerns: Array.isArray(data.concerns) ? data.concerns.map((item) => String(item)) : [],
    };
  } catch {
    const steps = body.split('\n').filter((line) => /^\d+\./.test(line.trim())).map((line) => line.trim());
    return { title: 'Proposed implementation', steps, files: [], tests: [], concerns: [] };
  }
}

export type CodeChangeArtifact = {
  baseCommitSha: string;
  changedFiles: string[];
  diff: string;
  tests: Array<{ name: string; result: 'PASS' | 'FAIL' | 'NOT RUN'; output?: string }>;
  commands: Array<{ command: string; allowed: boolean; exitCode?: number; category: string }>;
  workspaceRef: string;
  readyForHumanCommit: boolean;
  migrationsCreatedNotApplied: boolean;
  edgeFunctionsNotDeployed: boolean;
  remainingConcerns: string[];
};

export function parseCodeChangeArtifact(body: string): CodeChangeArtifact | null {
  try {
    const data = JSON.parse(body) as Record<string, unknown>;
    if (!data.base_commit_sha && !data.baseCommitSha) return null;
    return {
      baseCommitSha: String(data.base_commit_sha ?? data.baseCommitSha),
      changedFiles: Array.isArray(data.changed_files ?? data.changedFiles)
        ? ((data.changed_files ?? data.changedFiles) as unknown[]).map(String)
        : [],
      diff: String(data.diff ?? ''),
      tests: Array.isArray(data.tests)
        ? data.tests.map((row) => {
          const item = row as Record<string, unknown>;
          const result = item.result === 'PASS' || item.result === 'FAIL' ? item.result : 'NOT RUN';
          return { name: String(item.name ?? 'test'), result, output: item.output ? String(item.output) : undefined };
        })
        : [],
      commands: Array.isArray(data.commands)
        ? data.commands.map((row) => {
          const item = row as Record<string, unknown>;
          return {
            command: String(item.command ?? ''),
            allowed: Boolean(item.allowed),
            exitCode: typeof item.exit_code === 'number' ? item.exit_code : undefined,
            category: String(item.category ?? ''),
          };
        })
        : [],
      workspaceRef: String(data.workspace_ref ?? data.workspaceRef ?? ''),
      readyForHumanCommit: Boolean(data.ready_for_human_commit ?? data.readyForHumanCommit),
      migrationsCreatedNotApplied: Boolean(data.migrations_created_not_applied ?? data.migrationsCreatedNotApplied),
      edgeFunctionsNotDeployed: Boolean(data.edge_functions_not_deployed ?? data.edgeFunctionsNotDeployed ?? true),
      remainingConcerns: Array.isArray(data.remaining_concerns ?? data.remainingConcerns)
        ? ((data.remaining_concerns ?? data.remainingConcerns) as unknown[]).map(String)
        : [],
    };
  } catch {
    return null;
  }
}

export function filterCommandOutput(text: string): string {
  return text
    .replace(/(api[_-]?key|token|secret|password)\s*[=:]\s*\S+/gi, '$1=<redacted>')
    .replace(/eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, '<redacted-jwt>')
    .slice(0, 8000);
}

export function promptInjectionCannotGrant(text: string): boolean {
  const lowered = text.toLowerCase();
  return /ignore (your|all) (scope|rules|policy)|run sudo|git push origin main|read \.env/.test(lowered);
}

export function parseScopeExpansionRequest(body: string): {
  path: string;
  reason: string;
  intended: string;
} | null {
  try {
    const data = JSON.parse(body) as Record<string, unknown>;
    const path = String(data.path ?? '').trim();
    if (!path) return null;
    return {
      path,
      reason: String(data.reason ?? 'Write denied by current path scope.'),
      intended: String(data.intended ?? data.intended_modification ?? ''),
    };
  } catch {
    return null;
  }
}
