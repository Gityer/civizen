/** Deterministic human-contribution substance. AI is execution assistance, not a reputation recipient. */

import type { DevelopmentContributionRole } from '@/lib/civizen-development-evidence';

export const HUMAN_CONTRIBUTION_SUBSTANCE_VERSION = 'human-contribution-substance-v1';

export type ExecutionMethod = 'manual' | 'ai_assisted' | 'mixed' | 'unknown';
export type SubstanceLevel = 'trivial' | 'modest' | 'substantive' | 'high' | 'unknown';
export type SubstanceSignal = 'high' | 'moderate' | 'low' | 'unknown';
export type HumanSubstanceDimensionId =
  | 'origination'
  | 'decision_responsibility'
  | 'judgment'
  | 'iterative_control'
  | 'specification_depth'
  | 'validation_acceptance'
  | 'direct_implementation'
  | 'outcome_influence';

export type HumanContributionSubstance = {
  version: typeof HUMAN_CONTRIBUTION_SUBSTANCE_VERSION;
  level: SubstanceLevel;
  overall: number | 'unknown';
  dimensions: Record<HumanSubstanceDimensionId, SubstanceSignal>;
  reasons: string[];
  promptCountUsedForScore: false;
  effortUsedAsMultiplier: false;
};

export type HumanContributionAssessmentInput = {
  title?: string | null;
  instruction?: string | null;
  linkedInstructions?: string[] | null;
  roles?: DevelopmentContributionRole[];
  implementationAssisted?: boolean | null;
  testsPassed?: boolean | null;
  provenanceCount?: number | null;
  substantiveInteractions?: number | null;
  revisionCycles?: number | null;
  durationMinutes?: number | null;
  affectedPaths?: string[] | null;
  features?: string[] | null;
  structuralSignificance?: 'high' | 'moderate' | 'localized' | 'unknown';
  historicalReconstruction?: boolean;
};

const COSMETIC_INSTRUCTION =
  /^(make|change|set|turn|use|please)\b.{0,80}\b(blue|red|green|yellow|color|colour|padding|margin|font-size|bold|italic|opacity|rounded)\b/i;
const COSMETIC_PATH = /\.(css|scss)$|(^|\/)(ui|styles?)\//;
const SUBSTANTIVE_HINT =
  /\b(architect|architecture|invariant|redesign|requirement|governance|framework|classification|accessib|integrat|principle|subsystem|canonical|operating model|contribution record|document-first|party roles?)\b/i;
const DEFAULT_ASSISTED: DevelopmentContributionRole[] = ['product_direction', 'review'];
const HISTORICAL_DEFAULT: DevelopmentContributionRole[] = ['founder', 'product_direction', 'review'];
const STATUS_ROLES = new Set<DevelopmentContributionRole>(['founder']);

const ROLE_PHRASE: Partial<Record<DevelopmentContributionRole, string>> = {
  problem_identification: 'identified the problem',
  product_architect: 'shaped product architecture',
  product_direction: 'directed the product',
  ux_design: 'designed UX',
  design: 'designed workflow',
  requirements: 'defined requirements',
  system_architect: 'defined system architecture',
  research: 'researched the approach',
  governance_design: 'designed governance or model',
  review: 'reviewed iterations',
  quality_assurance: 'identified deficiencies',
  validation: 'validated the resulting capability',
  implementation: 'implemented the work',
  documentation: 'documented the work',
  coordination: 'coordinated the work',
};

function textOf(value?: string | null): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function combinedText(input: HumanContributionAssessmentInput): string {
  return [input.title, input.instruction, ...(input.linkedInstructions ?? [])].map(textOf).filter(Boolean).join(' ');
}

function hasRole(roles: DevelopmentContributionRole[], ...wanted: DevelopmentContributionRole[]): boolean {
  return wanted.some((role) => roles.includes(role));
}

export function isTrivialCosmeticHumanInput(args: {
  instruction?: string | null;
  affectedPaths?: string[] | null;
  features?: string[] | null;
  historicalReconstruction?: boolean;
}): boolean {
  if (args.historicalReconstruction) return false;
  const instruction = textOf(args.instruction);
  if (!instruction || SUBSTANTIVE_HINT.test(instruction)) return false;
  if (!COSMETIC_INSTRUCTION.test(instruction)) return false;
  const paths = (args.affectedPaths ?? []).filter((path) => path.trim().length > 0);
  const features = (args.features ?? []).join(' ');
  const smallStyle =
    (paths.length > 0 && paths.length <= 2 && paths.every((path) => COSMETIC_PATH.test(path))) ||
    (paths.length === 0 && (args.features?.length ?? 0) <= 1 && /\b(button|color|colour|style|padding)\b/i.test(features));
  return smallStyle;
}

