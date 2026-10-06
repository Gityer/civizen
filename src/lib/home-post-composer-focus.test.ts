// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { focusHomePostComposerFromChrome } from '@/lib/home-post-composer-focus';

describe('focusHomePostComposerFromChrome', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('focuses the editor when pointerdown lands on field chrome', () => {
    const editor = document.createElement('div');
    editor.tabIndex = 0;
    editor.setAttribute('contenteditable', 'true');
    const chrome = document.createElement('div');
    chrome.append(editor);
    document.body.append(chrome);

    const preventDefault = vi.fn();
    const focused = focusHomePostComposerFromChrome(
      { target: chrome, preventDefault },
      editor,
    );

    expect(focused).toBe(true);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(editor);
  });

  it('does not steal native caret placement when the editor is the target', () => {
    const editor = document.createElement('div');
    editor.tabIndex = 0;
    document.body.append(editor);

    const preventDefault = vi.fn();
    const focused = focusHomePostComposerFromChrome(
      { target: editor, preventDefault },
      editor,
    );

    expect(focused).toBe(false);
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('no-ops while posting is disabled', () => {
    const editor = document.createElement('div');
    editor.tabIndex = 0;
    document.body.append(editor);
    const chrome = document.createElement('div');

    const preventDefault = vi.fn();
    const focused = focusHomePostComposerFromChrome(
      { target: chrome, preventDefault },
      editor,
      { disabled: true },
    );

    expect(focused).toBe(false);
    expect(preventDefault).not.toHaveBeenCalled();
  });
});
