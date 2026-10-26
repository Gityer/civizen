import { describe, expect, it, vi } from 'vitest';

import { getErrorMessage, isChunkLoadError } from '@/lib/chunk-load-recovery';

describe('chunk-load-recovery', () => {
  it('detects Vite dynamic import failures', () => {
    expect(
      isChunkLoadError(
        new Error('Failed to fetch dynamically imported module: https://civizen.world/assets/toaster-D2zzfb8g.js'),
      ),
    ).toBe(true);
    expect(isChunkLoadError(new Error('Loading chunk 17 failed'))).toBe(true);
    expect(isChunkLoadError(new Error('ChunkLoadError'))).toBe(true);
  });

  it('ignores unrelated errors', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isChunkLoadError('network offline')).toBe(false);
  });

  it('stringifies unknown reasons safely', () => {
    expect(getErrorMessage({ code: 42 })).toContain('42');
  });
});

describe('reloadForNewDeployment retry window', () => {
  it('reloads once, refuses a second reload within the window, and allows one again after it', async () => {
    const { reloadForNewDeployment, BOOT_RECOVERY_RETRY_MS } = await import('@/lib/chunk-load-recovery');
    const replace = vi.fn();
    vi.stubGlobal('location', { href: 'https://civizen.world/?x=1', replace, reload: vi.fn() });
    window.sessionStorage.clear();
    const t0 = 1_800_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(t0);
    expect(reloadForNewDeployment()).toBe(true);
    expect(reloadForNewDeployment()).toBe(false);
    vi.spyOn(Date, 'now').mockReturnValue(t0 + BOOT_RECOVERY_RETRY_MS + 1);
    expect(reloadForNewDeployment()).toBe(true);
    expect(replace).toHaveBeenCalledTimes(2);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('treats the legacy flag value as an old attempt', async () => {
    const { reloadForNewDeployment } = await import('@/lib/chunk-load-recovery');
    vi.stubGlobal('location', { href: 'https://civizen.world/', replace: vi.fn(), reload: vi.fn() });
    window.sessionStorage.setItem('civizen-boot-recovery-attempted', '1');
    expect(reloadForNewDeployment()).toBe(true);
    vi.unstubAllGlobals();
  });
});

describe('index.html static landing shell', () => {
  it('is never painted for a visitor with a stored session', async () => {
    const fs = await import('node:fs');
    const html = fs.readFileSync('index.html', 'utf8');
    const shell = html.slice(html.indexOf('First paint before the app code arrives'));
    expect(shell).toMatch(/sb-\.\*-auth-token/);
    expect(shell.indexOf('auth-token')).toBeLessThan(shell.indexOf('root.innerHTML'));
  });
});

describe('web deploy is atomic for live clients', () => {
  it('puts assets in place before swapping index.html last', async () => {
    const fs = await import('node:fs');
    const script = fs.readFileSync('scripts/deploy-web-to-vps.sh', 'utf8');
    expect(script).not.toContain(String.raw`tar -C "\$ROOT" -xzf`);
    const assets = script.indexOf(String.raw`/assets/." "\$ROOT/assets/"`);
    const swap = script.indexOf(String.raw`mv -f "\$ROOT/.index.html.new" "\$ROOT/index.html"`);
    expect(assets).toBeGreaterThan(-1);
    expect(swap).toBeGreaterThan(assets);
  });
});
