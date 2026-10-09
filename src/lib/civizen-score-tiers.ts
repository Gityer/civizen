/**
 * Civizen Score tiers — Explorer → Builder → Contributor → Catalyst → Steward.
 * Tier is derived from overall score plus supporting qualification rules.
 * Tiers do not measure dignity, social worth, or citizenship status.
 */

import type { ScoreConfidence } from '@/lib/civizen-score';
import {
  TIER_EVIDENCE_GATES,
  type ScoreMaturityStatus,
} from '@/lib/civizen-score-model';

export const TIER_RULES_VERSION = '1.1.0';

export type CivizenTier =
  | 'explorer'
  | 'builder'
  | 'contributor'
  | 'catalyst'
  | 'steward';

export const CIVIZEN_TIERS: CivizenTier[] = [
  'explorer',
  'builder',
  'contributor',
  'catalyst',
  'steward',
];

/** Highest-first for qualification walk-down. */
export const CIVIZEN_TIERS_DESCENDING: CivizenTier[] = [
  'steward',
  'catalyst',
  'contributor',
  'builder',
  'explorer',
];

export const CONFIDENCE_RANK: Record<ScoreConfidence, number> = {
  insufficient: 0,
  low: 1,
  moderate: 2,
  high: 3,
  very_high: 4,
};

export interface TierRule {
  id: CivizenTier;
  label: string;
  minScore: number;
  maxScore: number;
  minPerformanceScore?: number;
  minContributionsScore?: number;
  minConfidence?: ScoreConfidence;
  requiresVerifiedActivity?: boolean;
  requiresSustainedActivity?: boolean;
  requiresSubstantialImpact?: boolean;
  requiresNoSeriousIntegrityIssue?: boolean;
  minIndependentVerifiedEvidence?: number;
  minScoredCategories?: number;
  requiresRecurrence?: boolean;
  minTimeSpanDays?: number;
  /** Hex accent for tier-colored UI (labels, badges, dial progress). */
  colorHex: string;
  /** Tailwind text class mirroring colorHex (arbitrary value). */
  accentClass: string;
  icon: string;
  description: string;
}

/** Canonical public tier palette. */
export const TIER_COLORS: Record<CivizenTier, string> = {
  explorer: '#7B8AA1',
  builder: '#2BA8A0',
  contributor: '#3B82F6',
  catalyst: '#8B5CF6',
  steward: '#D9A441',
};

/**
 * Score-ring section bands (percent of 0–100). Unequal spans match tier thresholds.
 * Separators are drawn at each band’s `to` (except 100) in the *next* tier’s color.
 */
export const TIER_RING_BANDS: ReadonlyArray<{
  tier: CivizenTier;
  fromPercent: number;
  toPercent: number;
}> = [
  { tier: 'explorer', fromPercent: 0, toPercent: 30 },
  { tier: 'builder', fromPercent: 30, toPercent: 60 },
  { tier: 'contributor', fromPercent: 60, toPercent: 75 },
  { tier: 'catalyst', fromPercent: 75, toPercent: 85 },
  { tier: 'steward', fromPercent: 85, toPercent: 100 },
];

/** Slim separator marks at tier entry thresholds (Builder → Steward). */
export const TIER_RING_SEPARATORS: ReadonlyArray<{ atPercent: number; tier: CivizenTier }> =
  TIER_RING_BANDS.filter((band) => band.fromPercent > 0).map((band) => ({
    atPercent: band.fromPercent,
    tier: band.tier,
  }));


