// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { evaluateContributionLifecycle } from '@/lib/civizen-contribution-lifecycle';
import { contributionEventsFromDevelopmentStories, planDevelopmentOutcomeStories } from '@/lib/civizen-development-capture';
import {
  evaluateDevelopmentContributionEvidence,
  groupDevelopmentStoriesToContributions,
} from '@/lib/civizen-development-evidence';
import {
  assessHumanContributionSubstance,
  executionMethodFromEvidence,
} from '@/lib/civizen-human-contribution-substance';
import {
  historicalStoriesForEvaluation,
  reconstructHistoricalDevelopmentOutcomes,
} from '@/lib/civizen-historical-reconstruction';
import { scoreContributionsFromEvents } from '@/lib/civizen-contributions';
import type { ContributionEvent } from '@/lib/civizen-contributions';

const AGREEMENTS = [
  'Identify the poor agreement workflow and redesign creation.',
  'Define template selection and document-first editing.',
  'Determine party roles and correct term/date handling.',
  'Redesign reference behavior and review mobile UX.',
  'Inspect the implementation, identify deficiencies, and direct revisions.',
  'Validate the resulting Agreements capability.',
].join(' ');

function eventFromOutcome(input: Parameters<typeof planDevelopmentOutcomeStories>[0]): ContributionEvent {
  return contributionEventsFromDevelopmentStories('p1', planDevelopmentOutcomeStories(input).stories)[0]!;
}

