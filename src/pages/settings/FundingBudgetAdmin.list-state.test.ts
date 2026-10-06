import { describe, expect, it } from 'vitest';

import type { ProjectBudgetRow } from '@/lib/finance/budget-api';
import { budgetLifecycleBadgeKey, budgetSelectorSizingLabel, classifyBudgetListState, historicalBudgetsForSelector, ordinaryBudgetsForSelector, partitionBudgetsForSelector, preferredWorkingBudgetId, primaryBudgetWorkflowAction, shouldUseBudgetSelector } from '@/pages/settings/FundingBudgetAdmin.list-state';

function budget(partial: Partial<ProjectBudgetRow> & Pick<ProjectBudgetRow, 'id' | 'name'>): ProjectBudgetRow {
  return {
    version: 1,
    currency: 'USD',
    lifecycle_status: 'draft',
    is_demonstration: false,
    purpose: null,
    published_at: null,
    submitted_by: null,
    ...partial,
  } as ProjectBudgetRow;
}

describe('classifyBudgetListState', () => {
  it('distinguishes loading, empty, access denied, load failed, and ready', () => {
    expect(
      classifyBudgetListState({
        loading: true,
        allowView: true,
        error: null,
        budgetCount: 0,
        selectedId: null,
      }),
    ).toBe('loading');

    expect(
      classifyBudgetListState({
        loading: false,
        allowView: false,
        error: null,
        budgetCount: 0,
        selectedId: null,
      }),
    ).toBe('access_denied');

    expect(
      classifyBudgetListState({
        loading: false,
        allowView: true,
        error: 'permission denied by RLS',
        budgetCount: 0,
        selectedId: null,
      }),
    ).toBe('access_denied');

    expect(
      classifyBudgetListState({
        loading: false,
        allowView: true,
        error: 'network down',
        budgetCount: 0,
        selectedId: null,
      }),
    ).toBe('load_failed');

    expect(
      classifyBudgetListState({
        loading: false,
        allowView: true,
        error: null,
        budgetCount: 0,
        selectedId: null,
      }),
    ).toBe('empty');

    expect(
      classifyBudgetListState({
        loading: false,
        allowView: true,
        error: null,
        budgetCount: 1,
        selectedId: null,
      }),
    ).toBe('no_selection');

    expect(
      classifyBudgetListState({
        loading: false,
        allowView: true,
        error: null,
        budgetCount: 1,
        selectedId: 'b1',
      }),
    ).toBe('ready');
  });
});

describe('partitionBudgetsForSelector', () => {
  it('groups demonstration budgets separately from active budgets', () => {
    const rows = [
      budget({ id: 'v', name: 'Validation', is_demonstration: false }),
      budget({ id: 'd', name: 'Draft demo', is_demonstration: true }),
      budget({ id: 'a', name: 'Another', is_demonstration: false }),
    ];
    const partitioned = partitionBudgetsForSelector(rows);
    expect(partitioned.active.map((b) => b.id)).toEqual(['v', 'a']);
    expect(partitioned.demonstration.map((b) => b.id)).toEqual(['d']);
  });
});

describe('ordinaryBudgetsForSelector', () => {
  it('excludes demonstration fixtures from ordinary Budget selection', () => {
    const rows = [
      budget({ id: 'v', name: 'Civizen Pre-Major-Build Validation Program v0.1', is_demonstration: false }),
      budget({ id: 'd', name: 'Civizen Draft Budget v0.1', is_demonstration: true }),
    ];
    expect(ordinaryBudgetsForSelector(rows).map((b) => b.id)).toEqual(['v']);
  });

  it('excludes superseded revisions from the primary selector', () => {
    const rows = [
      budget({
        id: 'v03',
        name: 'Civizen Pre-Major-Build Validation Program v0.3',
        lifecycle_status: 'draft',
      }),
      budget({
        id: 'v02',
        name: 'Civizen Pre-Major-Build Validation Program v0.2',
        lifecycle_status: 'superseded',
      }),
    ];
    expect(ordinaryBudgetsForSelector(rows).map((b) => b.id)).toEqual(['v03']);
    expect(historicalBudgetsForSelector(rows).map((b) => b.id)).toEqual(['v02']);
  });
});

describe('preferredWorkingBudgetId', () => {
  it('prefers Validation Program v0.3 over earlier revisions', () => {
    const rows = [
      budget({ id: 'v01', name: 'Civizen Pre-Major-Build Validation Program v0.1' }),
      budget({ id: 'v02', name: 'Civizen Pre-Major-Build Validation Program v0.2' }),
      budget({ id: 'v03', name: 'Civizen Pre-Major-Build Validation Program v0.3' }),
    ];
    expect(preferredWorkingBudgetId(rows)).toBe('v03');
  });
});

describe('shouldUseBudgetSelector', () => {
  it('hides the dropdown when there is only one ordinary budget', () => {
    expect(shouldUseBudgetSelector(0)).toBe(false);
    expect(shouldUseBudgetSelector(1)).toBe(false);
    expect(shouldUseBudgetSelector(2)).toBe(true);
  });
});

describe('budgetSelectorSizingLabel', () => {
  it('sizes to the longest option name', () => {
    expect(
      budgetSelectorSizingLabel(
        [{ name: 'Short' }, { name: 'A much longer budget name' }],
        'Short',
      ),
    ).toBe('A much longer budget name');
  });
});

describe('budgetLifecycleBadgeKey', () => {
  it('maps lifecycle statuses to compact badge keys', () => {
    expect(budgetLifecycleBadgeKey('draft')).toBe('draft');
    expect(budgetLifecycleBadgeKey('under_review')).toBe('review');
    expect(budgetLifecycleBadgeKey('approved')).toBe('approved');
  });
});

describe('primaryBudgetWorkflowAction', () => {
  it('returns submit for editable drafts', () => {
    expect(
      primaryBudgetWorkflowAction({
        lifecycleStatus: 'draft',
        publishedAt: null,
        editable: true,
        canApproveSelected: false,
        allowEdit: true,
        allowPublish: false,
      }),
    ).toBe('submit');
  });

  it('returns approve when under review and allowed', () => {
    expect(
      primaryBudgetWorkflowAction({
        lifecycleStatus: 'under_review',
        publishedAt: null,
        editable: false,
        canApproveSelected: true,
        allowEdit: true,
        allowPublish: true,
      }),
    ).toBe('approve');
  });

  it('prefers publish for approved unpublished budgets', () => {
    expect(
      primaryBudgetWorkflowAction({
        lifecycleStatus: 'approved',
        publishedAt: null,
        editable: false,
        canApproveSelected: false,
        allowEdit: true,
        allowPublish: true,
      }),
    ).toBe('publish');
  });

  it('prefers revise when approved and already published', () => {
    expect(
      primaryBudgetWorkflowAction({
        lifecycleStatus: 'approved',
        publishedAt: '2026-01-01',
        editable: false,
        canApproveSelected: false,
        allowEdit: true,
        allowPublish: true,
      }),
    ).toBe('revise');
  });
});
