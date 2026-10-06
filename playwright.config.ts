import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against a running Civizen web server that points at the LOCAL Supabase stack.
 * Never run them against a server configured for production (see docs/04-operations/dev/local-supabase.md).
 *
 *   CIVIZEN_E2E_BASE_URL=http://localhost:8081 npm run e2e
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.CIVIZEN_E2E_BASE_URL || 'http://localhost:8081',
    trace: 'retain-on-failure',
    viewport: { width: 1280, height: 800 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
