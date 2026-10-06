import { describe, expect, it } from 'vitest';

import {
  buildStudyAiExplanation,
  createFoundationProgressMap,
  deriveFoundationCertificationStatus,
  filterStudyDocumentsByQuery,
  getFoundationMaterialsForDomain,
  FOUNDATION_STUDY_DOCUMENT_KEYS,
  getFoundationCompletionMetrics,
  isMissingStudyBackend,
  STUDY_DOCUMENTS,
} from '@/lib/study';

describe('study module', () => {
  it('detects missing study-related backend errors', () => {
    expect(
      isMissingStudyBackend({
        code: '42P01',
        message: 'relation "study_progress" does not exist',
        details: null,
      }),
    ).toBe(true);

    expect(
      isMissingStudyBackend({
        code: 'PGRST205',
        message: 'Could not find the table public.study_bookmarks in the schema cache',
        details: null,
      }),
    ).toBe(true);

    expect(
      isMissingStudyBackend({
        code: null,
        message: 'function monetary_policy_profiles() does not exist',
        details: null,
      }),
    ).toBe(true);

    expect(
      isMissingStudyBackend({
        code: null,
        message: 'relation "study_bookmarks" does not exist',
        details: null,
      }),
    ).toBe(true);

    expect(isMissingStudyBackend(null)).toBe(false);

    expect(
      isMissingStudyBackend({
        code: '23505',
        message: 'duplicate key value violates unique constraint',
        details: null,
      }),
    ).toBe(false);
  });

  it('calculates foundational completion metrics from progress values', () => {
    const metrics = getFoundationCompletionMetrics({
      constitution: 100,
      laws: 100,
      citizenship: 0,
      economy: 100,
    });

    expect(metrics.completed).toBe(3);
    expect(metrics.total).toBe(FOUNDATION_STUDY_DOCUMENT_KEYS.length);
    expect(metrics.percent).toBe(75);
    expect(metrics.isComplete).toBe(false);
  });

  it('builds a default foundation progress map with optional overrides', () => {
    const baseline = createFoundationProgressMap();
    expect(baseline).toEqual({
      constitution: 0,
      laws: 0,
      citizenship: 0,
      economy: 0,
    });

    expect(
      createFoundationProgressMap({
        constitution: 40,
        economy: 100,
      }),
    ).toEqual({
      constitution: 40,
      laws: 0,
      citizenship: 0,
      economy: 100,
    });
  });

  it('returns all study documents when the search query is empty', () => {
    expect(
      filterStudyDocumentsByQuery(
        STUDY_DOCUMENTS,
        '   ',
        (document) => document.titleKey,
        (document) => document.summaryKey,
      ),
    ).toEqual(STUDY_DOCUMENTS);
  });

  it('derives certification status with earned state treated as sticky', () => {
    const completeProgress = {
      constitution: 100,
      laws: 100,
      citizenship: 100,
      economy: 100,
    };

    expect(deriveFoundationCertificationStatus(completeProgress, 'pending')).toBe('eligible');
    expect(deriveFoundationCertificationStatus({ constitution: 100 }, 'pending')).toBe('pending');
    expect(deriveFoundationCertificationStatus({ constitution: 0 }, 'earned')).toBe('earned');
  });

  it('filters study documents using titles, summaries, and keyword metadata', () => {
    const byKeyword = filterStudyDocumentsByQuery(
      STUDY_DOCUMENTS,
      'monetary',
      (document) => document.titleKey,
      (document) => document.summaryKey,
    );
    const byDomain = filterStudyDocumentsByQuery(
      STUDY_DOCUMENTS,
      'citizenship',
      (document) => document.titleKey,
      (document) => document.summaryKey,
    );

    expect(byKeyword.some((document) => document.key === 'economy')).toBe(true);
    expect(byDomain.some((document) => document.key === 'citizenship')).toBe(true);
  });

  it('builds an AI explanation sentence with key learning context', () => {
    const explanation = buildStudyAiExplanation({
      title: 'Constitution',
      summary: 'Foundational civic principles and constitutional framework.',
      domainLabel: 'Constitution',
      estimatedMinutes: 18,
    });

    expect(explanation).toContain('Constitution belongs to the Constitution learning domain.');
    expect(explanation).toContain('about 18 minutes');
  });

  it('returns foundational materials for each primary domain', () => {
    const constitutionMaterials = getFoundationMaterialsForDomain('constitution');
    const economyMaterials = getFoundationMaterialsForDomain('economy');

    expect(constitutionMaterials.length).toBeGreaterThan(0);
    expect(economyMaterials.length).toBeGreaterThan(0);
    expect(constitutionMaterials.every((material) => material.domainId === 'constitution')).toBe(true);
  });
});
