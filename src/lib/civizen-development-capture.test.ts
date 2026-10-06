// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import {
  contributionEventsFromDevelopmentStories,
  planDevelopmentOutcomeStories,
} from '@/lib/civizen-development-capture';
import {
  evaluateDevelopmentContributionEvidence,
  groupDevelopmentStoriesToContributions,
} from '@/lib/civizen-development-evidence';
import { evaluateDevelopmentSignificance } from '@/lib/civizen-development-significance';
import { scoreContributionsFromEvents } from '@/lib/civizen-contributions';
import { buildScoreFromProfileActivity } from '@/lib/civizen-score';
import { ownProfileRingDisplay } from '@/lib/civizen-score-ring-display';

const ARCHITECTURE = [
  'Define a new architecture that separates activity evaluation from accumulated reputation.',
  'Canonicalize evidence roots and distinguish confidence from score magnitude.',
].join(' ');

const FEATURES = ['Development outcome capture pipeline'];

describe('development outcome capture', () => {
  it('A: meaningful instruction without implemented outcome is provenance only', () => {
    const planned = planDevelopmentOutcomeStories({
      outcomeRootId: 'score-v2',
      title: 'Score V2 redesign',
      instruction: ARCHITECTURE,
    });
    const evaluation = evaluateDevelopmentContributionEvidence(planned.stories[0]!);
    expect(evaluation.eligibility).toBe('provenance_only');
    expect(evaluation.qualifiesAsContribution).toBe(false);
    expect(groupDevelopmentStoriesToContributions(planned.stories)).toEqual([]);
  });

  it('B: implemented change without contributor provenance is attributed conservatively', () => {
    const planned = planDevelopmentOutcomeStories({
      outcomeRootId: 'nav-fix',
      title: 'Work unit',
      instruction: 'ship the patch',
      createdFeatures: ['Shared nav carousel geometry'],
      commitSha: 'abc1234def',
      testsPassed: true,
    });
    const evaluation = evaluateDevelopmentContributionEvidence(planned.stories[0]!);
    expect(evaluation.qualifiesAsContribution).toBe(true);
    expect(evaluation.roles).not.toContain('system_architect');
    expect(evaluation.roles).not.toContain('implementation');
  });

  it('C: instruction + implementation + passing verification is one system-verified contribution', () => {
    const planned = planDevelopmentOutcomeStories({
      outcomeRootId: 'score-v2',
      title: 'Score V2 redesign',
      instruction: ARCHITECTURE,
      createdFeatures: FEATURES,
      commitSha: 'abc1234def',
      testsPassed: true,
      affectedPaths: ['src/lib/civizen-score.ts', 'src/lib/civizen-development-evidence.ts'],
      roles: ['founder', 'system_architect', 'requirements', 'review'],
      implementationAssisted: true,
    });
    const grouped = groupDevelopmentStoriesToContributions(planned.stories);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.eligibility).toBe('system_verified');
    expect(grouped[0]?.classifiedDomain).toBeNull();
    expect(planned.significance.structuralSignificance).toBe('high');
    expect(planned.significance.realizedImpact).toBe('unknown');
  });

  it('D: 15 substantive prompts for one outcome stay one root', () => {
    const prompts = Array.from({ length: 15 }, (_, i) => `${ARCHITECTURE} Pass ${i + 1}.`);
    const planned = planDevelopmentOutcomeStories({
      outcomeRootId: 'score-v2',
      title: 'Score V2 redesign',
      instruction: ARCHITECTURE,
      provenanceInstructions: prompts,
      createdFeatures: FEATURES,
      commitSha: 'abc1234def',
      testsPassed: true,
    });
    const grouped = groupDevelopmentStoriesToContributions(planned.stories);
    expect(planned.stories.length).toBeGreaterThan(10);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.provenanceStoryIds.length).toBeGreaterThan(10);
  });

  it('E: several commits for the same work unit stay one root', () => {
    const stories = ['aaa1111', 'bbb2222', 'ccc3333'].flatMap((sha) =>
      planDevelopmentOutcomeStories({
        outcomeRootId: 'score-v2',
        title: 'Score V2 redesign',
        instruction: ARCHITECTURE,
        createdFeatures: FEATURES,
        commitSha: sha,
        testsPassed: true,
      }).stories,
    );
    expect(groupDevelopmentStoriesToContributions(stories)).toHaveLength(1);
  });

  it('F: two independent outcomes are two roots', () => {
    const first = planDevelopmentOutcomeStories({
      outcomeRootId: 'score-v2',
      title: 'Score V2',
      instruction: ARCHITECTURE,
      createdFeatures: FEATURES,
      commitSha: 'aaa1111',
      testsPassed: true,
    }).stories;
    const second = planDevelopmentOutcomeStories({
      outcomeRootId: 'nav-carousel',
      title: 'Nav carousel',
      instruction: 'Specify a structural redesign of the secondary nav carousel geometry invariant.',
      createdFeatures: ['Shared nav carousel geometry'],
      commitSha: 'bbb2222',
      testsPassed: true,
    }).stories;
    expect(groupDevelopmentStoriesToContributions([...first, ...second])).toHaveLength(2);
  });

  it('G: later independent review keeps the same root and strengthens validation', () => {
    const base = planDevelopmentOutcomeStories({
      outcomeRootId: 'score-v2',
      title: 'Score V2',
      instruction: ARCHITECTURE,
      createdFeatures: FEATURES,
      commitSha: 'abc1234def',
      testsPassed: true,
    }).stories;
    const reviewed = planDevelopmentOutcomeStories({
      outcomeRootId: 'score-v2',
      title: 'Score V2',
      instruction: ARCHITECTURE,
      createdFeatures: FEATURES,
      commitSha: 'abc1234def',
      testsPassed: true,
      reviewedBy: 'reviewer-1',
    }).stories;
    const before = groupDevelopmentStoriesToContributions(base);
    const after = groupDevelopmentStoriesToContributions(reviewed);
    expect(before[0]?.sourceId).toBe(after[0]?.sourceId);
    expect(before[0]?.independentValidation).toBe(false);
    expect(after[0]?.eligibility).toBe('independently_validated');
  });

  it('H: failed or unshipped implementation is not system-verified', () => {
    const planned = planDevelopmentOutcomeStories({
      outcomeRootId: 'broken',
      title: 'Broken change',
      instruction: ARCHITECTURE,
      createdFeatures: FEATURES,
      commitSha: 'abc1234def',
      testsPassed: false,
      unshipped: true,
    });
    const evaluation = evaluateDevelopmentContributionEvidence(planned.stories[0]!);
    expect(evaluation.qualifiesAsContribution).toBe(false);
    expect(evaluation.eligibility).not.toBe('system_verified');
  });

  it('I: AI-assisted implementation preserves user architecture/review and does not credit the agent', () => {
    const planned = planDevelopmentOutcomeStories({
      outcomeRootId: 'score-v2',
      title: 'Score V2',
      instruction: ARCHITECTURE,
      createdFeatures: FEATURES,
      commitSha: 'abc1234def',
      testsPassed: true,
      implementationAssisted: true,
      roles: ['founder', 'system_architect', 'requirements', 'review'],
    });
    const evaluation = evaluateDevelopmentContributionEvidence(planned.stories[0]!);
    expect(evaluation.implementationAssisted).toBe(true);
    expect(evaluation.roles).toEqual(expect.arrayContaining(['founder', 'system_architect', 'review']));
    expect(evaluation.roles).not.toContain('implementation');
  });

  it('J: new qualifying evidence recomputes Contributions without manual score editing', () => {
    const before = scoreContributionsFromEvents([]);
    const planned = planDevelopmentOutcomeStories({
      outcomeRootId: 'score-v2',
      title: 'Score V2',
      instruction: ARCHITECTURE,
      createdFeatures: FEATURES,
      commitSha: 'abc1234def',
      testsPassed: true,
    });
    const events = contributionEventsFromDevelopmentStories('profile-1', planned.stories);
    const after = scoreContributionsFromEvents(events);
    expect(before).toBeNull();
    expect(events).toHaveLength(1);
    expect(after?.verifiedSourceCount).toBe(1);
    expect(after?.score).not.toBeNull();
    const scored = buildScoreFromProfileActivity({ contributions: after });
    expect(scored.categories.find((item) => item.id === 'contributions')?.verifiedSourceCount).toBe(1);
  });

  it('K: provisional estimate updates the own-profile ring while remaining provisional', () => {
    const planned = planDevelopmentOutcomeStories({
      outcomeRootId: 'score-v2',
      title: 'Score V2',
      instruction: ARCHITECTURE,
      createdFeatures: FEATURES,
      commitSha: 'abc1234def',
      testsPassed: true,
    });
    const events = contributionEventsFromDevelopmentStories('profile-1', planned.stories);
    const scored = buildScoreFromProfileActivity({
      contributions: scoreContributionsFromEvents(events),
    });
    const ring = ownProfileRingDisplay(scored);
    expect(scored.overall.status).not.toBe('established');
    expect(ring.presentation).toBe('provisional');
    expect(ring.value).toBe(scored.overall.provisionalEstimate);
    expect(ring.caption).toBe('Estimate');
    expect(ring.centerLabel).not.toBe('—');
  });

  it('L: canonical duplicates do not add independent evidence', () => {
    const planned = planDevelopmentOutcomeStories({
      outcomeRootId: 'score-v2',
      title: 'Score V2',
      instruction: ARCHITECTURE,
      createdFeatures: FEATURES,
      commitSha: 'abc1234def',
      testsPassed: true,
      provenanceInstructions: [ARCHITECTURE, ARCHITECTURE],
    });
    const events = contributionEventsFromDevelopmentStories('profile-1', planned.stories);
    const scored = buildScoreFromProfileActivity({
      contributions: scoreContributionsFromEvents(events),
    });
    expect(events).toHaveLength(1);
    expect(scored.validation.independentVerifiedCount).toBe(1);
  });

  it('M: legacy journal rows stay excluded unless linked to a qualifying outcome', () => {
    const journal = {
      id: 'chat-1',
      sourceStoryKey: 'chat:abc:1',
      source: 'chat',
      originalInstruction: ARCHITECTURE,
      createdFeatures: ['Backfilled from chat transcript'],
    };
    expect(groupDevelopmentStoriesToContributions([journal])).toEqual([]);
    const planned = planDevelopmentOutcomeStories({
      outcomeRootId: 'score-v2',
      title: 'Score V2',
      instruction: ARCHITECTURE,
      createdFeatures: FEATURES,
      commitSha: 'abc1234def',
      testsPassed: true,
    });
    const linked = { ...journal, id: 'chat-2', outcomeRootId: 'score-v2' };
    const grouped = groupDevelopmentStoriesToContributions([...planned.stories, linked, journal]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.provenanceStoryIds).toContain('chat-2');
    expect(grouped[0]?.provenanceStoryIds).not.toContain('chat-1');
  });

  it('does not fabricate a Civizen domain for platform architecture work', () => {
    const significance = evaluateDevelopmentSignificance({
      affectedPaths: ['src/lib/civizen-score.ts'],
      testsPassed: true,
    });
    expect(significance.contributionFunction).toBe('system_architecture');
    expect(significance.realizedImpact).toBe('unknown');
  });
});

describe('own-profile ring presentation', () => {
  it('keeps established rings on the public score', () => {
    const ring = ownProfileRingDisplay({
      overall: {
        score: 62.1,
        status: 'established',
        confidence: 'moderate',
        provisionalEstimate: 62.1,
        lastCalculatedAt: null,
        stage: 'established',
      },
      tier: { finalTier: 'contributor' },
    } as never);
    expect(ring.presentation).toBe('established');
    expect(ring.caption).toBeNull();
    expect(ring.centerLabel).toBe('62%');
  });
});
