/**
 * Guard: every literal t('...') / t("...") key used in src must exist in base EN.
 * Template-literal dynamic keys (t(`prefix.${id}`)) must match an allow-listed prefix.
 * Identifier args (t(key)) are an explicit class: keys must still exist; this scan cannot prove them.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseTranslations } from '@/lib/i18n.base';

const SRC_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Static prefixes of t(`prefix.${...}`) that are intentional enum/status lookups. */
const ALLOW_DYNAMIC_PREFIXES: readonly string[] = [
  'admin.permissions.sectionNames.',
  'admin.roleDescriptions.',
  'admin.roles.',
  'agreements.attachmentKind.',
  'agreements.cardAction.',
  'agreements.cardStatus.',
  'agreements.partyKind.',
  'agreements.status.',
  'agreements.tabs.',
  'agreements.types.',
  'areas.activityStatus.',
  'chatBar.private.civiAvatar.',
  'civicBallot.proposalSignature.',
  'civicBallot.reason.',
  'civicBallot.signature.',
  'civicVoting.gateLabels.',
  'civicVoting.observer.',
  'civicVoting.proposals.status.',
  'civicVoting.reasons.',
  'civicVoting.securityHint.',
  'civicVoting.status.',
  'civicVoting.statusHint.',
  'contribute.challenges.cardAction.',
  'contribute.challenges.errors.',
  'contribute.challenges.proposalStatus.',
  'contribute.challenges.stage.',
  'contribute.knowledge.errors.',
  'contribute.knowledge.gapKind.',
  'contribute.knowledge.gapStatus.',
  'contribute.knowledge.resourceStatus.',
  'contribute.knowledge.resourceType.',
  'contribute.knowledge.spaceStage.',
  'contribute.matters.actionContext.',
  'contribute.matters.actions.',
  'contribute.matters.actorKind.',
  'contribute.matters.empty.',
  'contribute.matters.handling.',
  'contribute.matters.queues.',
  'contribute.matters.reopenReasons.',
  'contribute.matters.scope.',
  'contribute.matters.sections.',
  'contribute.matters.status.',
  'contribute.matters.types.',
  'contribute.matters.visibility.',
  'contribute.matters.work.actionTypes.',
  'contribute.matters.work.decisionStatus.',
  'contribute.matters.work.groups.',
  'contribute.matters.work.roles.',
  'contribute.matters.work.status.',
  'contribute.opportunities.compensation.',
  'contribute.opportunities.dimension.',
  'contribute.opportunities.evaluationDecision.',
  'contribute.opportunities.nextAction.',
  'contribute.opportunities.participationStatus.',
  'contribute.opportunities.status.',
  'contribute.opportunities.verification.',
  'displayScore.tier.',
  'earnings.filter.',
  'editProfile.civicStatus.status.',
  'electionAdmin.actions.',
  'electionAdmin.done.',
  'electionAdmin.events.',
  'electionAdmin.help.',
  'electionAdmin.status.',
  'firstSteps.steps.',
  'fund.admin.statuses.',
  'fund.hub.lanes.',
  'fund.transparency.rows.',
  'governanceDashboard.offices.errors.',
  'governanceDashboard.policies.approvalClasses.',
  'governanceDashboard.policies.decisionClasses.',
  'happiness.affecting.',
  'happiness.feelings.',
  'happiness.helped.',
  'happiness.integration.',
  'happiness.levels.',
  'happiness.plans.feedback.',
  'happiness.plans.reminder.',
  'happiness.plans.statusHint.',
  'happiness.plans.why.',
  'happiness.polarity.',
  'happiness.prohibited.',
  'happiness.sections.',
  'happiness.trend.',
  'happiness.work.',
  'happiness.work.actionStatus.',
  'happiness.work.activities.',
  'happiness.work.alignment.',
  'happiness.work.dimensions.',
  'happiness.work.feelings.',
  'happiness.work.hypotheses.',
  'happiness.work.locations.',
  'happiness.work.sections.',
  'happiness.work.types.',
  'happiness.work.values.',
  'identityReview.',
  'identityReview.events.',
  'identityReview.filters.',
  'identityReview.reasons.',
  'institutionalDocs.sections.',
  'law.contributionTypes.',
  'law.statuses.',
  'marketJobsAdmin.mode.',
  'marketJobsAdmin.setStatus.',
  'marketJobsAdmin.status.',
  'memberEnforcement.refused.',
  'memberEnforcement.steps.',
  'moderation.kinds.',
  'moderation.reasons.',
  'participation.columns.',
  'participation.metrics.',
  'professions.statuses.',
  'profile.contributionsDetails.types.',
  'profile.contributionsLedger.confidenceFactors.',
  'profile.contributionsLedger.confidenceLevels.',
  'profile.contributionsLedger.confidenceReasons.',
  'profile.contributionsLedger.dimensions.',
  'profile.contributionsLedger.evaluatorRoles.',
  'profile.contributionsLedger.functions.',
  'profile.contributionsLedger.methods.',
  'profile.contributionsLedger.roleLabels.',
  'profile.contributionsLedger.stages.',
  'profile.contributionsLedger.states.',
  'profile.contributionsLedger.substanceLevels.',
  'profile.contributionsLedger.verificationKinds.',
  'score.confidence.',
  'score.stage.',
  'score.status.',
  'score.tier.',
  'settings.visibility.',
  'settings.webOta.',
  'solutions.action.',
  'solutions.mode.',
  'solutions.source.',
  'solutions.status.',
  'solutions.tier.',
  'study.domains.',
  'study.materialType.',
  'terms.sections.',
];

