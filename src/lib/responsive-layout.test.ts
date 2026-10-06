import { describe, expect, it } from 'vitest';

import {
  APP_DIRECTORY_MAX_CLASS,
  APP_SIDE_NAV_OFFSET_CLASS,
  DESKTOP_MIN_WIDTH_PX,
  PUBLIC_CHROME_MAX_CLASS,
  PUBLIC_DIRECTORY_MAX_CLASS,
  PUBLIC_READING_MAX_CLASS,
} from '@/lib/responsive-layout';

describe('responsive-layout', () => {
  it('keeps the desktop breakpoint aligned with Tailwind lg', () => {
    expect(DESKTOP_MIN_WIDTH_PX).toBe(1024);
    expect(APP_SIDE_NAV_OFFSET_CLASS).toContain('lg:pl-56');
    expect(PUBLIC_READING_MAX_CLASS).toBe('max-w-3xl');
    expect(PUBLIC_DIRECTORY_MAX_CLASS).toBe('max-w-5xl');
    expect(PUBLIC_CHROME_MAX_CLASS).toBe('max-w-6xl');
    expect(APP_DIRECTORY_MAX_CLASS).toBe('mx-auto w-full max-w-5xl');
  });
});
