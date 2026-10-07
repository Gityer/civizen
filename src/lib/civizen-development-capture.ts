/**
 * Live development-outcome capture.
 * Writes journal/provenance through development_stories; Score V2 still computes reputation.
 */

import { supabase } from '@/integrations/supabase/client';
import type { SupabaseDbClient } from '@/integrations/supabase/client-type';
import {
  estimateContributionEvent,
  syncContributionEvents,
  type ContributionEvent,
} from '@/lib/civizen-contributions';
import {
  evaluateDevelopmentContributionEvidence,
  groupDevelopmentStoriesToContributions,
  isSubstantiveInstruction,
  type DevelopmentContributionRole,
  type DevelopmentStoryEvidenceInput,
} from '@/lib/civizen-development-evidence';
import {
  evaluateDevelopmentSignificance,
  type DevelopmentSignificance,
} from '@/lib/civizen-development-significance';
import { executionMethodFromEvidence } from '@/lib/civizen-human-contribution-substance';
import { involvementFromStories } from '@/lib/civizen-contribution-provenance';

export type DevelopmentOutcomeCaptureInput = {
  outcomeRootId: string;
  title: string;
  instruction: string;
  createdFeatures?: string[];
  affectedPaths?: string[];
  commitSha?: string | null;
  prNumber?: number | null;
  testsPassed?: boolean | null;
  published?: boolean | null;
  unshipped?: boolean;
  status?: string;
  roles?: DevelopmentContributionRole[];
  implementationAssisted?: boolean;
  reviewedBy?: string | null;
  provenanceInstructions?: string[];
  expectedBehavior?: string;
  chatId?: string | null;
  contributionFunction?: string | null;
};

export type PlannedDevelopmentOutcome = {
  stories: DevelopmentStoryEvidenceInput[];
  significance: DevelopmentSignificance;
};

function outcomeKey(id: string): string {
  return id.trim();
}

export function planDevelopmentOutcomeStories(input: DevelopmentOutcomeCaptureInput): PlannedDevelopmentOutcome {
  const outcomeRootId = outcomeKey(input.outcomeRootId);
  if (!outcomeRootId) throw new Error('outcomeRootId is required');
  const significance = evaluateDevelopmentSignificance({
    affectedPaths: input.affectedPaths,
    testsPassed: input.testsPassed,
    contributionFunction: input.contributionFunction,
    title: input.title,
    roles: input.roles,
    implementationAssisted: input.implementationAssisted,
  });
  const metadata: Record<string, unknown> = {
    outcomeRootId,
    testsPassed: input.testsPassed ?? null,
    published: input.published ?? null,
    unshipped: input.unshipped === true,
    roles: input.roles ?? [],
    implementationAssisted: input.implementationAssisted === true,
    reviewedBy: input.reviewedBy ?? null,
    affectedPaths: input.affectedPaths ?? [],
    contributionFunction: significance.contributionFunction,
    significance,
    captureVersion: 'development-outcome-v1',
    executionMethod: executionMethodFromEvidence({
      implementationAssisted: input.implementationAssisted === true,
      roles: input.roles ?? [],
    }),
  };
  const primary: DevelopmentStoryEvidenceInput = {
    id: `outcome:${outcomeRootId}:implementation`,
    sourceStoryKey: `outcome:${outcomeRootId}:implementation`,
    source: 'development_outcome',
    sourceType: 'outcome',
    status: input.status ?? (input.unshipped || input.testsPassed === false ? 'failed' : 'published'),
    title: input.title.trim() || 'Platform improvement',
    originalInstruction: input.instruction,
    createdFeatures: input.createdFeatures ?? [],
    commitSha: input.commitSha ?? null,
    prNumber: input.prNumber ?? null,
    reviewedBy: input.reviewedBy ?? null,
    chatId: input.chatId ?? null,
    requestedAt: new Date().toISOString(),
    metadata,
    outcomeRootId,
    testsPassed: input.testsPassed ?? null,
    published: input.published ?? null,
    roles: input.roles ?? null,
    implementationAssisted: input.implementationAssisted === true,
  };
  const provenance = (input.provenanceInstructions ?? [])
    .filter((text) => isSubstantiveInstruction(text) || text.trim().length > 0)
    .map((text, index): DevelopmentStoryEvidenceInput => ({
      id: `outcome:${outcomeRootId}:provenance:${index + 1}`,
      sourceStoryKey: `outcome:${outcomeRootId}:provenance:${index + 1}`,
      source: 'development_outcome',
      sourceType: 'provenance',
      status: 'published',
      title: input.title.trim() || 'Platform improvement',
      originalInstruction: text,
      createdFeatures: [],
      outcomeRootId,
      requestedAt: new Date().toISOString(),
      metadata: { outcomeRootId, captureVersion: 'development-outcome-v1' },
      implementationAssisted: input.implementationAssisted === true,
    }));
  return { stories: [primary, ...provenance], significance };
}

