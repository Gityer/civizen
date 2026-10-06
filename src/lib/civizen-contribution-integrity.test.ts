// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import {
  classifyUnpersistedCluster,
  unmatchedPersistedRoots,
} from '@/lib/civizen-contribution-integrity';
import {
  classifyHumanProvenance,
  classifyHumanProvenanceText,
  evaluationProvenanceInstructions,
  involvementFromClassifications,
} from '@/lib/civizen-contribution-provenance';
import { evaluateContributionLifecycle } from '@/lib/civizen-contribution-lifecycle';
import {
  contributionEventsFromDevelopmentStories,
  planDevelopmentOutcomeStories,
} from '@/lib/civizen-development-capture';
import { groupDevelopmentStoriesToContributions } from '@/lib/civizen-development-evidence';
import { assessHumanContributionSubstance } from '@/lib/civizen-human-contribution-substance';
import { reconstructHistoricalDevelopmentOutcomes } from '@/lib/civizen-historical-reconstruction';
import type { ContributionEvent } from '@/lib/civizen-contributions';

function event(rawMeta: Record<string, unknown>, title = 'Agreements document-first editing'): ContributionEvent {
  return {
    profileId: 'p1',
    sourceTable: 'development_stories',
    sourceId: 'outcome:historical:aa11aa11aa11',
    eventType: 'development_story',
    title,
    summary: null,
    capacityEstimate: 78,
    impactEstimate: 78,
    collaborationEstimate: 35,
    beneficiaryEstimate: 75,
    verified: true,
    occurredAt: '2026-08-13T12:00:00.000Z',
    rawMeta: {
      eligibility: 'system_verified',
      testsPassed: true,
      reconstruction: true,
      implementationAssisted: true,
      affectedPaths: ['src/pages/agreements/AgreementCreate.tsx'],
      ...rawMeta,
    },
  };
}

