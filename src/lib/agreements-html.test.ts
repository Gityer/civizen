// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import {
  agreementHtmlIsEmpty,
  agreementHtmlToPlainText,
  looksLikeAgreementHtml,
  sanitizeAgreementHtml,
  textToAgreementHtml,
} from '@/lib/agreements-html';

describe('agreement HTML helpers', () => {
  it('keeps allowed formatting and drops scripts', () => {
    const html = sanitizeAgreementHtml(
      '<p style="color: red; text-align: left; background: url(x)"><b>Bold</b><script>alert(1)</script></p>',
    );
    expect(html).toContain('<b>Bold</b>');
    expect(html).not.toContain('script');
    expect(html).not.toContain('alert');
    expect(html).toContain('color: red');
    expect(html).toContain('text-align: left');
    expect(html).not.toContain('background');
  });

  it('keeps font family on allowed markup', () => {
    const html = sanitizeAgreementHtml(
      '<span style="font-family: Georgia, serif; font-size: 16px">Scope</span><font face="Arial">Name</font>',
    );
    expect(html).toContain('font-family: Georgia, serif');
    expect(html).toContain('font-size: 16px');
    expect(html).toContain('face="Arial"');
  });

  it('converts lists and line breaks to readable plain text', () => {
    const text = agreementHtmlToPlainText('<ul><li>Check mail</li><li>Translate</li></ul>');
    expect(text).toContain('• Check mail');
    expect(text).toContain('• Translate');
  });

  it('treats empty markup as empty', () => {
    expect(agreementHtmlIsEmpty('<div><br></div>')).toBe(true);
    expect(agreementHtmlIsEmpty('<p>Scope</p>')).toBe(false);
  });

  it('escapes plain text and preserves HTML', () => {
    expect(textToAgreementHtml('Line one\nLine two')).toBe('Line one<br>Line two');
    expect(looksLikeAgreementHtml('<b>Hi</b>')).toBe(true);
    expect(textToAgreementHtml('<b>Hi</b>')).toContain('<b>Hi</b>');
  });
});
