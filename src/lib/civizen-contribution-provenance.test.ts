// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import {
  classifyHumanProvenance,
  classifyHumanProvenanceText,
  involvementFromClassifications,
} from '@/lib/civizen-contribution-provenance';
import {
  contributionEventsFromDevelopmentStories,
  planDevelopmentOutcomeStories,
} from '@/lib/civizen-development-capture';
import { groupDevelopmentStoriesToContributions } from '@/lib/civizen-development-evidence';
import { evaluateContributionLifecycle } from '@/lib/civizen-contribution-lifecycle';
import {
  historicalStoriesForEvaluation,
  reconstructHistoricalDevelopmentOutcomes,
} from '@/lib/civizen-historical-reconstruction';

describe('contextual contribution provenance', () => {
  it('A: short defect statement leading to correction is QA provenance', () => {
    const classified = classifyHumanProvenance({
      instruction: 'The calendar goes outside the visible screen.',
      followedByImplementation: true,
      overlappingOutcome: true,
    });
    expect(classified.contributionBearing).toBe(true);
    expect(classified.functions).toEqual(expect.arrayContaining(['defect_identification', 'quality_control']));
    expect(classified.roles).toContain('quality_assurance');
  });

  it('B: short UX principle leading to redesign is design provenance', () => {
    const classified = classifyHumanProvenanceText('This should behave like a document, not a form.');
    expect(classified.contributionBearing).toBe(true);
    expect(classified.functions).toEqual(expect.arrayContaining(['ux_design', 'product_design']));
  });

  it('C: question identifying a workflow flaw followed by correction is problem-identification provenance', () => {
    const classified = classifyHumanProvenance({
      instruction: 'Why are users being required to select the party twice?',
      followedByImplementation: true,
    });
    expect(classified.contributionBearing).toBe(true);
    expect(classified.functions).toContain('problem_identification');
    expect(classified.disposition).toBe('contribution_bearing');
  });

  it('D: generic information question is not contribution-bearing', () => {
    const classified = classifyHumanProvenanceText('How does React work?');
    expect(classified.contributionBearing).toBe(false);
    expect(classified.disposition).toBe('information_only');
  });

  it('E: ok / continue / commit stays process only', () => {
    for (const text of ['ok', 'continue', 'commit it']) {
      expect(classifyHumanProvenanceText(text).disposition).toBe('process_casual');
      expect(classifyHumanProvenanceText(text).contributionBearing).toBe(false);
    }
  });

  it('corrects a short login lockout instruction as contribution-bearing', () => {
    const classified = classifyHumanProvenanceText(
      'Correct the web login signup lockout so AuthContext recovers when profiles fetch fails.',
    );
    expect(classified.contributionBearing).toBe(true);
    expect(classified.functions).toEqual(expect.arrayContaining(['correction']));
  });

  it('F: long prompt with no resulting outcome does not create verified contribution substance from length', () => {
    const long = Array.from({ length: 80 }, () => 'We should consider many speculative alternatives for unspecified future work.').join(' ');
    expect(classifyHumanProvenanceText(long).contributionBearing).toBe(false);
    const planned = planDevelopmentOutcomeStories({
      outcomeRootId: 'speculative',
      title: 'Speculative note',
      instruction: long,
    });
    expect(groupDevelopmentStoriesToContributions(planned.stories)).toEqual([]);
  });

  it('G: many corrections from agent failure stay one root with review provenance', () => {
    const planned = planDevelopmentOutcomeStories({
      outcomeRootId: 'agreements-calendar',
      title: 'Agreements calendar viewport',
      instruction: 'The calendar goes outside the visible screen.',
      provenanceInstructions: Array.from({ length: 12 }, (_, i) =>
        i % 2 === 0 ? 'That still does not work. The calendar is clipped.' : 'Fix this. Keep the calendar inside the viewport.',
      ),
      createdFeatures: ['Agreement date calendar'],
      commitSha: 'abc1234def',
      testsPassed: true,
      affectedPaths: ['src/components/agreements/AgreementDateToken.tsx'],
      implementationAssisted: true,
    });
    const grouped = groupDevelopmentStoriesToContributions(planned.stories);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.provenanceStoryIds.length).toBeGreaterThan(8);
    const involvement = involvementFromClassifications(
      planned.stories.map((story) => ({
        classification: classifyHumanProvenanceText(story.originalInstruction || ''),
        at: story.requestedAt,
      })),
    );
    expect(involvement.revisionCycles).toBeGreaterThan(3);
    expect(involvement.promptCountUsedForScore).toBe(false);
  });

  it('H: 40 provenance messages for one coherent outcome stay one root', () => {
    const planned = planDevelopmentOutcomeStories({
      outcomeRootId: 'agreements-capability',
      title: 'Agreements capability refinement',
      instruction: 'This should behave like a document, not a form.',
      provenanceInstructions: Array.from({ length: 40 }, (_, i) =>
        `The roles should stay visible in the agreement text. Pass ${i + 1}.`,
      ),
      createdFeatures: ['Agreements document-first create'],
      commitSha: 'abc1234def',
      testsPassed: true,
      implementationAssisted: true,
    });
    expect(groupDevelopmentStoriesToContributions(planned.stories)).toHaveLength(1);
  });

  it('I: two separate outcomes in the same conversation are two roots', () => {
    const first = planDevelopmentOutcomeStories({
      outcomeRootId: 'score-ring',
      title: 'Score ring geometry',
      instruction: 'The score ring geometry should keep the percent readable.',
      createdFeatures: ['Score ring'],
      commitSha: 'aaa1111',
      testsPassed: true,
    }).stories;
    const second = planDevelopmentOutcomeStories({
      outcomeRootId: 'agreements-ux',
      title: 'Agreements document-first editing',
      instruction: 'This should behave like a document, not a form.',
      createdFeatures: ['Agreements document-first create'],
      commitSha: 'bbb2222',
      testsPassed: true,
    }).stories;
    expect(groupDevelopmentStoriesToContributions([...first, ...second])).toHaveLength(2);
  });

  it('J: existing root plus newly linked human provenance keeps root count and improves roles', () => {
    const first = reconstructHistoricalDevelopmentOutcomes({
      survivingPaths: ['src/pages/agreements/AgreementCreate.tsx'],
      commits: [{
        sha: 'aa11aa11aa11',
        authoredAt: '2026-08-13T12:00:00.000Z',
        subject: 'Refine Agreements document-first editing',
        files: ['src/pages/agreements/AgreementCreate.tsx'],
      }],
      stories: [],
    });
    const second = reconstructHistoricalDevelopmentOutcomes({
      survivingPaths: ['src/pages/agreements/AgreementCreate.tsx'],
      commits: [{
        sha: 'aa11aa11aa11',
        authoredAt: '2026-08-13T12:00:00.000Z',
        subject: 'Refine Agreements document-first editing',
        files: ['src/pages/agreements/AgreementCreate.tsx'],
      }],
      stories: [{
        id: 'chat-1',
        source: 'chat',
        originalInstruction: 'This should behave like a document, not a form. Party roles should stay visible in the agreement text.',
        requestedAt: '2026-08-13T11:50:00.000Z',
      }],
    });
    expect(first.outcomes).toHaveLength(second.outcomes.length);
    expect(second.outcomes[0]?.storyIds).toContain('chat-1');
    expect(second.outcomes[0]?.implementationStory.roles).toEqual(expect.arrayContaining(['ux_design']));
  });

  it('K: previously missed distinct surviving outcome can become one new canonical root', () => {
    const { outcomes } = reconstructHistoricalDevelopmentOutcomes({
      survivingPaths: [
        'src/pages/agreements/AgreementCreate.tsx',
        'src/lib/civizen-score.ts',
        'src/lib/civizen-score-model.ts',
        'src/lib/civizen-score-maturity.ts',
        'src/lib/civizen-contribution-score.ts',
      ],
      commits: [{
        sha: 'aa11aa11aa11',
        authoredAt: '2026-08-13T12:00:00.000Z',
        subject: 'Refine Agreements document-first editing',
        files: ['src/pages/agreements/AgreementCreate.tsx'],
      }],
      stories: [{
        id: 'chat-score',
        source: 'chat',
        originalInstruction: 'Define Score V2 evidence-maturity architecture so activity evaluation stays distinct from accumulated reputation.',
        title: 'Score evidence architecture',
        requestedAt: '2026-08-04T10:00:00.000Z',
        testsPassed: true,
      }],
    });
    expect(outcomes.some((item) => item.outcomeRootId.startsWith('historical:recall:'))).toBe(true);
    expect(outcomes.length).toBeGreaterThanOrEqual(2);
  });

  it('L: repeated reconstruction is deterministic', () => {
    const input = {
      survivingPaths: ['src/pages/agreements/AgreementCreate.tsx'],
      commits: [{
        sha: 'aa11aa11aa11',
        authoredAt: '2026-08-13T12:00:00.000Z',
        subject: 'Refine Agreements document-first editing',
        files: ['src/pages/agreements/AgreementCreate.tsx'],
      }],
      stories: [{
        id: 'chat-1',
        source: 'chat',
        originalInstruction: 'The roles should stay visible in the agreement text.',
        requestedAt: '2026-08-13T11:40:00.000Z',
      }],
    };
    const first = reconstructHistoricalDevelopmentOutcomes(input);
    const second = reconstructHistoricalDevelopmentOutcomes(input);
    expect(first.outcomes.map((item) => item.outcomeRootId)).toEqual(second.outcomes.map((item) => item.outcomeRootId));
    expect(first.outcomes.map((item) => [...item.storyIds].sort())).toEqual(second.outcomes.map((item) => [...item.storyIds].sort()));
    expect(groupDevelopmentStoriesToContributions(historicalStoriesForEvaluation(first.outcomes, input.stories))).toHaveLength(
      groupDevelopmentStoriesToContributions(historicalStoriesForEvaluation(second.outcomes, input.stories)).length,
    );
  });

  it('does not treat prompt count as a score input on the observation', () => {
    const events = contributionEventsFromDevelopmentStories('p1', planDevelopmentOutcomeStories({
      outcomeRootId: 'agreements-capability',
      title: 'Agreements capability refinement',
      instruction: 'This should behave like a document, not a form.',
      provenanceInstructions: Array.from({ length: 20 }, () => 'The roles should stay visible in the agreement text.'),
      createdFeatures: ['Agreements capability'],
      commitSha: 'abc1234def',
      testsPassed: true,
      implementationAssisted: true,
    }).stories);
    const view = evaluateContributionLifecycle(events[0]!);
    expect(view.impliesAdditivePoints).toBe(false);
    expect(view.humanSubstance?.promptCountUsedForScore).toBe(false);
  });
});
