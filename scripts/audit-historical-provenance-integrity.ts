#!/usr/bin/env node
/**
 * Integrity audit of reconstruction vs persisted historical roots.
 * Read-only. Does not mint roots or edit Score V2 formulas.
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import {
  groupDevelopmentStoriesToContributions,
  storyFromDevelopmentRow,
  type DevelopmentStoryEvidenceInput,
} from '../src/lib/civizen-development-evidence.ts';
import {
  historicalStoriesForEvaluation,
  qualifyingHistoricalOutcomes,
  reconstructHistoricalDevelopmentOutcomes,
  refreshImplementationStories,
  type HistoricalCommit,
} from '../src/lib/civizen-historical-reconstruction.ts';
import {
  classifyHumanProvenanceText,
  isChatProvenance,
} from '../src/lib/civizen-contribution-provenance.ts';
import { auditHumanJournalProvenance, contributionBearingAttachment } from '../src/lib/civizen-contribution-provenance-audit.ts';
import { classifyUnpersistedCluster, inheritCanonicalProvenance, unmatchedPersistedRoots } from '../src/lib/civizen-contribution-integrity.ts';
import { evaluateContributionLifecycle } from '../src/lib/civizen-contribution-lifecycle.ts';
import { scoreContributionsFromEvents } from '../src/lib/civizen-contribution-score.ts';
import { involvementFromStories } from '../src/lib/civizen-contribution-provenance.ts';

function loadEnv() {
  try {
    for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match || process.env[match[1]!]) continue;
      process.env[match[1]!] = match[2]!.replace(/^['"]|['"]$/g, '');
    }
  } catch { /* optional */ }
}

function gitCommits(): HistoricalCommit[] {
  const raw = execSync('git log --pretty=format:%H%x1f%aI%x1f%s%x1e --name-only', { encoding: 'utf8' });
  const commits: HistoricalCommit[] = [];
  let current: HistoricalCommit | null = null;
  for (const line of raw.split('\n')) {
    if (line.includes('\x1f')) {
      const [sha, authoredAt, subject] = line.split('\x1e').join('').split('\x1f');
      current = { sha: sha!, authoredAt: authoredAt!, subject: subject!, files: [] };
      commits.push(current);
    } else if (line.trim() && current) current.files.push(line.trim());
  }
  return commits;
}

function remotePsql(sql: string): string {
  const host = process.env.REMOTE_DB_HOST;
  const dir = process.env.REMOTE_DOCKER_DIR;
  if (!host || !dir) throw new Error('REMOTE_DB_HOST and REMOTE_DOCKER_DIR are required');
  return execSync(
    `ssh -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=15 ${host} "cd ${dir} && sudo docker compose exec -T db psql -v ON_ERROR_STOP=1 -U postgres -d postgres -t -A"`,
    { input: sql, encoding: 'utf8', maxBuffer: 80_000_000 },
  ).trim();
}