export const DEFAULT_TIER_RULES: TierRule[] = [
  {
    id: 'explorer',
    label: 'Explorer',
    minScore: 0,
    maxScore: 29.9,
    colorHex: TIER_COLORS.explorer,
    accentClass: 'text-[#5F6E86]',
    icon: 'Compass',
    description:
      'You are beginning your Civizen journey. Add verified learning, experience, skills, assignments, and contributions to build a stronger profile.',
  },
  {
    id: 'builder',
    label: 'Builder',
    minScore: 30,
    maxScore: 59.9,
    requiresVerifiedActivity: true,
    minIndependentVerifiedEvidence: TIER_EVIDENCE_GATES.builder.minIndependentVerifiedRoots,
    minScoredCategories: TIER_EVIDENCE_GATES.builder.minScoredCategories,
    minConfidence: TIER_EVIDENCE_GATES.builder.minConfidence,
    colorHex: TIER_COLORS.builder,
    accentClass: 'text-[#1F7F79]',
    icon: 'Blocks',
    description:
      'You are building a demonstrated record of capability, reliability, and participation across Civizen.',
  },
  {
    id: 'contributor',
    label: 'Contributor',
    minScore: 60,
    maxScore: 74.9,
    minPerformanceScore: 50,
    minContributionsScore: 50,
    minConfidence: 'moderate',
    requiresVerifiedActivity: true,
    minIndependentVerifiedEvidence: TIER_EVIDENCE_GATES.contributor.minIndependentVerifiedRoots,
    minScoredCategories: TIER_EVIDENCE_GATES.contributor.minScoredCategories,
    requiresRecurrence: TIER_EVIDENCE_GATES.contributor.requiresRecurrence,
    minTimeSpanDays: TIER_EVIDENCE_GATES.contributor.minTimeSpanDays,
    colorHex: TIER_COLORS.contributor,
    accentClass: 'text-[#2563EB]',
    icon: 'Handshake',
    description:
      'You consistently create verified value and demonstrate reliable participation in the Civizen ecosystem.',
  },
  {
    id: 'catalyst',
    label: 'Catalyst',
    minScore: 75,
    maxScore: 84.9,
    minPerformanceScore: 65,
    minContributionsScore: 65,
    minConfidence: 'high',
    requiresSustainedActivity: true,
    requiresNoSeriousIntegrityIssue: true,
    minIndependentVerifiedEvidence: TIER_EVIDENCE_GATES.catalyst.minIndependentVerifiedRoots,
    minScoredCategories: TIER_EVIDENCE_GATES.catalyst.minScoredCategories,
    requiresRecurrence: TIER_EVIDENCE_GATES.catalyst.requiresRecurrence,
    minTimeSpanDays: TIER_EVIDENCE_GATES.catalyst.minTimeSpanDays,
    colorHex: TIER_COLORS.catalyst,
    accentClass: 'text-[#6D28D9]',
    icon: 'Sparkles',
    description:
      'You help people and initiatives move forward through sustained contribution, collaboration, and measurable impact.',
  },
  {
    id: 'steward',
    label: 'Steward',
    minScore: 85,
    maxScore: 100,
    minPerformanceScore: 75,
    minContributionsScore: 75,
    minConfidence: 'high',
    requiresSubstantialImpact: true,
    requiresNoSeriousIntegrityIssue: true,
    minIndependentVerifiedEvidence: TIER_EVIDENCE_GATES.steward.minIndependentVerifiedRoots,
    minScoredCategories: TIER_EVIDENCE_GATES.steward.minScoredCategories,
    requiresRecurrence: TIER_EVIDENCE_GATES.steward.requiresRecurrence,
    minTimeSpanDays: TIER_EVIDENCE_GATES.steward.minTimeSpanDays,
    colorHex: TIER_COLORS.steward,
    accentClass: 'text-[#8A6410]',
    icon: 'Shield',
    description:
      'You demonstrate sustained responsibility, trusted contribution, and exceptional care for the Civizen ecosystem and its mission.',
  },
];

export interface TierQualificationInput {
  overallScore: number | null;
  performanceScore: number | null;
  contributionsScore: number | null;
  confidence: ScoreConfidence;
  hasVerifiedActivity: boolean;
  hasSustainedActivity: boolean;
  hasSubstantialImpact: boolean;
  hasUnresolvedSeriousIntegrityIssue: boolean;
  independentVerifiedEvidenceCount?: number;
  scoredCategoryCount?: number;
  establishedCategoryCount?: number;
  hasRecurrence?: boolean;
  timeSpanDays?: number;
  overallStatus?: ScoreMaturityStatus;
  rules?: TierRule[];
}

export interface TierRequirementResult {
  id: string;
  label: string;
  type:
    | 'score'
    | 'category_score'
    | 'confidence'
    | 'verified_activity'
    | 'sustained_activity'
    | 'impact'
    | 'integrity'
    | 'independent_evidence'
    | 'coverage'
    | 'recurrence'
    | 'history';
  currentValue: number | string | boolean | null;
  requiredValue: number | string | boolean | null;
  met: boolean;
  explanation?: string;
}

