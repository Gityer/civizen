/**
 * Phase 4B1 Coding Agent — path/command/secret policy.
 * Tool authority is enforced here, not by model output or repository text.
 */

export const CODING_AGENT_ID = 'b0000000-0000-4000-8000-000000000006';
export const CIVIZEN_REPO_SLUG = 'maturehumanity/civizen';
export const PHASE4B1_COMMAND_POLICY = 'phase4b1_dev';

/** Host provenance — the 4B1 SQL migration is already applied. The agent must not apply it again. */
export const PHASE4B1_SQL_MIGRATION_PROVENANCE =
  'Phase 4B1 SQL migration was already applied remotely by the operator. Future remote migrations remain prohibited to the Coding Agent.';

export const CODING_CAPABILITIES = [
  'matter.read',
  'discussion.read',
  'discussion.comment',
  'task.read',
  'task.submit',
  'evidence.read',
  'evidence.add',
  'repository.read',
  'repository.write',
  'command.run',
  'test.run',
  'diff.read',
  'artifact.add',
] as const;

export const ALWAYS_DENIED_PATH_GLOBS = [
  '.env',
  '.env.*',
  '*.pem',
  '*.key',
  '*.p12',
  'id_rsa',
  'id_ed25519',
  '*.id_rsa',
  '.ssh/**',
  '**/credentials.json',
  '**/service-account*.json',
  '**/.aws/**',
  '**/.gnupg/**',
] as const;

export const ALWAYS_DENIED_BASENAMES = new Set([
  '.env',
  'id_rsa',
  'id_ed25519',
  'id_ecdsa',
  'authorized_keys',
  'known_hosts',
  'credentials',
]);

const DENIED_BINARIES = new Set([
  'sudo',
  'ssh',
  'scp',
  'rsync',
  'docker',
  'podman',
  'kubectl',
  'systemctl',
  'curl',
  'wget',
  'env',
  'printenv',
  'export',
  'bash',
  'sh',
  'zsh',
  'python',
  'python3',
  'perl',
  'ruby',
  'node',
  'chmod',
  'chown',
  'rm',
  'dd',
  'mkfs',
]);

const ALLOWED_GIT_SUBCOMMANDS = new Set([
  'status',
  'diff',
  'show',
  'log',
  'rev-parse',
  'ls-files',
]);

const DENIED_GIT_SUBCOMMANDS = new Set([
  'push',
  'fetch',
  'pull',
  'clone',
  'reset',
  'clean',
  'rebase',
  'merge',
  'tag',
  'commit',
  'checkout',
  'branch',
  'remote',
  'stash',
  'filter-branch',
  'worktree',
]);

const DENIED_NPM_SCRIPTS = new Set([
  'verify:post-dev',
  'verify:pre-push',
  'verify:ci',
  'update:application',
  'cap:android',
  'cap:ios',
  'release:bump',
  'promote:android-testing-to-release',
  'db:apply-remote-migration',
  'db:apply-remote:federation-distribution',
  'db:vps-install-agent-key',
]);

export type CodingPolicy = {
  repositorySlug: string;
  allowedPaths: string[];
  deniedPaths: string[];
  commandPolicy: typeof PHASE4B1_COMMAND_POLICY;
  networkPolicy: 'none';
  maxExecutionTimeMs: number;
  maxCommands: number;
  maxRevisionRuns: number;
  requirePlanApproval: boolean;
  requiredGates: string[];
};

export type CommandDecision = {
  allowed: boolean;
  reason: string;
  category: 'git-read' | 'test' | 'typecheck' | 'lint' | 'build' | 'verify' | 'denied';
  argv: string[];
};

export function defaultCodingPolicy(allowedPaths: string[]): CodingPolicy {
  return {
    repositorySlug: CIVIZEN_REPO_SLUG,
    allowedPaths,
    deniedPaths: [...ALWAYS_DENIED_PATH_GLOBS],
    commandPolicy: PHASE4B1_COMMAND_POLICY,
    networkPolicy: 'none',
    maxExecutionTimeMs: 180_000,
    maxCommands: 40,
    maxRevisionRuns: 3,
    requirePlanApproval: true,
    requiredGates: [],
  };
}

