import { describe, expect, it } from 'vitest';
import { baseTranslations } from '../../i18n.base';
import { applyCuratedTranslations, curatedTranslations } from './index';

type Tree = Record<string, unknown>;
const isTree = (v: unknown): v is Tree => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

function leaves(node: unknown, prefix = ''): Record<string, string> {
  if (typeof node === 'string') return { [prefix]: node };
  if (!isTree(node)) return {};
  return Object.entries(node).reduce<Record<string, string>>(
    (acc, [k, v]) => Object.assign(acc, leaves(v, prefix ? `${prefix}.${k}` : k)),
    {},
  );
}

const placeholders = (s: string) => [...s.matchAll(/\{\w+\}/g)].map((m) => m[0]).sort();

describe('curated governanceDashboard translations', () => {
  const english = leaves(baseTranslations.governanceDashboard);

  for (const language of Object.keys(curatedTranslations)) {
    it(`${language} covers every English key with identical placeholders`, () => {
      const curated = leaves(curatedTranslations[language].governanceDashboard);
      expect(Object.keys(curated).sort()).toEqual(Object.keys(english).sort());
      for (const [key, value] of Object.entries(english)) {
        expect(placeholders(curated[key]), key).toEqual(placeholders(value));
        expect(curated[key].trim(), key).not.toBe('');
      }
    });
  }

  for (const language of Object.keys(curatedTranslations)) {
    it(`${language} curated keys all exist in English with identical placeholders`, () => {
      const { governanceDashboard: _dashboard, ...rest } = curatedTranslations[language];
      const curated = leaves(rest);
      const englishAll = leaves(baseTranslations);
      const required = [
        'governanceHub.yourVote',
        'governanceHub.voteBlocked',
        'governanceHub.voteBlockedBySanction',
        'common.anonymousUser',
        'civicBallot.receiptTitle',
        'governanceMember.title',
        'proposalSupport.title',
        'notificationCenter.title',
        ...Object.keys(englishAll).filter((k) =>
          /^governanceHub\.(statuses\.(open|approved|rejected|cancelled)|voteChoices\.|decisionClasses\.|stewardIdentity\.)/.test(k),
        ),
      ];
      for (const key of required) {
        expect(curated[key], `${language} must curate ${key}`).toBeTruthy();
      }
      for (const [key, value] of Object.entries(curated)) {
        expect(englishAll[key], `${language} curates unknown key ${key}`).toBeTruthy();
        expect(placeholders(value), key).toEqual(placeholders(englishAll[key]));
        expect(value.trim(), key).not.toBe('');
      }
    });
  }

  it('overrides a machine-translated pack without dropping other groups', () => {
    const merged = applyCuratedTranslations('hy-AM', { common: { back: 'x' }, governanceDashboard: { title: 'bad' } });
    expect((merged.governanceDashboard as Tree).title).toBe('Կառավարում');
    expect((merged.common as Tree).back).toBe('x');
  });
});