export interface TierResult {
  baseTier: CivizenTier | null;
  finalTier: CivizenTier | null;
  qualified: boolean;
  unmetRequirements: TierRequirementResult[];
}

export interface TierProgressRequirement {
  id: string;
  label: string;
  currentValue?: number | string | boolean | null;
  requiredValue?: number | string | boolean | null;
  met: boolean;
  explanation?: string;
}

export interface TierProgress {
  currentTier: CivizenTier | null;
  nextTier: CivizenTier | null;
  currentScore: number | null;
  nextTierMinScore: number | null;
  pointsRemaining: number | null;
  requirements: TierProgressRequirement[];
}

export interface CivizenTierStatus {
  scoreState: 'not_scored' | 'scored';
  baseTier: CivizenTier | null;
  finalTier: CivizenTier | null;
  currentScore: number | null;
  confidence: ScoreConfidence;
  qualifiedForBaseTier: boolean;
  unmetRequirements: TierRequirementResult[];
  nextTier: CivizenTier | null;
  nextTierMinScore: number | null;
  pointsToNextTier: number | null;
  progress: TierProgress;
  calculatedAt: string | null;
  rulesVersion: string;
  readiness?: TierReadiness;
}

export interface TierGateState {
  id: string;
  label: string;
  met: boolean;
  detail: string;
}

export interface TierReadiness {
  nextTier: CivizenTier | null;
  scoreThresholdMet: boolean;
  evidenceMet: boolean;
  confidenceMet: boolean;
  coverageMet: boolean;
  historyMet: boolean;
  ready: boolean;
  emphasizePointsToNext: boolean;
  blockingGates: TierGateState[];
  gates: TierGateState[];
}

function ruleFor(id: CivizenTier, rules: TierRule[] = DEFAULT_TIER_RULES): TierRule {
  return rules.find((r) => r.id === id) ?? DEFAULT_TIER_RULES.find((r) => r.id === id)!;
}

export function getTierRule(id: CivizenTier, rules: TierRule[] = DEFAULT_TIER_RULES): TierRule {
  return ruleFor(id, rules);
}

export function getTierLabel(id: CivizenTier, rules: TierRule[] = DEFAULT_TIER_RULES): string {
  return ruleFor(id, rules).label;
}

/** Base tier from overall score only. Null when not yet scored. */
export function getBaseTier(
  score: number | null | undefined,
  rules: TierRule[] = DEFAULT_TIER_RULES,
): CivizenTier | null {
  if (score == null || Number.isNaN(score)) return null;
  const steward = ruleFor('steward', rules);
  const catalyst = ruleFor('catalyst', rules);
  const contributor = ruleFor('contributor', rules);
  const builder = ruleFor('builder', rules);
  if (score >= steward.minScore) return 'steward';
  if (score >= catalyst.minScore) return 'catalyst';
  if (score >= contributor.minScore) return 'contributor';
  if (score >= builder.minScore) return 'builder';
  return 'explorer';
}

function confidenceLabel(value: ScoreConfidence): string {
  switch (value) {
    case 'insufficient':
      return 'Insufficient';
    case 'low':
      return 'Low';
    case 'moderate':
      return 'Moderate';
    case 'high':
      return 'High';
    case 'very_high':
      return 'Very High';
  }
}

function meetsConfidence(
  current: ScoreConfidence,
  required: ScoreConfidence | undefined,
): boolean {
  if (!required) return true;
  return CONFIDENCE_RANK[current] >= CONFIDENCE_RANK[required];
}

