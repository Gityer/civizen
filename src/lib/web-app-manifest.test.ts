import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Browsers only offer "Install app" when the page links a web app manifest with a name, a start URL, a standalone
 * display and icons of at least 192 and 512 px. Civizen had none until 31 Oct 2026, so phones never offered it.
 */
describe('web app manifest', () => {
  const root = process.cwd();
  const manifest = JSON.parse(readFileSync(join(root, 'public/manifest.webmanifest'), 'utf8')) as {
    name: string; short_name: string; start_url: string; display: string;
    icons: Array<{ src: string; sizes: string; type: string }>;
  };

  it('is linked from index.html', () => {
    expect(readFileSync(join(root, 'index.html'), 'utf8')).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
  });

  it('has what browsers need to offer installing the app', () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBe('Civizen');
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    const sizes = manifest.icons.map((icon) => icon.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
  });

  it('points only at icons that exist, with the size they declare', () => {
    for (const icon of manifest.icons) {
      const file = join(root, 'public', icon.src);
      expect(existsSync(file), icon.src).toBe(true);
      const header = readFileSync(file).subarray(16, 24);
      const [width, height] = [header.readUInt32BE(0), header.readUInt32BE(4)];
      expect(`${width}x${height}`).toBe(icon.sizes);
    }
  });
});