function asPaths(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function asShas(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

loadEnv();
const commits = gitCommits();
const survivingPaths = execSync('git ls-tree -r --name-only HEAD', { encoding: 'utf8' }).split('\n').filter(Boolean);
const journal = (JSON.parse(remotePsql(`
  SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json) FROM (
    SELECT id, source_story_key, source, source_type, status, title, original_instruction,
           rephrased_description, created_features, area, commit_sha, pr_number, reviewed_by,
           chat_id, requested_at, created_at, metadata, author_id
    FROM public.development_stories
    WHERE source IN ('git','chat') OR source_type IN ('git','chat')
    ORDER BY requested_at NULLS LAST
  ) s;
`)) as Record<string, unknown>[]).map((row) => storyFromDevelopmentRow(row));

const existingEvents = JSON.parse(remotePsql(`
  SELECT COALESCE(json_agg(json_build_object(
    'source_id', source_id, 'title', title, 'raw_meta', raw_meta, 'verified', verified, 'occurred_at', occurred_at
  )), '[]'::json)
  FROM public.profile_contribution_events
  WHERE source_table = 'development_stories' AND verified = true;
`)) as Array<{ source_id: string; title: string; raw_meta: Record<string, unknown>; verified: boolean; occurred_at: string }>;

const reconstructed = reconstructHistoricalDevelopmentOutcomes({ commits, stories: journal, survivingPaths });
const existingForInherit = existingEvents.map((item) => ({
  sourceId: item.source_id,
  title: item.title,
  affectedPaths: asPaths(item.raw_meta.affectedPaths),
  commitShas: asShas(item.raw_meta.commitShas),
}));
const existingRootIds = existingEvents.map((item) => item.source_id.replace(/^outcome:/, ''));
const humanStoryIds = new Set(
  journal.filter((story) => isChatProvenance(story) || (story.source ?? story.sourceType) === 'chat')
    .map((story) => story.id || story.sourceStoryKey || '')
    .filter(Boolean),
);
const bearingBefore = contributionBearingAttachment({
  stories: journal,
  outcomes: reconstructed.outcomes,
  existingRootIds,
});
inheritCanonicalProvenance(reconstructed.outcomes, existingForInherit, humanStoryIds);
reconstructed.outcomes.splice(0, reconstructed.outcomes.length, ...refreshImplementationStories(reconstructed.outcomes, journal));
const qualifying = qualifyingHistoricalOutcomes(reconstructed.outcomes);
const grouped = groupDevelopmentStoriesToContributions(historicalStoriesForEvaluation(qualifying, journal));
const existing = existingForInherit;
const existingIds = new Set(existing.map((item) => item.sourceId));
const novel = grouped.filter((item) => !existingIds.has(item.sourceId));
const novelOutcomes = qualifying.filter((item) => !existingIds.has(`outcome:${item.outcomeRootId}`));
const clusterRows = novelOutcomes.map((item) => {
  const classified = classifyUnpersistedCluster({
    outcomeRootId: item.outcomeRootId,
    title: item.title,
    affectedPaths: item.affectedPaths,
    commitShas: item.commitShas,
    result: item.result,
    contributionEvidenceConfidence: item.contributionEvidenceConfidence,
    attributionConfidence: item.attributionConfidence,
    survivingImplementation: item.survivingImplementation,
    testsPassed: item.testsPassed,
  }, existing);
  return { title: item.title, sourceId: `outcome:${item.outcomeRootId}`, ...classified, result: item.result, confidence: item.contributionEvidenceConfidence, paths: item.affectedPaths.slice(0, 6) };
});
const reasonCounts: Record<string, number> = {};
for (const row of clusterRows) reasonCounts[row.reason] = (reasonCounts[row.reason] ?? 0) + 1;

const unmatched = unmatchedPersistedRoots(existing, grouped.map((item) => item.sourceId));
const chats = journal.filter((story) => isChatProvenance(story) || (story.source ?? story.sourceType) === 'chat');
const attached = new Map<string, string>();
for (const outcome of reconstructed.outcomes) {
  for (const id of outcome.storyIds) attached.set(id, outcome.outcomeRootId);
}
const persistedRoots = new Set(existing.map((item) => item.sourceId.replace(/^outcome:/, '')));
const funnel = {
  humanChat: chats.length,
  processCasual: 0,
  informationOnly: 0,
  contributionBearing: 0,
  ambiguous: 0,
  attachedPersisted: 0,
  attachedNonPersisted: 0,
  journalOnly: 0,
  bearingAttachedPersisted: 0,
  bearingAttachedNonPersisted: 0,
  bearingNoOutcome: 0,
};
for (const story of chats) {
  const instruction = story.originalInstruction || story.title || '';
  const disposition = classifyHumanProvenanceText(instruction).disposition;
  const bearing = disposition === 'contribution_bearing';
  if (disposition === 'process_casual') funnel.processCasual += 1;
  else if (disposition === 'information_only') funnel.informationOnly += 1;
  else if (bearing) funnel.contributionBearing += 1;
  else funnel.ambiguous += 1;
  const root = attached.get(story.id || story.sourceStoryKey || '');
  if (root && persistedRoots.has(root)) {
    funnel.attachedPersisted += 1;
    if (bearing) funnel.bearingAttachedPersisted += 1;
  } else if (root) {
    funnel.attachedNonPersisted += 1;
    if (bearing) funnel.bearingAttachedNonPersisted += 1;
  } else {
    funnel.journalOnly += 1;
    if (bearing) funnel.bearingNoOutcome += 1;
  }
}

const matching = grouped.filter((item) => existingIds.has(item.sourceId));
const existingById = new Map(existingEvents.map((item) => [item.source_id, item]));
const shifts = matching.map((item) => {
  const previous = existingById.get(item.sourceId)!;
  const oldView = evaluateContributionLifecycle({
    profileId: 'preview', sourceTable: 'development_stories', sourceId: item.sourceId,
    eventType: 'development_story', title: previous.title, summary: null,
    capacityEstimate: 78, impactEstimate: 78, collaborationEstimate: 35, beneficiaryEstimate: 75,
    verified: true, occurredAt: previous.occurred_at, rawMeta: previous.raw_meta,
  });
  const nextMeta = {
    eligibility: item.eligibility,
    provenanceCount: item.provenanceStoryIds.length,
    provenanceStoryIds: item.provenanceStoryIds,
    humanInvolvement: involvementFromStories(journal.filter((story) =>
      item.provenanceStoryIds.includes(story.id || story.sourceStoryKey || ''),
    )),
    reconstruction: true,
    testsPassed: item.testsPassed,
    contributionFunction: item.contributionFunction,
    affectedPaths: item.affectedPaths,
    reconstructionResult: item.reconstructionResult,
    survivingImplementation: item.survivingImplementation,
    contributionRoles: item.roles,
    implementationAssisted: item.implementationAssisted,
    instruction: item.instruction,
    linkedInstructions: item.linkedInstructions,
  };
  const nextView = evaluateContributionLifecycle({
    profileId: 'preview', sourceTable: 'development_stories', sourceId: item.sourceId,
    eventType: 'development_story', title: item.title, summary: null,
    capacityEstimate: 78, impactEstimate: 78, collaborationEstimate: 35, beneficiaryEstimate: 75,
    verified: true, occurredAt: item.occurredAt, rawMeta: nextMeta,
  });
  const chatIds = item.provenanceStoryIds.filter((id) => {
    const story = journal.find((row) => (row.id || row.sourceStoryKey) === id);
    return story ? isChatProvenance(story) || (story.source ?? story.sourceType) === 'chat' : false;
  });
  const chatDispositions = chatIds.map((id) => {
    const story = journal.find((row) => (row.id || row.sourceStoryKey) === id);
    return classifyHumanProvenanceText(story?.originalInstruction || story?.title || '').disposition;
  });
  return {
    title: item.title,
    oldObservation: oldView.observation,
    newObservation: nextView.observation,
    oldSubstance: oldView.humanSubstance?.level,
    newSubstance: nextView.humanSubstance?.level,
    oldRoles: oldView.roles,
    newRoles: nextView.roles,
    actionRolesAdded: nextView.roles.filter((role) => !oldView.roles.includes(role) && role !== 'founder'),
    chatBearing: chatDispositions.filter((item) => item === 'contribution_bearing').length,
    chatAmbiguous: chatDispositions.filter((item) => item === 'ambiguous').length,
    shifted: oldView.observation !== nextView.observation || oldView.humanSubstance?.level !== nextView.humanSubstance?.level,
    observationDependsOnAmbiguityAlone:
      chatDispositions.length > 0
      && chatDispositions.every((item) => item === 'ambiguous')
      && oldView.observation !== nextView.observation,
  };
});

const rootChat = matching.map((item) => {
  const chatsForRoot = item.provenanceStoryIds.map((id) => journal.find((row) => (row.id || row.sourceStoryKey) === id)).filter(Boolean) as DevelopmentStoryEvidenceInput[];
  const human = chatsForRoot.filter((story) => isChatProvenance(story) || (story.source ?? story.sourceType) === 'chat');
  const dispositions = human.map((story) => classifyHumanProvenanceText(story.originalInstruction || story.title || '').disposition);
  const bearing = dispositions.filter((item) => item === 'contribution_bearing').length;
  const ambiguous = dispositions.filter((item) => item === 'ambiguous').length;
  return {
    title: item.title,
    bearing,
    ambiguous,
    onlyAmbiguous: bearing === 0 && ambiguous > 0,
    bearingPresent: bearing > 0,
  };
});

const currentScore = scoreContributionsFromEvents(existingEvents.map((item) => ({
  profileId: 'preview', sourceTable: 'development_stories', sourceId: item.source_id,
  eventType: 'development_story' as const, title: item.title, summary: null,
  capacityEstimate: 78, impactEstimate: 78, collaborationEstimate: 35, beneficiaryEstimate: 75,
  verified: true, occurredAt: item.occurred_at, rawMeta: item.raw_meta,
})));
const bearingAfter = contributionBearingAttachment({
  stories: journal,
  outcomes: reconstructed.outcomes,
  existingRootIds,
});

const report = {
  qualifying: grouped.length,
  persisted: existing.length,
  novel: novel.length,
  reasonCounts,
  clusterRows,
  unmatched,
  funnel,
  journalAudit: auditHumanJournalProvenance({
    stories: journal,
    outcomes: reconstructed.outcomes,
    existingRootIds: existing.map((item) => item.sourceId.replace(/^outcome:/, '')),
  }),
  rootsWithBearingChat: rootChat.filter((item) => item.bearingPresent).length,
  rootsWithAmbiguousOnly: rootChat.filter((item) => item.onlyAmbiguous).length,
  observationDependsOnAmbiguityAlone: shifts.filter((item) => item.observationDependsOnAmbiguityAlone).length,
  shifted: shifts.filter((item) => item.shifted),
  currentContributionsScore: currentScore?.score ?? null,
  bearingCoverage: {
    before: {
      onPersisted: bearingBefore.onPersisted.length,
      onNonPersisted: bearingBefore.onNonPersisted.length,
      noOutcome: bearingBefore.noOutcome.length,
      persistedRootsWithBearing: bearingBefore.persistedRootsWithBearing.length,
    },
    after: {
      onPersisted: bearingAfter.onPersisted.length,
      onNonPersisted: bearingAfter.onNonPersisted.length,
      noOutcome: bearingAfter.noOutcome.length,
      persistedRootsWithBearing: bearingAfter.persistedRootsWithBearing.length,
    },
  },
};
writeFileSync('/tmp/civizen-provenance-integrity.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  qualifying: report.qualifying,
  persisted: report.persisted,
  novel: report.novel,
  reasonCounts: report.reasonCounts,
  unmatched: report.unmatched.map((item) => ({ sourceId: item.sourceId, title: item.title, paths: item.affectedPaths.slice(0, 8) })),
  funnel: report.funnel,
  rootsWithBearingChat: report.rootsWithBearingChat,
  rootsWithAmbiguousOnly: report.rootsWithAmbiguousOnly,
  observationDependsOnAmbiguityAlone: report.observationDependsOnAmbiguityAlone,
  shiftedCount: report.shifted.length,
  shiftedSample: report.shifted.slice(0, 12).map((item) => ({
    title: item.title,
    oldObservation: item.oldObservation,
    newObservation: item.newObservation,
    oldSubstance: item.oldSubstance,
    newSubstance: item.newSubstance,
    actionRolesAdded: item.actionRolesAdded,
    chatBearing: item.chatBearing,
    chatAmbiguous: item.chatAmbiguous,
  })),
  genuinelyDistinct: report.clusterRows.filter((item) => item.reason === 'genuinely_distinct_qualifying').map((item) => item.title),
  currentContributionsScore: report.currentContributionsScore,
  bearingCoverage: report.bearingCoverage,
}, null, 2));