export function tokenizeCommand(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    if (ch === '|' || ch === ';' || ch === '&' || ch === '>' || ch === '<' || ch === '`') {
      throw new Error('Shell metacharacters are not permitted.');
    }
    current += ch;
  }
  if (quote) throw new Error('Unclosed quote in command.');
  if (current) tokens.push(current);
  return tokens;
}

function matchesGlob(relativePath: string, glob: string): boolean {
  const normalized = relativePath.replaceAll('\\', '/').replace(/^\.\//, '');
  const pattern = glob.replaceAll('\\', '/');
  if (pattern === normalized) return true;
  if (pattern.startsWith('**/')) {
    const rest = pattern.slice(3);
    if (normalized === rest || normalized.endsWith(`/${rest}`)) return true;
  }
  if (pattern.endsWith('/**')) {
    const prefix = pattern.slice(0, -3);
    return normalized === prefix || normalized.startsWith(`${prefix}/`);
  }
  if (pattern.startsWith('*.')) {
    return normalized.endsWith(pattern.slice(1)) || normalized.split('/').pop()?.endsWith(pattern.slice(1)) === true;
  }
  if (pattern.startsWith('.env')) {
    const base = normalized.split('/').pop() ?? normalized;
    if (pattern === '.env') return base === '.env';
    if (pattern === '.env.*') return base === '.env' || base.startsWith('.env.');
  }
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '::GLOBSTAR::')
    .replace(/\*/g, '[^/]*')
    .replace(/::GLOBSTAR::/g, '.*');
  return new RegExp(`^${escaped}$`).test(normalized);
}