export function getUnmetRequirements(
  tier: CivizenTier,
  input: TierQualificationInput,
): TierRequirementResult[] {
  const rules = input.rules ?? DEFAULT_TIER_RULES;
  const rule = ruleFor(tier, rules);
  const unmet: TierRequirementResult[] = [];

  if (input.overallScore == null) {
    unmet.push({
      id: 'overall_score',
      label: 'Overall score',
      type: 'score',
      currentValue: null,
      requiredValue: rule.minScore,
      met: false,
      explanation: 'A numerical Civizen Score is required before a tier can be assigned.',
    });
    return unmet;
  }

  if (input.overallScore < rule.minScore) {
    unmet.push({
      id: 'overall_score',
      label: 'Overall score',
      type: 'score',
      currentValue: input.overallScore,
      requiredValue: rule.minScore,
      met: false,
      explanation: `Overall score must reach ${rule.minScore}.`,
    });
  }

  if (rule.minPerformanceScore != null) {
    const current = input.performanceScore;
    const met = current != null && current >= rule.minPerformanceScore;
    if (!met) {
      unmet.push({
        id: 'performance_score',
        label: 'Performance score',
        type: 'category_score',
        currentValue: current,
        requiredValue: rule.minPerformanceScore,
        met: false,
        explanation: `Performance must reach ${rule.minPerformanceScore} for ${rule.label}.`,
      });
    }
  }

  if (rule.minContributionsScore != null) {
    const current = input.contributionsScore;
    const met = current != null && current >= rule.minContributionsScore;
    if (!met) {
      unmet.push({
        id: 'contributions_score',
        label: 'Contributions score',
        type: 'category_score',
        currentValue: current,
        requiredValue: rule.minContributionsScore,
        met: false,
        explanation: `Contributions must reach ${rule.minContributionsScore} for ${rule.label}.`,
      });
    }
  }

  if (rule.minConfidence && !meetsConfidence(input.confidence, rule.minConfidence)) {
    unmet.push({
      id: 'confidence',
      label: 'Score confidence',
      type: 'confidence',
      currentValue: confidenceLabel(input.confidence),
      requiredValue: confidenceLabel(rule.minConfidence),
      met: false,
      explanation: `Score confidence must be ${confidenceLabel(rule.minConfidence)} or higher.`,
    });
  }

  if (rule.requiresVerifiedActivity && !input.hasVerifiedActivity) {
    unmet.push({
      id: 'verified_activity',
      label: 'Verified activity',
      type: 'verified_activity',
      currentValue: false,
      requiredValue: true,
      met: false,
      explanation: `Verified activity required for ${rule.label}.`,
    });
  }

  if (rule.minIndependentVerifiedEvidence != null) {
    const current = input.independentVerifiedEvidenceCount ?? 0;
    if (current < rule.minIndependentVerifiedEvidence) {
      unmet.push({
        id: 'independent_evidence',
        label: 'Independent verified evidence',
        type: 'independent_evidence',
        currentValue: current,
        requiredValue: rule.minIndependentVerifiedEvidence,
        met: false,
        explanation: `${rule.label} needs ${rule.minIndependentVerifiedEvidence} independent verified evidence items, not projections of the same activity.`,
      });
    }
  }

  if (rule.minScoredCategories != null) {
    const current = Math.max(input.scoredCategoryCount ?? 0, input.establishedCategoryCount ?? 0);
    if (current < rule.minScoredCategories) {
      unmet.push({
        id: 'coverage',
        label: 'Category coverage',
        type: 'coverage',
        currentValue: current,
        requiredValue: rule.minScoredCategories,
        met: false,
        explanation: `${rule.label} needs evidence in at least ${rule.minScoredCategories} score ${rule.minScoredCategories === 1 ? 'category' : 'categories'}.`,
      });
    }
  }

  if (rule.requiresRecurrence && !input.hasRecurrence) {
    unmet.push({
      id: 'recurrence',
      label: 'Recurrence',
      type: 'recurrence',
      currentValue: false,
      requiredValue: true,
      met: false,
      explanation: `${rule.label} needs more than one independent activity.`,
    });
  }

  if (rule.minTimeSpanDays != null && rule.minTimeSpanDays > 0) {
    const current = input.timeSpanDays ?? 0;
    if (current < rule.minTimeSpanDays) {
      unmet.push({
        id: 'history',
        label: 'History / time span',
        type: 'history',
        currentValue: current,
        requiredValue: rule.minTimeSpanDays,
        met: false,
        explanation: `${rule.label} needs a longer demonstrated history.`,
      });
    }
  }

  if (rule.requiresSustainedActivity && !input.hasSustainedActivity) {
    unmet.push({
      id: 'sustained_activity',
      label: 'Sustained verified activity',
      type: 'sustained_activity',
      currentValue: false,
      requiredValue: true,
      met: false,
      explanation: `Sustained verified activity required for ${rule.label}.`,
    });
  }

  if (rule.requiresSubstantialImpact && !input.hasSubstantialImpact) {
    unmet.push({
      id: 'substantial_impact',
      label: 'Substantial verified impact',
      type: 'impact',
      currentValue: false,
      requiredValue: true,
      met: false,
      explanation: `Substantial verified impact required for ${rule.label}.`,
    });
  }

  if (rule.requiresNoSeriousIntegrityIssue && input.hasUnresolvedSeriousIntegrityIssue) {
    unmet.push({
      id: 'integrity',
      label: 'Integrity standing',
      type: 'integrity',
      currentValue: false,
      requiredValue: true,
      met: false,
      explanation: `${rule.label} requires no unresolved serious integrity issue.`,
    });
  }

  if (tier !== 'explorer' && input.overallStatus && input.overallStatus !== 'established') {
    unmet.push({
      id: 'score_maturity',
      label: 'Established Civizen Score',
      type: 'score',
      currentValue: input.overallStatus,
      requiredValue: 'established',
      met: false,
      explanation: 'A provisional estimate cannot unlock this tier.',
    });
  }

  return unmet;
}