describe('provenance integrity', () => {
  it('A: ambiguous provenance alone does not increase human substance', () => {
    const baseline = evaluateContributionLifecycle(event({
      contributionRoles: ['founder', 'product_direction', 'review'],
      linkedInstructions: [],
    }));
    const withAmbiguous = evaluateContributionLifecycle(event({
      contributionRoles: ['founder', 'product_direction', 'review'],
      linkedInstructions: ['Do a second-pass.', 'I was thinking about several unspecified alternatives.'],
    }));
    expect(classifyHumanProvenanceText('Do a second-pass.').contributionBearing).toBe(false);
    expect(evaluationProvenanceInstructions(['Do a second-pass.', 'I was thinking about several unspecified alternatives.'])).toEqual([]);
    expect(withAmbiguous.humanSubstance?.level).toBe(baseline.humanSubstance?.level);
    expect(withAmbiguous.observation).toBe(baseline.observation);
    expect(withAmbiguous.roles.filter((role) => role !== 'founder').sort()).toEqual(
      baseline.roles.filter((role) => role !== 'founder').sort(),
    );
  });

  it('B: ambiguous plus corroborating implementation may become supported provenance', () => {
    const isolated = classifyHumanProvenanceText('Not yet.');
    const corroborated = classifyHumanProvenance({
      instruction: 'Not yet.',
      precededByImplementation: true,
      followedByImplementation: true,
      overlappingOutcome: true,
    });
    expect(isolated.contributionBearing).toBe(false);
    expect(isolated.disposition).not.toBe('process_casual');
    expect(corroborated.contributionBearing).toBe(true);
    expect(corroborated.functions).toEqual(expect.arrayContaining(['review', 'quality_control']));
  });

  it('C: founder vs ordinary contributor with identical demonstrated actions is identical', () => {
    const actions = {
      title: 'Agreements document-first editing',
      instruction: 'This should behave like a document, not a form.',
      linkedInstructions: ['The roles should stay visible in the agreement text.'],
      implementationAssisted: true,
      testsPassed: true,
      structuralSignificance: 'moderate' as const,
    };
    const ordinary = assessHumanContributionSubstance({
      ...actions,
      roles: ['ux_design', 'requirements', 'review'],
    });
    const founder = assessHumanContributionSubstance({
      ...actions,
      roles: ['founder', 'ux_design', 'requirements', 'review'],
    });
    expect(founder.level).toBe(ordinary.level);
    expect(founder.overall).toBe(ordinary.overall);
    expect(founder.dimensions).toEqual(ordinary.dimensions);
  });

  it('D: 50 repeated identical corrections do not linearly grow substance', () => {
    const repeated = Array.from({ length: 50 }, () => ({
      text: 'The calendar goes outside the visible screen.',
      classification: classifyHumanProvenanceText('The calendar goes outside the visible screen.'),
    }));
    const few = repeated.slice(0, 3);
    const involvementMany = involvementFromClassifications(repeated);
    const involvementFew = involvementFromClassifications(few);
    expect(involvementMany.substantiveInteractions).toBe(1);
    expect(involvementMany.revisionCycles).toBe(involvementFew.revisionCycles);
    expect(involvementMany.promptCountUsedForScore).toBe(false);
    const manyView = evaluateContributionLifecycle(event({
      contributionRoles: ['ux_design', 'quality_assurance', 'review'],
      linkedInstructions: repeated.map((item) => item.text),
      humanInvolvement: involvementMany,
    }));
    const fewView = evaluateContributionLifecycle(event({
      contributionRoles: ['ux_design', 'quality_assurance', 'review'],
      linkedInstructions: few.map((item) => item.text),
      humanInvolvement: involvementFew,
    }));
    expect(manyView.humanSubstance?.level).toBe(fewView.humanSubstance?.level);
    expect(manyView.observation).toBe(fewView.observation);
  });

  it('E: distinct review cycles establish iterative control on one root', () => {
    const planned = planDevelopmentOutcomeStories({
      outcomeRootId: 'agreements-calendar',
      title: 'Agreements calendar viewport',
      instruction: 'The calendar goes outside the visible screen.',
      provenanceInstructions: [
        'The calendar goes outside the visible screen.',
        'That still does not work. The roles should stay visible in the agreement text.',
        'Fix this. Keep the calendar inside the viewport.',
      ],
      createdFeatures: ['Agreement date calendar'],
      commitSha: 'abc1234def',
      testsPassed: true,
      implementationAssisted: true,
    });
    expect(groupDevelopmentStoriesToContributions(planned.stories)).toHaveLength(1);
    const view = evaluateContributionLifecycle(contributionEventsFromDevelopmentStories('p1', planned.stories)[0]!);
    expect(view.humanSubstance?.dimensions.iterative_control === 'moderate'
      || view.humanSubstance?.dimensions.iterative_control === 'high').toBe(true);
  });

  it('F: overlapping cluster does not mint a duplicate root', () => {
    const existing = [{
      sourceId: 'outcome:historical:aa11aa11aa11',
      title: 'Refine Agreements document-first editing',
      affectedPaths: ['src/pages/agreements/AgreementCreate.tsx', 'src/pages/agreements/AgreementCreate.test.tsx'],
      commitShas: ['aa11aa11aa11'],
    }];
    const classified = classifyUnpersistedCluster({
      outcomeRootId: 'historical:bb22bb22bb22',
      title: 'Polish Agreements document-first create tokens',
      affectedPaths: ['src/pages/agreements/AgreementCreate.tsx'],
      commitShas: ['bb22bb22bb22'],
      result: 'reconstructed',
      contributionEvidenceConfidence: 'moderate',
      survivingImplementation: true,
      testsPassed: true,
    }, existing);
    expect(['duplicate_representation', 'overlapping_cluster']).toContain(classified.reason);
    const { outcomes } = reconstructHistoricalDevelopmentOutcomes({
      survivingPaths: ['src/pages/agreements/AgreementCreate.tsx'],
      commits: [
        {
          sha: 'aa11aa11aa11',
          authoredAt: '2026-08-13T12:00:00.000Z',
          subject: 'Refine Agreements document-first editing',
          files: ['src/pages/agreements/AgreementCreate.tsx'],
        },
        {
          sha: 'bb22bb22bb22',
          authoredAt: '2026-08-13T12:20:00.000Z',
          subject: 'Polish Agreements document-first create tokens',
          files: ['src/pages/agreements/AgreementCreate.tsx'],
        },
      ],
    });
    expect(outcomes).toHaveLength(1);
  });

  it('G: genuinely disjoint verified outcome stays eligible regardless of existing root count', () => {
    const existing = Array.from({ length: 87 }, (_, i) => ({
      sourceId: `outcome:historical:${i.toString().padStart(12, '0')}`,
      title: `Existing outcome ${i}`,
      affectedPaths: [`src/pages/existing/File${i}.tsx`],
      commitShas: [i.toString().padStart(12, '0')],
    }));
    const classified = classifyUnpersistedCluster({
      outcomeRootId: 'historical:recall:login-lockout',
      title: 'Web login signup lockout correction',
      affectedPaths: ['src/pages/auth/Login.tsx', 'src/pages/auth/SignUp.tsx', 'src/contexts/AuthContext.tsx'],
      commitShas: [],
      result: 'reconstructed_with_uncertainty',
      contributionEvidenceConfidence: 'moderate',
      survivingImplementation: true,
      testsPassed: true,
    }, existing);
    expect(classified.reason).toBe('genuinely_distinct_qualifying');
  });

  it('H: persisted root missing from reconstruction is explicit, never silently trusted', () => {
    const existing = [
      {
        sourceId: 'outcome:historical:deadbeef0001',
        title: 'Historical outcome no longer in current reconstruction',
        affectedPaths: ['src/legacy/Removed.tsx'],
        commitShas: ['deadbeef0001'],
      },
      {
        sourceId: 'outcome:historical:aa11aa11aa11',
        title: 'Refine Agreements document-first editing',
        affectedPaths: ['src/pages/agreements/AgreementCreate.tsx'],
        commitShas: ['aa11aa11aa11'],
      },
    ];
    const unmatched = unmatchedPersistedRoots(existing, ['outcome:historical:aa11aa11aa11']);
    expect(unmatched).toHaveLength(1);
    expect(unmatched[0]?.sourceId).toBe('outcome:historical:deadbeef0001');
  });

  it('does not treat a bootstrap template snapshot as a distinct product outcome', () => {
    expect(classifyUnpersistedCluster({
      outcomeRootId: 'historical:b331aa1a7d54',
      title: 'template: new_style_vite_react_shadcn_ts_testing_2026-01-08',
      affectedPaths: ['src/lib/agreements-templates.ts', 'src/components/public/onboarding-styles.ts', '.github/pull_request_template.md'],
      commitShas: ['b331aa1a7d54'],
      result: 'reconstructed',
      contributionEvidenceConfidence: 'high',
      survivingImplementation: true,
      testsPassed: true,
    }, [])).toMatchObject({ reason: 'other' });
  });
});
