#!/usr/bin/env node
/**
 * Captures the phone screenshots shown on the public landing page ("See it in action").
 * Guest (signed-out) pages only, so no personal data ends up in public assets.
 *
 *   node scripts/capture-landing-screenshots.mjs [baseUrl]
 *
 * Needs the app running (default http://127.0.0.1:8080). Writes public/landing/<page>-<theme>.jpg.
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:8080';
const outDir = fileURLToPath(new URL('../public/landing/', import.meta.url));
const pages = [
  { id: 'voting', path: '/governance/voting' },
  { id: 'documents', path: '/documents' },
  { id: 'areas', path: '/areas' },
];
const themes = ['light', 'dark'];
const viewport = { width: 375, height: 760 };

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

for (const theme of themes) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    colorScheme: theme,
    reducedMotion: 'reduce',
  });
  await context.addInitScript((value) => {
    window.localStorage.setItem('civizen-theme-v1', value);
  }, theme);
  const page = await context.newPage();
  for (const { id, path } of pages) {
    await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    // The floating Civi launcher overlaps page content in a still image; hide it for the capture only.
    await page.addStyleTag({ content: '.fixed.bottom-4.right-4.z-50{display:none!important}' });
    const file = `${outDir}${id}-${theme}.jpg`;
    await page.screenshot({ path: file, type: 'jpeg', quality: 82, fullPage: false });
    console.log('saved', file);
  }
  await context.close();
}

await browser.close();