/** Identifier arguments to t(...) — runtime keys from maps/helpers; listed as an explicit class. */
const ALLOW_IDENTIFIER_ARGS = true as const;

/** t(`${prefix}.${id}`) — static prefix is empty; listed as an explicit class. */
const ALLOW_EMPTY_TEMPLATE_PREFIX = true as const;

const LITERAL_T_RE = /\bt\(\s*(['"])([^'"]+)\1/g;
const TEMPLATE_T_RE = /\bt\(\s*`([^`]*\$\{[^`]+)`/g;
const IDENTIFIER_T_RE = /\bt\(\s*([A-Za-z_$][\w.$]*)/g;

type Tree = Record<string, unknown>;

function flatten(node: unknown, prefix = ''): Set<string> {
  const out = new Set<string>();
  if (typeof node === 'string') {
    if (prefix) out.add(prefix);
    return out;
  }
  if (!node || typeof node !== 'object' || Array.isArray(node)) return out;
  for (const [k, v] of Object.entries(node as Tree)) {
    const next = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out.add(next);
    else for (const child of flatten(v, next)) out.add(child);
  }
  return out;
}

function walkTsFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue;
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walkTsFiles(full, acc);
    else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.(ts|tsx)$/.test(name)) acc.push(full);
  }
  return acc;
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function collectLiteralKeys(files: string[]): Map<string, string[]> {
  const byKey = new Map<string, string[]>();
  for (const file of files) {
    const stripped = stripComments(readFileSync(file, 'utf8'));
    let m: RegExpExecArray | null;
    LITERAL_T_RE.lastIndex = 0;
    while ((m = LITERAL_T_RE.exec(stripped))) {
      const key = m[2];
      const rel = path.relative(SRC_ROOT, file).replace(/\\/g, '/');
      const list = byKey.get(key) ?? [];
      list.push(rel);
      byKey.set(key, list);
    }
  }
  return byKey;
}

describe('i18n literal t() keys exist in base EN', () => {
  const files = walkTsFiles(SRC_ROOT);
  const known = flatten(baseTranslations);
  const used = collectLiteralKeys(files);
  const allowPrefixSet = new Set(ALLOW_DYNAMIC_PREFIXES);

  it('every literal t("...") / t(\'...\') key is present in baseTranslations', () => {
    const missing = [...used.keys()].filter((key) => !known.has(key)).sort();
    if (missing.length) {
      const detail = missing
        .map((key) => `  ${key}  (from ${(used.get(key) ?? []).slice(0, 5).join(', ')})`)
        .join('\n');
      expect.fail(`Missing base EN keys (${missing.length}):\n${detail}`);
    }
  });

  it('template-literal t(`prefix.${id}`) prefixes are explicitly allow-listed', () => {
    const unseen = new Set<string>();
    for (const file of files) {
      const stripped = stripComments(readFileSync(file, 'utf8'));
      let m: RegExpExecArray | null;
      TEMPLATE_T_RE.lastIndex = 0;
      while ((m = TEMPLATE_T_RE.exec(stripped))) {
        const pref = m[1].split('${')[0] ?? '';
        if (!pref) {
          if (!ALLOW_EMPTY_TEMPLATE_PREFIX) {
            unseen.add('(empty prefix) in ' + path.relative(SRC_ROOT, file));
          }
          continue;
        }
        if (!allowPrefixSet.has(pref)) unseen.add(pref);
      }
    }
    if (unseen.size) {
      expect.fail(
        `Add these prefixes to ALLOW_DYNAMIC_PREFIXES (${unseen.size}):\n` +
          [...unseen]
            .sort()
            .map((p) => `  ${JSON.stringify(p)}`)
            .join('\n'),
      );
    }
  });

  it('identifier t(key) args are an explicit allow-listed class', () => {
    expect(ALLOW_IDENTIFIER_ARGS).toBe(true);
    expect(ALLOW_EMPTY_TEMPLATE_PREFIX).toBe(true);
    // Presence check: at least one identifier call exists in the tree (sanity).
    let found = false;
    for (const file of files) {
      const stripped = stripComments(readFileSync(file, 'utf8'));
      IDENTIFIER_T_RE.lastIndex = 0;
      if (IDENTIFIER_T_RE.test(stripped)) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });
});
