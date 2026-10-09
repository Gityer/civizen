import { describe, expect, it } from 'vitest';
import { INSTITUTIONAL_DOCS, docTextFor, getInstitutionalDocByPath } from './institutional-docs';

/** Charter and pathway carry hand-written Armenian and Russian texts (Phase 8 step 8.1); English stays the reference. */
describe('institutional document translations', () => {
  const translated = ['mission', 'planetary-citizenship-pathway'];

  for (const id of translated) {
    for (const language of ['hy', 'ru'] as const) {
      it(`${id} has a ${language} text with the same structure as the English document`, () => {
        const doc = INSTITUTIONAL_DOCS.find((d) => d.id === id);
        expect(doc).toBeDefined();
        const text = docTextFor(doc!, language);
        expect(text.translated).toBe(true);
        expect(text.title).not.toBe(doc!.title);
        const headings = (markdown: string) => markdown.split('\n').filter((line) => /^#{1,3} /.test(line)).length;
        const bullets = (markdown: string) => markdown.split('\n').filter((line) => /^(-|\d+\.) /.test(line)).length;
        expect(headings(text.markdown)).toBe(headings(doc!.markdown));
        expect(bullets(text.markdown)).toBe(bullets(doc!.markdown));
        expect(text.markdown.startsWith('---')).toBe(false);
      });
    }
  }

  it('falls back to English for a language without a hand-written text, and for regional subtags of a translated one', () => {
    const doc = getInstitutionalDocByPath('/about/mission')!;
    expect(docTextFor(doc, 'de').translated).toBe(false);
    expect(docTextFor(doc, 'de').markdown).toBe(doc.markdown);
    expect(docTextFor(doc, 'hy-AM').translated).toBe(true);
    expect(docTextFor(getInstitutionalDocByPath('/transparency')!, 'hy').translated).toBe(false);
  });
});
