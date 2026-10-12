import { describe, expect, it } from 'vitest';
import { needsReinstallForSigning } from './app-updates';

/** Decision D10: the first release-signed build cannot be installed over the debug-signed testing app. */
describe('signing change between installed app and published update', () => {
  it('a debug-signed install needs a reinstall for a release-signed update, and not the other way round once signed', () => {
    expect(needsReinstallForSigning({ signing: 'release' }, 'debug')).toBe(true);
    expect(needsReinstallForSigning({ signing: 'release' }, 'release')).toBe(false);
    expect(needsReinstallForSigning({ signing: 'debug' }, 'debug')).toBe(false);
  });

  it('a manifest without the field is an older debug build', () => {
    expect(needsReinstallForSigning({}, 'debug')).toBe(false);
    expect(needsReinstallForSigning({}, 'release')).toBe(true);
  });
});