export function isSecretPath(relativePath: string): boolean {
  const normalized = relativePath.replaceAll('\\', '/').replace(/^\.\//, '');
  const base = normalized.split('/').pop() ?? normalized;
  if (ALWAYS_DENIED_BASENAMES.has(base)) return true;
  if (base === '.env' || base.startsWith('.env.')) return true;
  if (base.endsWith('.pem') || base.endsWith('.key') || base.endsWith('.p12')) return true;
  if (normalized.includes('/.ssh/') || normalized.startsWith('.ssh/')) return true;
  return ALWAYS_DENIED_PATH_GLOBS.some((glob) => matchesGlob(normalized, glob));
}

export function isPathAllowed(relativePath: string, policy: CodingPolicy): boolean {
  const normalized = relativePath.replaceAll('\\', '/').replace(/^\.\//, '');
  if (!normalized || normalized.startsWith('/') || normalized.includes('\0')) return false;
  if (normalized.split('/').some((part) => part === '..')) return false;
  if (isSecretPath(normalized)) return false;
  for (const denied of [...ALWAYS_DENIED_PATH_GLOBS, ...policy.deniedPaths]) {
    if (matchesGlob(normalized, denied)) return false;
  }
  if (policy.allowedPaths.length === 0) return false;
  return policy.allowedPaths.some((allowed) => matchesGlob(normalized, allowed));
}

export function classifyCommand(raw: string, policy: CodingPolicy): CommandDecision {
  if (policy.commandPolicy !== PHASE4B1_COMMAND_POLICY) {
    return { allowed: false, reason: 'Unknown command policy.', category: 'denied', argv: [] };
  }
  let argv: string[];
  try {
    argv = tokenizeCommand(raw.trim());
  } catch (error) {
    return {
      allowed: false,
      reason: error instanceof Error ? error.message : 'Invalid command.',
      category: 'denied',
      argv: [],
    };
  }
  if (argv.length === 0) {
    return { allowed: false, reason: 'Empty command.', category: 'denied', argv };
  }
  const bin = argv[0];
  if (DENIED_BINARIES.has(bin) && bin !== 'npm' && bin !== 'npx') {
    return { allowed: false, reason: `${bin} is not permitted in Phase 4B1.`, category: 'denied', argv };
  }
  if (bin === 'git') {
    const sub = argv[1] ?? '';
    if (DENIED_GIT_SUBCOMMANDS.has(sub)) {
      return { allowed: false, reason: `git ${sub} is denied. Publication remains a human action.`, category: 'denied', argv };
    }
    if (!ALLOWED_GIT_SUBCOMMANDS.has(sub)) {
      return { allowed: false, reason: `git ${sub || '(missing)'} is not on the Phase 4B1 allowlist.`, category: 'denied', argv };
    }
    return { allowed: true, reason: 'Read-only git inspection.', category: 'git-read', argv };
  }
  if (bin === 'npx' && argv[1] === 'tsc' && argv.includes('--noEmit')) {
    if (argv.some((arg) => arg === '-b' || arg === '--build')) {
      return { allowed: false, reason: 'Project-build tsc is out of scope for Phase 4B1 targeted checks.', category: 'denied', argv };
    }
    return { allowed: true, reason: 'TypeScript noEmit check.', category: 'typecheck', argv };
  }
  if (bin === 'npm' && argv[1] === 'test') {
    return { allowed: true, reason: 'Targeted package tests.', category: 'test', argv };
  }
  if (bin === 'npm' && argv[1] === 'run') {
    const script = argv[2] ?? '';
    if (DENIED_NPM_SCRIPTS.has(script)) {
      return { allowed: false, reason: `${script} is a high-impact gate or deploy path and is denied.`, category: 'denied', argv };
    }
    if (script === 'build' || script === 'lint' || script === 'standards:check') {
      return { allowed: true, reason: 'Approved development check.', category: script === 'build' ? 'build' : 'lint', argv };
    }
    if (script.startsWith('verify:')) {
      return { allowed: true, reason: 'Approved targeted verification script.', category: 'verify', argv };
    }
    return { allowed: false, reason: `npm run ${script || '(missing)'} is not allowlisted.`, category: 'denied', argv };
  }
  return { allowed: false, reason: `${bin} is not an allowlisted Coding Agent command.`, category: 'denied', argv };
}

export function parseCodingPolicy(raw: unknown): CodingPolicy {
  const row = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};
  const allowedPaths = Array.isArray(row.allowed_paths ?? row.allowedPaths)
    ? ((row.allowed_paths ?? row.allowedPaths) as unknown[]).map((value) => String(value).trim()).filter(Boolean)
    : [];
  const deniedPaths = Array.isArray(row.denied_paths ?? row.deniedPaths)
    ? ((row.denied_paths ?? row.deniedPaths) as unknown[]).map((value) => String(value).trim()).filter(Boolean)
    : [];
  const requiredGates = Array.isArray(row.required_gates ?? row.requiredGates)
    ? ((row.required_gates ?? row.requiredGates) as unknown[]).map((value) => String(value))
    : [];
  const base = defaultCodingPolicy(allowedPaths);
  return {
    ...base,
    repositorySlug: String(row.repository_slug ?? row.repositorySlug ?? CIVIZEN_REPO_SLUG),
    deniedPaths: [...new Set([...base.deniedPaths, ...deniedPaths])],
    maxExecutionTimeMs: Number(row.max_execution_time_ms ?? row.maxExecutionTimeMs) || base.maxExecutionTimeMs,
    maxCommands: Number(row.max_commands ?? row.maxCommands) || base.maxCommands,
    maxRevisionRuns: Number(row.max_revision_runs ?? row.maxRevisionRuns) || base.maxRevisionRuns,
    requirePlanApproval: row.require_plan_approval === false || row.requirePlanApproval === false
      ? false
      : true,
    requiredGates,
  };
}

export function codingPolicyToJson(policy: CodingPolicy): Record<string, unknown> {
  return {
    repository_slug: policy.repositorySlug,
    allowed_paths: policy.allowedPaths,
    denied_paths: policy.deniedPaths,
    command_policy: policy.commandPolicy,
    network_policy: policy.networkPolicy,
    max_execution_time_ms: policy.maxExecutionTimeMs,
    max_commands: policy.maxCommands,
    max_revision_runs: policy.maxRevisionRuns,
    require_plan_approval: policy.requirePlanApproval,
    required_gates: policy.requiredGates,
  };
}

export * from '@/lib/matters-coding-artifacts';
