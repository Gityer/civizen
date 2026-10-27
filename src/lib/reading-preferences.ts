/**
 * Reading preferences (text size, contrast, motion), kept per device like the theme and applied to `<html>` as data
 * attributes before the first render, so `index.css` can scale the root font size, strengthen colours and stop motion.
 */
export type TextSize = 'default' | 'large' | 'larger';
export type Contrast = 'standard' | 'high';
export type Motion = 'device' | 'reduce';
export type ReadingPreferences = { textSize: TextSize; contrast: Contrast; motion: Motion };

export const TEXT_SIZES: TextSize[] = ['default', 'large', 'larger'];
export const CONTRASTS: Contrast[] = ['standard', 'high'];
export const MOTIONS: Motion[] = ['device', 'reduce'];
export const DEFAULT_READING_PREFERENCES: ReadingPreferences = { textSize: 'default', contrast: 'standard', motion: 'device' };

const STORAGE_KEY = 'civizen-reading-v1';
const listeners = new Set<() => void>();
let current: ReadingPreferences | null = null;

export function parseReadingPreferences(raw: string | null): ReadingPreferences {
  try {
    const value = raw ? (JSON.parse(raw) as Partial<ReadingPreferences>) : {};
    return {
      textSize: TEXT_SIZES.includes(value.textSize as TextSize) ? (value.textSize as TextSize) : 'default',
      contrast: CONTRASTS.includes(value.contrast as Contrast) ? (value.contrast as Contrast) : 'standard',
      motion: MOTIONS.includes(value.motion as Motion) ? (value.motion as Motion) : 'device',
    };
  } catch {
    return DEFAULT_READING_PREFERENCES;
  }
}

function readStored(): ReadingPreferences {
  try {
    return parseReadingPreferences(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_READING_PREFERENCES;
  }
}

export function applyReadingPreferences(prefs: ReadingPreferences, root: HTMLElement = document.documentElement) {
  root.dataset.textSize = prefs.textSize;
  root.dataset.contrast = prefs.contrast;
  root.dataset.motion = prefs.motion;
}

export function getReadingPreferences(): ReadingPreferences {
  current ??= typeof window === 'undefined' ? DEFAULT_READING_PREFERENCES : readStored();
  return current;
}

export function setReadingPreferences(next: Partial<ReadingPreferences>) {
  current = { ...getReadingPreferences(), ...next };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // the choice still applies for this visit
  }
  applyReadingPreferences(current);
  listeners.forEach((listener) => listener());
}

export function subscribeReadingPreferences(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Called once from `main.tsx`, before React renders. */
export function initReadingPreferences() {
  if (typeof document !== 'undefined') applyReadingPreferences(getReadingPreferences());
}