describe('human contribution substance', () => {
  it('A: trivial prompt plus cosmetic AI change is not a standalone contribution', () => {
    const planned = planDevelopmentOutcomeStories({
      outcomeRootId: 'blue-button',
      title: 'Button color',
      instruction: 'Make this button blue.',
      createdFeatures: ['button color'],
      commitSha: 'abc1234def',
      testsPassed: true,
      affectedPaths: ['src/components/ui/button.css'],
      implementationAssisted: true,
    });
    const evaluation = evaluateDevelopmentContributionEvidence(planned.stories[0]!);
    expect(evaluation.qualifiesAsContribution).toBe(false);
    expect(evaluation.reasons).toContain('trivial_human_input');
    expect(groupDevelopmentStoriesToContributions(planned.stories)).toEqual([]);
  });

  it('B: large AI artifact with little human involvement does not create high human substance', () => {
    const view = evaluateContributionLifecycle(eventFromOutcome({
      outcomeRootId: 'generated-blob',
      title: 'Generated files',
      instruction: 'ok do it',
      createdFeatures: ['Generated module pack'],
      commitSha: 'abc1234def',
      testsPassed: true,
      affectedPaths: [
        'src/lib/civizen-score.ts',
        'src/lib/civizen-score-model.ts',
        'src/lib/civizen-score-maturity.ts',
        'src/lib/civizen-contribution-score.ts',
      ],
      implementationAssisted: true,
    }));
    expect(view.humanSubstance?.level === 'modest' || view.humanSubstance?.level === 'trivial').toBe(true);
    expect(view.humanSubstance?.level).not.toBe('high');
    expect(view.executionMethod).toBe('ai_assisted');
    expect(view.roles).not.toContain('implementation');
  });

  it('C: architecture/specification plus AI implementation keeps strong human attribution', () => {
    const view = evaluateContributionLifecycle(eventFromOutcome({
      outcomeRootId: 'score-v2',
      title: 'Score V2 evidence architecture',
      instruction: 'Define a new architecture that separates activity evaluation from accumulated reputation and specify evidence-root invariants.',
      createdFeatures: ['Score V2 evidence-maturity engine'],
      commitSha: 'abc1234def',
      testsPassed: true,
      affectedPaths: ['src/lib/civizen-score.ts', 'src/lib/civizen-score-model.ts'],
      roles: ['system_architect', 'requirements', 'review'],
      implementationAssisted: true,
    }));
    expect(view.roles).toEqual(expect.arrayContaining(['system_architect', 'requirements', 'review']));
    expect(view.roles).not.toContain('implementation');
    expect(view.executionMethod).toBe('ai_assisted');
    expect(view.contributionFunction).toBe('system_architecture');
    expect(view.humanSubstance?.level === 'high' || view.humanSubstance?.level === 'substantive').toBe(true);
    expect(view.humanSubstance?.dimensions.direct_implementation).not.toBe('high');
  });

  it('D: iterative UX redesign across many prompts stays one contribution root', () => {
    const planned = planDevelopmentOutcomeStories({
      outcomeRootId: 'agreements-ux',
      title: 'Agreements capability refinement',
      instruction: AGREEMENTS,
      provenanceInstructions: Array.from({ length: 20 }, (_, i) => `${AGREEMENTS} Pass ${i + 1}.`),
      createdFeatures: ['Agreements document-first create'],
      commitSha: 'abc1234def',
      testsPassed: true,
      affectedPaths: ['src/pages/agreements/AgreementCreate.tsx'],
      implementationAssisted: true,
    });
    const grouped = groupDevelopmentStoriesToContributions(planned.stories);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.provenanceStoryIds.length).toBeGreaterThan(10);
    expect(grouped[0]?.roles).toEqual(expect.arrayContaining(['ux_design', 'requirements', 'review', 'validation']));
  });

  it('E: identifying a deficiency and directing correction is review/quality-control evidence', () => {
    const inferred = evaluateDevelopmentContributionEvidence({
      originalInstruction: 'The implementation is technically working but the UX is inaccessible; identify the deficiency and direct revisions.',
      createdFeatures: ['Agreements mobile UX correction'],
      commitSha: 'abc1234def',
      testsPassed: true,
      outcomeRootId: 'agreements-ux',
      implementationAssisted: true,
    });
    expect(inferred.roles).toEqual(expect.arrayContaining(['quality_assurance', 'review']));
    expect(inferred.roles).not.toContain('implementation');
  });

  it('F: twenty messages for one coherent feature are not twenty contribution roots', () => {
    const planned = planDevelopmentOutcomeStories({
      outcomeRootId: 'one-feature',
      title: 'Agreements capability refinement',
      instruction: AGREEMENTS,
      provenanceInstructions: Array.from({ length: 20 }, (_, i) => `continue pass ${i}`),
      createdFeatures: ['Agreements capability'],
      commitSha: 'abc1234def',
      testsPassed: true,
      implementationAssisted: true,
    });
    expect(groupDevelopmentStoriesToContributions(planned.stories)).toHaveLength(1);
  });

  it('G: two genuinely independent improvements in one conversation are two roots', () => {
    const first = planDevelopmentOutcomeStories({
      outcomeRootId: 'score-v2',
      title: 'Score V2',
      instruction: 'Define a new architecture that separates activity evaluation from accumulated reputation.',
      createdFeatures: ['Score V2 engine'],
      commitSha: 'aaa1111',
      testsPassed: true,
    }).stories;
    const second = planDevelopmentOutcomeStories({
      outcomeRootId: 'agreements-ux',
      title: 'Agreements capability refinement',
      instruction: AGREEMENTS,
      createdFeatures: ['Agreements document-first create'],
      commitSha: 'bbb2222',
      testsPassed: true,
    }).stories;
    expect(groupDevelopmentStoriesToContributions([...first, ...second])).toHaveLength(2);
  });

  it('H: AI-generated code does not credit the user with manual coding', () => {
    const method = executionMethodFromEvidence({
      implementationAssisted: true,
      roles: ['ux_design', 'requirements', 'review'],
    });
    expect(method).toBe('ai_assisted');
    const view = evaluateContributionLifecycle(eventFromOutcome({
      outcomeRootId: 'ai-code',
      title: 'Agreements capability refinement',
      instruction: AGREEMENTS,
      createdFeatures: ['Agreements capability'],
      commitSha: 'abc1234def',
      testsPassed: true,
      roles: ['ux_design', 'requirements', 'review'],
      implementationAssisted: true,
    }));
    expect(view.roles).not.toContain('implementation');
    expect(view.humanContributionSummary).not.toMatch(/implemented the work/i);
    expect(view.executionMethod).toBe('ai_assisted');
  });

  it('I: human-written implementation can receive the implementation role when evidenced', () => {
    const view = evaluateContributionLifecycle(eventFromOutcome({
      outcomeRootId: 'hand-code',
      title: 'Direct implementation',
      instruction: 'I wrote the parser myself and personally implemented the date handling.',
      createdFeatures: ['Agreement date parser'],
      commitSha: 'abc1234def',
      testsPassed: true,
      roles: ['implementation'],
      implementationAssisted: false,
    }));
    expect(view.roles).toContain('implementation');
    expect(view.executionMethod).toBe('manual');
    expect(view.humanSubstance?.dimensions.direct_implementation).toBe('high');
  });

  it('J: long effort with little resulting value does not produce a high evaluation', () => {
    const substance = assessHumanContributionSubstance({
      instruction: 'Make this button blue.',
      roles: ['product_direction', 'review'],
      implementationAssisted: true,
      durationMinutes: 600,
      affectedPaths: ['src/components/ui/button.css'],
      features: ['button color'],
      structuralSignificance: 'localized',
    });
    expect(substance.level === 'trivial' || substance.level === 'modest').toBe(true);
    expect(substance.effortUsedAsMultiplier).toBe(false);
    const view = evaluateContributionLifecycle({
      profileId: 'p1',
      sourceTable: 'development_stories',
      sourceId: 'blue',
      eventType: 'development_story',
      title: 'Button color',
      summary: null,
      capacityEstimate: 78,
      impactEstimate: 78,
      collaborationEstimate: 35,
      beneficiaryEstimate: 75,
      verified: true,
      occurredAt: '2026-08-13T10:00:00.000Z',
      rawMeta: {
        eligibility: 'system_verified',
        testsPassed: true,
        durationMinutes: 600,
        instruction: 'Make this button blue.',
        contributionRoles: ['product_direction', 'review'],
        implementationAssisted: true,
        affectedPaths: ['src/components/ui/button.css'],
      },
    });
    expect(view.quality).toBeLessThan(50);
  });

  it('K: a short consequential architectural decision can receive substantial recognition', () => {
    const view = evaluateContributionLifecycle(eventFromOutcome({
      outcomeRootId: 'invariant',
      title: 'Score evidence-root invariant',
      instruction: 'Define the evidence-root invariant so activity evaluation stays distinct from accumulated reputation.',
      createdFeatures: ['Evidence-root invariant'],
      commitSha: 'abc1234def',
      testsPassed: true,
      affectedPaths: ['src/lib/civizen-score-model.ts'],
      roles: ['system_architect', 'requirements'],
      implementationAssisted: true,
    }));
    expect(view.humanSubstance?.level === 'high' || view.humanSubstance?.level === 'substantive').toBe(true);
    expect(view.quality).toBeGreaterThan(70);
  });

  it('L: high human substance with unknown realized impact remains legitimate', () => {
    const view = evaluateContributionLifecycle(eventFromOutcome({
      outcomeRootId: 'agreements-ux',
      title: 'Agreements capability refinement',
      instruction: AGREEMENTS,
      createdFeatures: ['Agreements capability'],
      commitSha: 'abc1234def',
      testsPassed: true,
      roles: ['ux_design', 'requirements', 'review', 'validation'],
      implementationAssisted: true,
    }));
    expect(view.humanSubstance?.level === 'high' || view.humanSubstance?.level === 'substantive').toBe(true);
    expect(view.realizedImpact).toBe('unknown');
    expect(view.supports.contributions).toBe(true);
  });

  it('M: later poor realized impact can revise Contributions while Skills/Experience remain', () => {
    const failed = evaluateContributionLifecycle({
      profileId: 'p1',
      sourceTable: 'development_stories',
      sourceId: 'agreements-ux',
      eventType: 'development_story',
      title: 'Agreements capability refinement',
      summary: null,
      capacityEstimate: 78,
      impactEstimate: 78,
      collaborationEstimate: 35,
      beneficiaryEstimate: 75,
      verified: true,
      occurredAt: '2026-08-13T10:00:00.000Z',
      rawMeta: {
        eligibility: 'system_verified',
        testsPassed: true,
        contributionRoles: ['ux_design', 'requirements', 'review', 'validation'],
        implementationAssisted: true,
        instruction: AGREEMENTS,
        impactEvidence: { breadth: 'local', depth: 'trivial', outcomeMetric: 18, reversal: true },
      },
    });
    expect(Number(failed.realizedImpact)).toBeLessThan(40);
    expect(failed.supports.skills.length).toBeGreaterThan(0);
    expect(failed.supports.experience).toBe(true);
  });

  it('N: historical reconstructed outcome enriches human role without creating a duplicate root', () => {
    const { outcomes } = reconstructHistoricalDevelopmentOutcomes({
      survivingPaths: ['src/pages/agreements/AgreementCreate.tsx', 'src/pages/agreements/AgreementCreate.test.tsx'],
      commits: [{
        sha: 'aa11aa11aa11',
        authoredAt: '2026-08-13T12:00:00.000Z',
        subject: 'Refine Agreements document-first editing and party roles',
        files: ['src/pages/agreements/AgreementCreate.tsx', 'src/pages/agreements/AgreementCreate.test.tsx'],
      }],
      stories: [{
        id: 'chat-1',
        originalInstruction: AGREEMENTS,
        requestedAt: '2026-08-13T11:50:00.000Z',
      }],
    });
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]?.implementationStory.roles).toEqual(expect.arrayContaining(['ux_design', 'requirements', 'review']));
    expect(outcomes[0]?.implementationStory.roles).not.toContain('implementation');
    const stories = historicalStoriesForEvaluation(outcomes, [{
      id: 'chat-1',
      originalInstruction: AGREEMENTS,
      requestedAt: '2026-08-13T11:50:00.000Z',
    }]);
    expect(groupDevelopmentStoriesToContributions(stories)).toHaveLength(1);
  });

  it('O: Agreements capability fixture is one coherent AI-assisted contribution outcome', () => {
    const planned = planDevelopmentOutcomeStories({
      outcomeRootId: 'agreements-capability',
      title: 'Agreements capability refinement',
      instruction: AGREEMENTS,
      provenanceInstructions: [
        'Redesign agreement creation and template selection.',
        'Establish document-first editing and determine party roles.',
        'Inspect the implementation, identify deficiencies, and validate the resulting behavior.',
      ],
      createdFeatures: ['Agreements document-first create'],
      commitSha: 'abc1234def',
      testsPassed: true,
      affectedPaths: ['src/pages/agreements/AgreementCreate.tsx', 'src/pages/agreements/AgreementCreate.test.tsx'],
      implementationAssisted: true,
    });
    const grouped = groupDevelopmentStoriesToContributions(planned.stories);
    const events = contributionEventsFromDevelopmentStories('p1', planned.stories);
    const view = evaluateContributionLifecycle(events[0]!);
    expect(grouped).toHaveLength(1);
    expect(view.executionMethod).toBe('ai_assisted');
    expect(view.roles).toEqual(expect.arrayContaining(['ux_design', 'requirements', 'review', 'validation']));
    expect(view.contributionFunction).toBe('product_architecture');
    expect(view.roles).not.toContain('implementation');
    expect(view.evaluationVersion).toBe('contribution-evaluation-v3');
    expect(view.humanSubstance?.promptCountUsedForScore).toBe(false);
    expect(scoreContributionsFromEvents(events)?.score).not.toBeNull();
  });
});