export function meetsTierRequirements(
  tier: CivizenTier,
  input: TierQualificationInput,
): boolean {
  if (input.overallScore == null) return false;
  const rules = input.rules ?? DEFAULT_TIER_RULES;
  const rule = ruleFor(tier, rules);
  if (input.overallScore < rule.minScore) return false;
  return getUnmetRequirements(tier, input).length === 0;
}

export function determineFinalTier(input: TierQualificationInput): TierResult {
  if (input.overallScore == null) {
    // Display Explorer while numerical score is still establishing — not a silent void.
    return {
      baseTier: 'explorer',
      finalTier: 'explorer',
      qualified: false,
      unmetRequirements: getUnmetRequirements('explorer', input),
    };
  }

  const rules = input.rules ?? DEFAULT_TIER_RULES;
  const baseTier = getBaseTier(input.overallScore, rules)!;
  const baseTierIndex = CIVIZEN_TIERS_DESCENDING.indexOf(baseTier);

  for (let i = baseTierIndex; i < CIVIZEN_TIERS_DESCENDING.length; i++) {
    const tier = CIVIZEN_TIERS_DESCENDING[i];
    if (meetsTierRequirements(tier, input)) {
      return {
        baseTier,
        finalTier: tier,
        qualified: tier === baseTier,
        unmetRequirements: tier === baseTier ? [] : getUnmetRequirements(baseTier, input),
      };
    }
  }

  return {
    baseTier,
    finalTier: 'explorer',
    qualified: baseTier === 'explorer',
    unmetRequirements: getUnmetRequirements(baseTier, input),
  };
}

function nextTierAfter(tier: CivizenTier | null): CivizenTier | null {
  if (!tier) return 'explorer';
  const index = CIVIZEN_TIERS.indexOf(tier);
  if (index < 0 || index >= CIVIZEN_TIERS.length - 1) return null;
  return CIVIZEN_TIERS[index + 1];
}

