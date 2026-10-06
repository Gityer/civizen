// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useShowOnScrollUp } from '@/hooks/useShowOnScrollUp';

function setScrollY(y: number) {
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    value: y,
    writable: true,
  });
}

describe('useShowOnScrollUp', () => {
  afterEach(() => {
    setScrollY(0);
  });

  it('stays visible near the top, hides on scroll down, and shows on scroll up', () => {
    setScrollY(0);
    const { result } = renderHook(() => useShowOnScrollUp({ threshold: 8, topOffset: 16 }));

    expect(result.current.visible).toBe(true);
    expect(result.current.scrolled).toBe(false);

    act(() => {
      setScrollY(80);
      window.dispatchEvent(new Event('scroll'));
    });
    expect(result.current.visible).toBe(false);
    expect(result.current.scrolled).toBe(true);

    act(() => {
      setScrollY(40);
      window.dispatchEvent(new Event('scroll'));
    });
    expect(result.current.visible).toBe(true);

    act(() => {
      setScrollY(10);
      window.dispatchEvent(new Event('scroll'));
    });
    expect(result.current.visible).toBe(true);
    expect(result.current.scrolled).toBe(false);
  });
});
