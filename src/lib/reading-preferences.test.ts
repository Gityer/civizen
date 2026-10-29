import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyReadingPreferences,
  getReadingPreferences,
  parseReadingPreferences,
  setReadingPreferences,
  subscribeReadingPreferences,
} from './reading-preferences';

describe('reading preferences', () => {
  beforeEach(() => window.localStorage.clear());

  it('falls back to defaults for missing, unknown or broken values', () => {
    expect(parseReadingPreferences(null)).toEqual({ textSize: 'default', contrast: 'standard', motion: 'device' });
    expect(parseReadingPreferences('{"textSize":"huge","contrast":"high"}')).toEqual({ textSize: 'default', contrast: 'high', motion: 'device' });
    expect(parseReadingPreferences('not json')).toEqual({ textSize: 'default', contrast: 'standard', motion: 'device' });
  });

  it('applies the choice to <html>, stores it and tells subscribers', () => {
    let calls = 0;
    const stop = subscribeReadingPreferences(() => { calls += 1; });
    setReadingPreferences({ textSize: 'larger', motion: 'reduce' });
    stop();
    const root = document.documentElement;
    expect(root.dataset.textSize).toBe('larger');
    expect(root.dataset.motion).toBe('reduce');
    expect(getReadingPreferences().contrast).toBe('standard');
    expect(parseReadingPreferences(window.localStorage.getItem('civizen-reading-v1')).textSize).toBe('larger');
    expect(calls).toBe(1);

    const other = document.createElement('div');
    applyReadingPreferences({ textSize: 'large', contrast: 'high', motion: 'device' }, other);
    expect(other.dataset.contrast).toBe('high');
  });
});