export function buildTierProgress(
  input: TierQualificationInput,
  finalTier: CivizenTier | null,
): TierProgress {
  const rules = input.rules ?? DEFAULT_TIER_RULES;
  const nextTier = nextTierAfter(finalTier);
  const currentScore = input.overallScore;
  /** Treat unscored profiles as 0 for progress-to-Builder messaging. */
  const effectiveScore = currentScore ?? 0;

  if (!nextTier) {
    return {
      currentTier: finalTier,
      nextTier: null,
      currentScore,
      nextTierMinScore: null,
      pointsRemaining: null,
      requirements: [],
    };
  }

  const nextRule = ruleFor(nextTier, rules);
  const pointsRemaining = Math.max(0, Math.round((nextRule.minScore - effectiveScore) * 10) / 10);

  const requirements: TierProgressRequirement[] = [
    {
      id: 'overall_score',
      label: 'Overall score',
      currentValue: currentScore,
      requiredValue: nextRule.minScore,
      met: currentScore != null && currentScore >= nextRule.minScore,
    },
  ];

  if (input.overallStatus != null && nextTier !== 'explorer') {
    requirements.push({
      id: 'score_maturity',
      label: 'Established Civizen Score',
      currentValue: input.overallStatus,
      requiredValue: 'established',
      met: input.overallStatus === 'established',
      explanation: 'A provisional estimate cannot unlock this tier.',
    });
  }

  if (nextRule.minPerformanceScore != null) {
    const current = input.performanceScore;
    requirements.push({
      id: 'performance',
      label: 'Performance score',
      currentValue: current,
      requiredValue: nextRule.minPerformanceScore,
      met: current != null && current >= nextRule.minPerformanceScore,
    });
  }

  if (nextRule.minContributionsScore != null) {
    const current = input.contributionsScore;
    requirements.push({
      id: 'contributions',
      label: 'Contributions score',
      currentValue: current,
      requiredValue: nextRule.minContributionsScore,
      met: current != null && current >= nextRule.minContributionsScore,
    });
  }

  if (nextRule.minConfidence) {
    requirements.push({
      id: 'confidence',
      label: 'Score confidence',
      currentValue: confidenceLabel(input.confidence),
      requiredValue: confidenceLabel(nextRule.minConfidence),
      met: meetsConfidence(input.confidence, nextRule.minConfidence),
    });
  }

  if (nextRule.requiresVerifiedActivity) {
    requirements.push({
      id: 'verified_activity',
      label: 'Verified activity',
      currentValue: input.hasVerifiedActivity,
      requiredValue: true,
      met: input.hasVerifiedActivity,
    });
  }

  if (nextRule.minIndependentVerifiedEvidence != null) {
    const current = input.independentVerifiedEvidenceCount ?? 0;
    requirements.push({
      id: 'independent_evidence',
      label: 'Independent verified evidence',
      currentValue: current,
      requiredValue: nextRule.minIndependentVerifiedEvidence,
      met: current >= nextRule.minIndependentVerifiedEvidence,
    });
  }

  if (nextRule.minScoredCategories != null) {
    const current = Math.max(input.scoredCategoryCount ?? 0, input.establishedCategoryCount ?? 0);
    requirements.push({
      id: 'coverage',
      label: 'Category coverage',
      currentValue: current,
      requiredValue: nextRule.minScoredCategories,
      met: current >= nextRule.minScoredCategories,
    });
  }

  if (nextRule.requiresRecurrence) {
    requirements.push({
      id: 'recurrence',
      label: 'Recurrence',
      currentValue: Boolean(input.hasRecurrence),
      requiredValue: true,
      met: Boolean(input.hasRecurrence),
    });
  }

  if (nextRule.minTimeSpanDays != null && nextRule.minTimeSpanDays > 0) {
    const current = input.timeSpanDays ?? 0;
    requirements.push({
      id: 'history',
      label: 'History / time span',
      currentValue: current,
      requiredValue: nextRule.minTimeSpanDays,
      met: current >= nextRule.minTimeSpanDays,
    });
  }

  if (nextRule.requiresSustainedActivity) {
    requirements.push({
      id: 'sustained_activity',
      label: 'Sustained verified activity',
      currentValue: input.hasSustainedActivity,
      requiredValue: true,
      met: input.hasSustainedActivity,
    });
  }

  if (nextRule.requiresSubstantialImpact) {
    requirements.push({
      id: 'substantial_impact',
      label: 'Substantial verified impact',
      currentValue: input.hasSubstantialImpact,
      requiredValue: true,
      met: input.hasSubstantialImpact,
    });
  }

  if (nextRule.requiresNoSeriousIntegrityIssue) {
    requirements.push({
      id: 'integrity',
      label: 'No unresolved serious integrity issue',
      currentValue: !input.hasUnresolvedSeriousIntegrityIssue,
      requiredValue: true,
      met: !input.hasUnresolvedSeriousIntegrityIssue,
    });
  }

  return {
    currentTier: finalTier,
    nextTier,
    currentScore,
    nextTierMinScore: nextRule.minScore,
    pointsRemaining,
    requirements,
  };
}