export function contributionEventsFromDevelopmentStories(
  profileId: string,
  stories: DevelopmentStoryEvidenceInput[],
): ContributionEvent[] {
  return groupDevelopmentStoriesToContributions(stories).map((item) =>
    estimateContributionEvent({
      profileId,
      sourceTable: 'development_stories',
      sourceId: item.sourceId,
      eventType: 'development_story',
      title: item.title,
      summary: item.summary,
      textLen: item.instruction.length,
      verified: item.verified,
      occurredAt: item.occurredAt,
      rawMeta: {
        eligibility: item.eligibility,
        provenanceCount: item.provenanceStoryIds.length,
        provenanceStoryIds: item.provenanceStoryIds,
        humanInvolvement: involvementFromStories(stories.filter((story) =>
          item.provenanceStoryIds.includes(story.id || story.sourceStoryKey || ''),
        )),
        contributionRoles: item.roles,
        implementationAssisted: item.implementationAssisted,
        executionMethod: executionMethodFromEvidence({
          implementationAssisted: item.implementationAssisted,
          roles: item.roles,
        }),
        independentValidation: item.independentValidation,
        outcomeValidated: item.outcomeValidated,
        realFeatures: item.realFeatures,
        domain: item.classifiedDomain,
        testsPassed: item.testsPassed || stories.some((story) => story.testsPassed === true),
        contributionFunction: item.contributionFunction,
        affectedPaths: item.affectedPaths,
        reconstructionResult: item.reconstructionResult,
        survivingImplementation: item.survivingImplementation,
        instruction: item.instruction,
        linkedInstructions: item.linkedInstructions,
      },
    }),
  );
}

export async function recordDevelopmentOutcome(
  input: DevelopmentOutcomeCaptureInput,
  options?: { profileId?: string; userId?: string | null; sync?: boolean; client?: SupabaseDbClient },
): Promise<{
  stories: DevelopmentStoryEvidenceInput[];
  evaluation: ReturnType<typeof evaluateDevelopmentContributionEvidence>;
  events: ContributionEvent[];
}> {
  const planned = planDevelopmentOutcomeStories(input);
  const client: SupabaseDbClient = options?.client ?? supabase;
  if (options?.sync !== false && options?.profileId) {
    for (const story of planned.stories) {
      const { error } = await client.rpc('ingest_development_story', {
        p_source_story_key: story.sourceStoryKey,
        p_title: story.title,
        p_original_instruction: story.originalInstruction,
        p_rephrased_description: story.originalInstruction,
        p_section: 'Platform',
        p_area: 'General',
        p_created_features: story.createdFeatures ?? [],
        p_expected_behavior: input.expectedBehavior ?? 'The resulting product behavior should match the captured outcome.',
        p_source: story.source ?? 'development_outcome',
        p_requested_at: story.requestedAt,
        p_story_kind: 'development',
        p_status: story.status ?? 'published',
        p_visibility: 'public',
        p_source_type: story.sourceType ?? 'outcome',
        p_chat_id: story.chatId ?? null,
        p_commit_sha: story.commitSha ?? null,
        p_pr_number: story.prNumber ?? null,
        p_metadata: story.metadata ?? {},
      });
      if (error) {
        console.error('recordDevelopmentOutcome ingest failed', error);
        break;
      }
    }
    await syncContributionEvents(options.profileId, options.userId, client, { force: true });
  }
  const evaluation = evaluateDevelopmentContributionEvidence(planned.stories[0]!);
  const events = options?.profileId
    ? contributionEventsFromDevelopmentStories(options.profileId, planned.stories)
    : [];
  return { stories: planned.stories, evaluation, events };
}