export function inferHumanContributionRolesFromText(
  instruction: string,
  options?: { assisted?: boolean; paths?: string[] | null },
): DevelopmentContributionRole[] {
  const text = textOf(instruction);
  const assisted = options?.assisted === true;
  const roles: DevelopmentContributionRole[] = [];
  if (/\barchitect|architecture|invariant|subsystem|integrat\b/i.test(text)) {
    roles.push('system_architect', 'product_architect');
  }
  if (/\brequirement|specify|define|principle|constraint\b/i.test(text)) roles.push('requirements');
  if (/\bproblem|identif(y|ied)|missing capability\b/i.test(text)) roles.push('problem_identification');
  if (/\b(ux|user experience|mobile ux|document-first|party roles?|agreement creation|template (selection|behavior)|creation model)\b/i.test(text)) {
    roles.push('ux_design', 'design');
  }
  if (/\breview|correct|second-pass|quality control|direct(ed)? revisions?\b/i.test(text)) roles.push('review');
  if (/\b(deficienc(?:y|ies)?|defect|inconsisten\w*|inaccessib\w*|accessib\w+|exclusion|misleading semantics?|score inflation|incorrect business)\b/i.test(text)) {
    roles.push('quality_assurance', 'review');
  }
  if (/\b(validat|acceptance|accepted the (result|outcome)|inspect(ed)? the (result|implementation))\b/i.test(text)) {
    roles.push('validation');
  }
  if (/\bgovernance|framework|policy|operating model\b/i.test(text)) roles.push('governance_design');
  if (/\bdocument(ation|ed)\b/i.test(text) && /\b(spec|guide|readme)\b/i.test(text)) roles.push('documentation');
  const personalImpl = /\b(I (wrote|implemented|coded)|hand[- ]?wrote|personally implement)\b/i.test(text);
  if (!assisted && personalImpl) roles.push('implementation');
  if (assisted && roles.length === 0) roles.push(...DEFAULT_ASSISTED);
  return [...new Set(roles)];
}

export function historicalHumanRolesFromProvenance(
  commitInstruction: string,
  linkedInstructions: string[] = [],
): DevelopmentContributionRole[] {
  const inferred = inferHumanContributionRolesFromText(
    [commitInstruction, ...linkedInstructions].join(' '),
    { assisted: true },
  );
  return [...new Set<DevelopmentContributionRole>(['founder', ...inferred])];
}

export function enrichHumanRolesForEvaluation(args: {
  storedRoles: DevelopmentContributionRole[];
  title?: string | null;
  instruction?: string | null;
  linkedInstructions?: string[] | null;
  implementationAssisted?: boolean | null;
  reconstruction?: boolean;
}): DevelopmentContributionRole[] {
  const assisted = args.implementationAssisted === true;
  const inferred = inferHumanContributionRolesFromText(combinedText(args), { assisted });
  const stored = args.storedRoles;
  if (stored.length === 0) return inferred;
  const storedSet = new Set(stored);
  const defaultHistorical =
    args.reconstruction === true &&
    stored.every((role) => HISTORICAL_DEFAULT.includes(role)) &&
    storedSet.has('founder') &&
    storedSet.has('product_direction');
  if (defaultHistorical && inferred.length > 0) {
    return [
      ...new Set<DevelopmentContributionRole>([
        'founder',
        ...inferred,
        ...stored.filter((role) => role !== 'implementation' || !assisted),
      ]),
    ];
  }
  return stored;
}

export function executionMethodFromEvidence(args: {
  implementationAssisted?: boolean | null;
  roles?: DevelopmentContributionRole[];
}): ExecutionMethod {
  const roles = args.roles ?? [];
  const assisted = args.implementationAssisted === true;
  const humanImpl = roles.includes('implementation') && !assisted;
  if (assisted && roles.includes('implementation')) return 'mixed';
  if (assisted) return 'ai_assisted';
  if (humanImpl) return 'manual';
  return 'unknown';
}

function signalFrom(high: boolean, moderate: boolean, low: boolean): SubstanceSignal {
  if (high) return 'high';
  if (moderate) return 'moderate';
  if (low) return 'low';
  return 'unknown';
}

function scoreSignal(signal: SubstanceSignal): number | null {
  if (signal === 'high') return 80;
  if (signal === 'moderate') return 55;
  if (signal === 'low') return 22;
  return null;
}

function levelFromOverall(overall: number): SubstanceLevel {
  if (overall >= 70) return 'high';
  if (overall >= 52) return 'substantive';
  if (overall >= 34) return 'modest';
  return 'trivial';
}

export function actionRolesForSubstance(roles: DevelopmentContributionRole[]): DevelopmentContributionRole[] {
  return roles.filter((role) => !STATUS_ROLES.has(role));
}