export function buildTierReadiness(
  input: TierQualificationInput,
  progress: TierProgress,
): TierReadiness {
  const gates: TierGateState[] = progress.requirements.map((req) => ({
    id: req.id,
    label: req.label,
    met: req.met,
    detail:
      req.met
        ? 'Met'
        : req.id === 'overall_score'
          ? 'Numerical score condition not yet met'
          : req.id === 'score_maturity'
            ? 'A provisional estimate cannot unlock this tier'
            : req.id === 'independent_evidence'
            ? 'Needs more independent history'
            : req.id === 'confidence'
              ? `Confidence: ${String(req.currentValue ?? 'Low')}`
              : req.id === 'coverage'
                ? 'Coverage is insufficient'
                : 'Not met',
  }));
  const scoreGate = gates.find((gate) => gate.id === 'overall_score');
  const evidenceGate = gates.find((gate) => gate.id === 'independent_evidence' || gate.id === 'verified_activity');
  const confidenceGate = gates.find((gate) => gate.id === 'confidence');
  const coverageGate = gates.find((gate) => gate.id === 'coverage');
  const historyGate = gates.find((gate) => gate.id === 'history' || gate.id === 'recurrence' || gate.id === 'sustained_activity');
  const nonScoreGates = gates.filter((gate) => gate.id !== 'overall_score');
  const blockingGates = gates.filter((gate) => !gate.met);
  const emphasizePointsToNext = Boolean(
    progress.nextTier &&
      nonScoreGates.length > 0 &&
      nonScoreGates.every((gate) => gate.met) &&
      scoreGate &&
      !scoreGate.met,
  );

  return {
    nextTier: progress.nextTier,
    scoreThresholdMet: scoreGate?.met ?? false,
    evidenceMet: evidenceGate?.met ?? true,
    confidenceMet: confidenceGate?.met ?? true,
    coverageMet: coverageGate?.met ?? true,
    historyMet: historyGate?.met ?? true,
    ready: blockingGates.length === 0 && progress.nextTier != null,
    emphasizePointsToNext,
    blockingGates,
    gates,
  };
}

export function calculateTierStatus(
  input: TierQualificationInput,
  calculatedAt: string | null = null,
): CivizenTierStatus {
  const result = determineFinalTier(input);
  const progress = buildTierProgress(input, result.finalTier);
  const readiness = buildTierReadiness(input, progress);

  return {
    scoreState: input.overallScore == null ? 'not_scored' : 'scored',
    baseTier: result.baseTier,
    finalTier: result.finalTier,
    currentScore: input.overallScore,
    confidence: input.confidence,
    qualifiedForBaseTier: result.qualified,
    unmetRequirements: result.unmetRequirements,
    nextTier: progress.nextTier,
    nextTierMinScore: progress.nextTierMinScore,
    pointsToNextTier: progress.pointsRemaining,
    progress,
    calculatedAt,
    rulesVersion: TIER_RULES_VERSION,
    readiness,
  };
}

export function getTierColorHex(
  tier: CivizenTier | null | undefined,
  rules: TierRule[] = DEFAULT_TIER_RULES,
): string {
  if (!tier) return TIER_COLORS.explorer;
  return ruleFor(tier, rules).colorHex;
}

/** Developmental score color — never red solely because the score is low. */
export function getDevelopmentalScoreColor(
  score: number | null | undefined,
  tier: CivizenTier | null = null,
): string {
  if (tier) return ruleFor(tier).accentClass;
  if (score == null) return ruleFor('explorer').accentClass;
  if (score < 30) return ruleFor('explorer').accentClass;
  if (score < 60) return ruleFor('builder').accentClass;
  if (score < 75) return ruleFor('contributor').accentClass;
  if (score < 85) return ruleFor('catalyst').accentClass;
  return ruleFor('steward').accentClass;
}

/** Integer percent for dial / battery-style progress (null → 0). */
export function formatScorePercent(score: number | null | undefined): string {
  if (score == null || Number.isNaN(score)) return '0%';
  return `${Math.round(Math.min(100, Math.max(0, score)))}%`;
}

export const TIER_PROGRESSION_PHRASE = 'Explore. Build. Contribute. Catalyze. Steward.';
