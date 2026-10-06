// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { buildCivizenContext, stripsSensitiveContext } from '@/lib/civizen-context-model';
import { scoreContributionsFromEvents, type ContributionEvent } from '@/lib/civizen-contributions';
import { classifyReconstructionRecall, recoverUnlinkedSurvivingOutcomes } from '@/lib/civizen-historical-reconstruction-recall';
import { reconstructHistoricalDevelopmentOutcomes } from '@/lib/civizen-historical-reconstruction';

function event(overrides: Partial<ContributionEvent> & { sourceId: string }): ContributionEvent {
  return {
    profileId: 'p1',
    sourceTable: 'development_stories',
    sourceId: overrides.sourceId,
    eventType: 'development_story',
    title: overrides.title ?? 'Score V2 evidence architecture',
    summary: null,
    capacityEstimate: 78,
    impactEstimate: 78,
    collaborationEstimate: 35,
    beneficiaryEstimate: 75,
    verified: true,
    occurredAt: overrides.occurredAt ?? '2026-08-04T12:00:00.000Z',
    rawMeta: overrides.rawMeta ?? { testsPassed: true },
  };
}

describe('civizen context and reconstruction recall', () => {
  it('S: declared interest does not change reputation', () => {
    const events = [event({ sourceId: 'a' })];
    const without = scoreContributionsFromEvents(events)!;
    const withDeclared = buildCivizenContext({
      events,
      declared: { interests: ['Education', 'Workforce development'] },
    });
    expect(withDeclared.declared.interests).toContain('Education');
    expect(withDeclared.scoringBonusApplied).toBe(false);
    expect(scoreContributionsFromEvents(events)!.score).toBe(without.score);
  });

  it('T: recent focus can change without rewriting long-term history', () => {
    const historical = event({
      sourceId: 'old',
      title: 'HR workforce development tools',
      occurredAt: '2025-01-01T00:00:00.000Z',
      rawMeta: { contributionFunction: 'documentation', testsPassed: true },
    });
    const recent = event({
      sourceId: 'new',
      title: 'Score V2 evidence architecture',
      occurredAt: '2026-08-01T00:00:00.000Z',
    });
    const context = buildCivizenContext({ events: [historical, recent], nowMs: Date.parse('2026-08-13T00:00:00.000Z') });
    expect(context.historical.projects.some((item) => /workforce/i.test(item))).toBe(true);
    expect(context.currentFocus.functions).toContain('system_architecture');
    expect(context.historical.functions.length).toBeGreaterThanOrEqual(context.currentFocus.functions.length);
  });

  it('U: sensitive attributes are not inferred or used', () => {
    expect(stripsSensitiveContext('political ideology')).toBe(true);
    const context = buildCivizenContext({
      events: [event({ sourceId: 'a' })],
      declared: { interests: ['political ideology', 'System architecture'] },
    });
    expect(context.declared.interests).not.toContain('political ideology');
    expect(context.sensitiveInferences).toEqual([]);
    expect(context.scoringBonusApplied).toBe(false);
  });

  it('X: substantive implemented outcomes are not discarded merely because several prompts supported them', () => {
    const surviving = [
      'src/lib/civizen-score.ts',
      'src/lib/civizen-score-model.ts',
      'src/lib/civizen-score-maturity.ts',
      'src/pages/auth/Login.tsx',
      'src/pages/auth/SignUp.tsx',
      'src/contexts/AuthContext.tsx',
    ];
    const reconstructed = reconstructHistoricalDevelopmentOutcomes({
      survivingPaths: surviving,
      commits: [
        {
          sha: 'aa11aa11aa11',
          authoredAt: '2026-08-11T10:00:00.000Z',
          subject: 'Define Score V2 evidence-maturity architecture',
          files: ['src/lib/civizen-score.ts', 'src/lib/civizen-score-model.ts'],
        },
      ],
      stories: [
        {
          id: 'prompt-1',
          originalInstruction: 'Define Score V2 evidence-maturity architecture so activity evaluation stays distinct.',
          requestedAt: '2026-08-11T09:50:00.000Z',
        },
        {
          id: 'prompt-2',
          originalInstruction: 'Please continue the Score V2 evidence-maturity architecture work after review.',
          requestedAt: '2026-08-11T09:55:00.000Z',
        },
        {
          id: 'login-lockout',
          title: 'Web login signup lockout correction',
          originalInstruction: 'Correct the web login signup lockout so AuthContext recovers when profiles fetch fails.',
          requestedAt: '2026-08-10T12:00:00.000Z',
        },
      ],
    });
    expect(reconstructed.outcomes.some((item) => /Score V2/i.test(item.title))).toBe(true);
    const recall = classifyReconstructionRecall({
      stories: reconstructed.outcomes.flatMap((item) => item.storyIds).length
        ? [
            { id: 'prompt-1', originalInstruction: 'Define Score V2 evidence-maturity architecture so activity evaluation stays distinct.' },
            { id: 'prompt-2', originalInstruction: 'Please continue the Score V2 evidence-maturity architecture work after review.' },
            { id: 'login-lockout', title: 'Web login signup lockout correction', originalInstruction: 'Correct the web login signup lockout so AuthContext recovers when profiles fetch fails.' },
          ]
        : [],
      outcomes: reconstructed.outcomes,
      survivingPaths: surviving,
    });
    expect(recall.filter((item) => item.bucket === 'attached_to_outcome').length).toBeGreaterThan(0);
    const recovered = recoverUnlinkedSurvivingOutcomes({
      stories: [{
        id: 'login-lockout',
        title: 'Web login signup lockout correction',
        originalInstruction: 'Correct the web login signup lockout so AuthContext recovers when profiles fetch fails.',
      }],
      outcomes: reconstructed.outcomes.filter((item) => /Score V2/i.test(item.title)),
      survivingPaths: surviving,
    });
    expect(recovered.some((item) => /login|lockout|Auth/i.test(item.title + item.instruction))).toBe(true);
  });
});
