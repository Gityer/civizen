// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { sanitizeAgreementHtml } from '@/lib/agreements-html';
import {
  applyPostSpacing,
  looksLikePostHtml,
  postHasSupportedFormatting,
  postHtmlIsEmpty,
  postHtmlToPlainText,
  sanitizePostHtml,
  serializePostContent,
  textToPostHtml,
} from '@/lib/posts-html';

describe('post HTML sanitization', () => {
  it('keeps supported formatting and drops scripts, events, and styles', () => {
    const html = sanitizePostHtml(
      '<p style="color:red" onclick="alert(1)"><b>Bold</b><i>Hi</i><script>alert(1)</script></p>',
    );
    expect(html).toContain('<b>Bold</b>');
    expect(html).toContain('<i>Hi</i>');
    expect(html).not.toContain('script');
    expect(html).not.toContain('alert');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('color');
  });

  it('rejects unsafe URLs and unknown tags without destroying surrounding text', () => {
    const html = sanitizePostHtml(
      'Hello <a href="javascript:alert(1)">link</a> <img src=x onerror=alert(1) /> world',
    );
    expect(html).toContain('Hello');
    expect(html).toContain('link');
    expect(html).toContain('world');
    expect(html).not.toContain('javascript');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<a');
  });

  it('does not keep agreement-only font and color markup on posts', () => {
    const html = sanitizePostHtml(
      '<span style="font-size:24px;color:#f00">Big</span><font face="Arial">Name</font>',
    );
    expect(html).not.toContain('font-size');
    expect(html).not.toContain('color');
    expect(html).not.toContain('face=');
    expect(html).toContain('Big');
    expect(html).toContain('Name');
  });

  it('still lets agreements keep document styles', () => {
    const html = sanitizeAgreementHtml(
      '<p style="color: red; text-align: left; background: url(x)"><b>Bold</b></p>',
    );
    expect(html).toContain('<b>Bold</b>');
    expect(html).toContain('color: red');
    expect(html).toContain('text-align: left');
    expect(html).not.toContain('background');
  });

  it('keeps restrained line-height presets and drops other styles', () => {
    const html = sanitizePostHtml(
      '<div style="line-height: 2; color: red; font-size: 24px">Spaced</div>',
    );
    expect(html).toContain('line-height: 2');
    expect(html).not.toContain('color');
    expect(html).not.toContain('font-size');
    expect(postHasSupportedFormatting('<div style="line-height: 1.6">Hello</div>')).toBe(true);
    expect(serializePostContent('<div style="line-height: 1.6">Hello</div>')).toContain('line-height: 1.6');
  });

  it('rejects unsafe or arbitrary line-height values', () => {
    const html = sanitizePostHtml('<div style="line-height: 12; line-height: expression(alert(1))">X</div>');
    expect(html).not.toContain('line-height');
    expect(html).toContain('X');
  });

  it('applies a line-height preset and reuses a single wrapper', () => {
    const editor = document.createElement('div');
    editor.innerHTML = 'Line one<br>Line two';
    applyPostSpacing(editor, 'loose');
    expect(editor.childElementCount).toBe(1);
    expect(editor.firstElementChild?.getAttribute('style')).toBe('line-height: 2');
    applyPostSpacing(editor, 'tight');
    expect(editor.childElementCount).toBe(1);
    expect(editor.firstElementChild?.getAttribute('style')).toBe('line-height: 1.25');
    expect(serializePostContent(editor.innerHTML)).toContain('line-height: 1.25');
  });

  it('serializes unformatted posts as plain text and formatted posts as HTML', () => {
    expect(serializePostContent('Hello<br>there')).toBe('Hello\nthere');
    expect(serializePostContent('<b>Hello</b>')).toContain('<b>Hello</b>');
    expect(postHasSupportedFormatting('<b>Hello</b>')).toBe(true);
    expect(postHasSupportedFormatting('Hello<br>there')).toBe(false);
  });

  it('round-trips supported formatting after an edit-style serialize/sanitize pass', () => {
    const stored = serializePostContent(
      '<div><b>Bold</b> and <i>italic</i><script>alert(1)</script></div>',
    );
    expect(stored).toContain('<b>Bold</b>');
    expect(stored).toContain('<i>italic</i>');
    expect(stored).not.toContain('script');
    const rendered = sanitizePostHtml(stored);
    expect(rendered).toContain('<b>Bold</b>');
    expect(rendered).toContain('<i>italic</i>');
    expect(rendered).not.toContain('script');
  });

  it('treats legacy plain text as not HTML and round-trips through the editor helper', () => {
    const legacy = 'Peace needs practical systems.\nSecond line.';
    expect(looksLikePostHtml(legacy)).toBe(false);
    expect(postHtmlToPlainText(legacy)).toBe(legacy);
    expect(textToPostHtml(legacy)).toContain('Peace needs practical systems.<br>Second line.');
    expect(postHtmlIsEmpty('<div><br></div>')).toBe(true);
  });
});
