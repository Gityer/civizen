#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const baseUrl = (process.argv[2] ?? 'http://127.0.0.1:8080').replace(/\/$/, '');

function loadCreds() {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const email = env.match(/^TEST_USER_ROLE_MEMBER_EMAIL=(.+)$/m)?.[1]?.trim();
  const password = env.match(/^TEST_USER_ROLE_MEMBER_PASSWORD=(.+)$/m)?.[1]?.trim();
  if (!email || !password) throw new Error('Missing TEST_USER_ROLE_MEMBER_* in .env.local');
  return { email, password };
}

function rotationFromTransform(transform) {
  if (!transform) return 0;
  const match = transform.match(/rotate\((-?\d+(\.\d+)?)deg\)/);
  return match ? Number(match[1]) : 0;
}

const VIEWPORT_WIDTHS = [390, 412, 430];
const REQUIRED_AT_390 = ['Sell', 'For you', 'Local', 'Jobs'];
// Live Home flanks use a wide shallow arc (~8° at ±1). Layout math is gated separately
 // by verify:arc-carousel-layout; keep this band loose enough for DOM CSS transforms.
const MIN_FLANK_ROTATION_DEG = 6;
const MAX_FLANK_ROTATION_DEG = 60;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  const { email, password } = loadCreds();
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60000 });

  async function acceptTermsIfPresent() {
    // Affirmative Terms re-consent may block protected routes after institutional Terms bumps.
    const acceptTerms = page.getByRole('button', { name: /I accept these Terms/i });
    if (await acceptTerms.isVisible({ timeout: 3000 }).catch(() => false)) {
      await acceptTerms.click();
      await acceptTerms.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    }
  }

  await acceptTermsIfPresent();

  for (const width of VIEWPORT_WIDTHS) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle', timeout: 60000 });
    await acceptTermsIfPresent();
    // Home secondary arc opens when the Home primary tab is activated (Market no longer has an arc).
    // Scope to the phone bottom bar — AppSideNav also has Market on large screens.
    const marketTab = page
      .locator('[data-testid="mobile-bottom-nav"] button')
      .filter({ hasText: /^Home$/i })
      .first();
    if (await marketTab.count()) {
      await marketTab.click({ force: false });
      await page.waitForTimeout(400);
    }
    await page.waitForSelector('[role="listbox"][aria-label="Section navigation"]', { timeout: 15000 });
    await page.waitForTimeout(800);

    const rows = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[role="option"]')).map((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return {
          title: el.getAttribute('title') ?? '',
          opacity: style.opacity,
          transform: el.style.transform,
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
        };
      }),
    );

    const visible = rows.filter((r) => Number(r.opacity) > 0.4 && r.width > 0);
    const visibleTitles = visible.map((v) => v.title);

    console.log(JSON.stringify({ width, visibleCount: visible.length, visibleTitles }, null, 2));

    const overlap = await page.evaluate(() => {
      const vis = Array.from(document.querySelectorAll('[role="option"]')).filter(
        (el) => Number(getComputedStyle(el).opacity) > 0.4 && el.getBoundingClientRect().width > 0,
      );
      const rects = vis.map((el) => ({
        title: el.getAttribute('title') ?? '',
        rect: el.getBoundingClientRect(),
      }));
      const pairs = [];
      for (let i = 0; i < rects.length; i += 1) {
        for (let j = i + 1; j < rects.length; j += 1) {
          const a = rects[i].rect;
          const b = rects[j].rect;
          const overlapW = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const overlapH = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (overlapW > 0 && overlapH > 0) {
            const minArea = Math.min(a.width * a.height, b.width * b.height);
            pairs.push({
              a: rects[i].title,
              b: rects[j].title,
              ratio: (overlapW * overlapH) / minArea,
            });
          }
        }
      }
      return pairs;
    });

    const severe = overlap.filter((p) => p.ratio > 0.12);
    if (severe.length > 0) {
      throw new Error(
        `@${width}px arc pills overlap >12% area: ${severe.map((p) => `${p.a}/${p.b}(${(p.ratio * 100).toFixed(0)}%)`).join(', ')}`,
      );
    }

    const minVisible = width === 390 ? 4 : 3;
    if (visible.length < minVisible) {
      throw new Error(`@${width}px expected ≥${minVisible} visible arc pills, got ${visible.length}`);
    }

    if (width === 390) {
      for (const title of REQUIRED_AT_390) {
        if (!visible.some((v) => v.title === title)) {
          throw new Error(`390px missing required visible pill: ${title}`);
        }
      }

      const forYou = visible.find((v) => v.title === 'For you');
      const sell = visible.find((v) => v.title === 'Sell');
      const local = visible.find((v) => v.title === 'Local');
      if (forYou && sell && forYou.top >= sell.top - 2) {
        throw new Error('390px focus should sit higher on arc than Sell flank');
      }
      if (forYou && local && forYou.top >= local.top - 2) {
        throw new Error('390px focus should sit higher on arc than Local flank');
      }

      for (const flank of [sell, local].filter(Boolean)) {
        const rot = Math.abs(rotationFromTransform(flank.transform));
        if (rot < MIN_FLANK_ROTATION_DEG || rot > MAX_FLANK_ROTATION_DEG) {
          throw new Error(
            `390px ${flank.title} rotation ${rot.toFixed(1)}° outside ${MIN_FLANK_ROTATION_DEG}–${MAX_FLANK_ROTATION_DEG}°`,
          );
        }
      }
    }

    if (!visible.some((v) => v.title === 'For you')) {
      throw new Error(`@${width}px For you not visible`);
    }

    console.log(`PASS: arc carousel @${width}px`);
  }
} finally {
  await browser.close();
}