export function assessHumanContributionSubstance(
  input: HumanContributionAssessmentInput,
): HumanContributionSubstance {
  const roles = actionRolesForSubstance(input.roles ?? []);
  const assisted = input.implementationAssisted === true;
  const text = combinedText(input);
  const cosmetic = isTrivialCosmeticHumanInput(input);
  const onlyDefaultAssisted =
    assisted &&
    roles.length > 0 &&
    roles.every((role) => DEFAULT_ASSISTED.includes(role) || role === 'founder') &&
    !SUBSTANTIVE_HINT.test(text);
  const dimensions: HumanContributionSubstance['dimensions'] = {
    origination: signalFrom(
      hasRole(roles, 'problem_identification', 'system_architect', 'product_architect') || /\boriginat|invent|new architecture\b/i.test(text),
      hasRole(roles, 'product_direction', 'ux_design'),
      cosmetic || onlyDefaultAssisted,
    ),
    decision_responsibility: signalFrom(
      hasRole(roles, 'system_architect', 'product_architect', 'product_direction', 'requirements', 'governance_design'),
      hasRole(roles, 'ux_design', 'design'),
      cosmetic || onlyDefaultAssisted,
    ),
    judgment: signalFrom(
      hasRole(roles, 'quality_assurance', 'governance_design', 'system_architect'),
      hasRole(roles, 'review', 'validation', 'requirements', 'ux_design'),
      cosmetic,
    ),
    iterative_control: signalFrom(
      hasRole(roles, 'review', 'quality_assurance', 'validation')
        && ((input.revisionCycles ?? 0) >= 2 || /\b(deficienc(?:y|ies)?|revision|inspect|correct)\b/i.test(text)),
      hasRole(roles, 'review', 'quality_assurance', 'validation') && (input.substantiveInteractions ?? 0) >= 3,
      cosmetic,
    ),
    specification_depth: signalFrom(
      hasRole(roles, 'requirements', 'system_architect', 'governance_design'),
      hasRole(roles, 'ux_design', 'design', 'product_architect'),
      cosmetic || onlyDefaultAssisted,
    ),
    validation_acceptance: signalFrom(
      hasRole(roles, 'validation') && (input.testsPassed === true || /\bvalidat|accept\b/i.test(text)),
      hasRole(roles, 'validation', 'review') && input.testsPassed === true,
      cosmetic,
    ),
    direct_implementation: signalFrom(
      hasRole(roles, 'implementation') && !assisted,
      false,
      assisted || cosmetic,
    ),
    outcome_influence: signalFrom(
      !cosmetic && !onlyDefaultAssisted && (input.structuralSignificance === 'high' || hasRole(roles, 'system_architect', 'product_architect', 'requirements')),
      !cosmetic && (input.structuralSignificance === 'moderate' || hasRole(roles, 'ux_design', 'review', 'product_direction')),
      cosmetic || onlyDefaultAssisted || input.structuralSignificance === 'localized',
    ),
  };
  const reasons = ['prompt_count_excluded', 'effort_not_multiplied'];
  if (cosmetic) reasons.push('trivial_cosmetic_input');
  if (onlyDefaultAssisted) reasons.push('limited_human_involvement_with_assistance');
  if (input.durationMinutes != null && Number.isFinite(input.durationMinutes) && input.durationMinutes > 0) {
    reasons.push('effort_recorded_not_multiplied');
    if (input.durationMinutes >= 30 && hasRole(roles, 'review', 'requirements', 'ux_design', 'validation') && dimensions.iterative_control === 'unknown') {
      dimensions.iterative_control = 'moderate';
    }
  }
  const scores = Object.values(dimensions).map(scoreSignal).filter((value): value is number => value != null);
  if (scores.length === 0) {
    return {
      version: HUMAN_CONTRIBUTION_SUBSTANCE_VERSION,
      level: 'unknown',
      overall: 'unknown',
      dimensions,
      reasons,
      promptCountUsedForScore: false,
      effortUsedAsMultiplier: false,
    };
  }
  let overall = Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
  if (cosmetic) overall = Math.min(overall, 24);
  else if (onlyDefaultAssisted) overall = Math.min(overall, 40);
  if ((input.durationMinutes ?? 0) >= 120 && (cosmetic || onlyDefaultAssisted)) {
    overall = Math.min(overall, 36);
    reasons.push('long_effort_without_commensurate_value');
  }
  return {
    version: HUMAN_CONTRIBUTION_SUBSTANCE_VERSION,
    level: levelFromOverall(overall),
    overall,
    dimensions,
    reasons,
    promptCountUsedForScore: false,
    effortUsedAsMultiplier: false,
  };
}

export function blendOutcomeQualityWithHumanSubstance(
  outcomeQuality: number,
  substance: HumanContributionSubstance,
): number {
  if (substance.overall === 'unknown' || substance.level === 'unknown' || substance.level === 'high' || substance.level === 'substantive') {
    return outcomeQuality;
  }
  if (substance.level === 'modest') return Math.max(24, Math.round(outcomeQuality * 0.86));
  return Math.min(48, Math.round(outcomeQuality * 0.62));
}

export function humanContributionSummary(
  roles: DevelopmentContributionRole[],
  method: ExecutionMethod,
): string {
  const phrases = roles
    .filter((role) => !(role === 'implementation' && method === 'ai_assisted'))
    .map((role) => ROLE_PHRASE[role])
    .filter((item): item is string => Boolean(item));
  const unique = [...new Set(phrases)].slice(0, 5);
  if (unique.length === 0) {
    return method === 'ai_assisted'
      ? 'Directed and judged AI-assisted work according to the evidenced human role.'
      : 'Human contribution is recorded from the evidenced role and outcome.';
  }
  const body = unique.join(', ').replace(/, ([^,]+)$/, ', and $1');
  return `${body.charAt(0).toUpperCase()}${body.slice(1)}.`;
}
