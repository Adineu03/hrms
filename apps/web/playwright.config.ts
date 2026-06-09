import { defineConfig, devices } from '@playwright/test';

/**
 * Demo-Readiness Survey Crawler — Playwright config.
 *
 * Sprint 0 of the Demo-Readiness Program (see demo-readiness/demo-readiness-plan.md).
 * The crawler logs in as all three personas, visits every module, clicks every tab,
 * and REPORTS render/console/api-error/empty state per tab. It never fails the build —
 * triage happens from demo-readiness/inventory.md.
 *
 * Prereqs to run: app up via `pnpm dev` (web :3000, api :3001), data via `pnpm seed`.
 * We intentionally do NOT configure a `webServer` — the app is a documented prereq and
 * global-setup probes reachability, failing fast with a clear message if it is down.
 */
export default defineConfig({
  testDir: './e2e',
  // The survey writes one result file per test; parallel runs are safe. Keep workers low so
  // we don't overwhelm the single Next.js dev server — high parallelism causes first-compile/
  // hydration races that can capture the pre-hydration "Loading..." screen.
  fullyParallel: true,
  workers: 2,
  // Each survey test clicks ~7 tabs and takes a fullPage screenshot per tab against a
  // dev server, so give it room.
  timeout: 180_000,
  expect: { timeout: 15_000 },
  // The survey is a report, not a gate — no retries, and a failing assertion would be a
  // crawler bug, not a finding.
  retries: 0,
  reporter: [['list']],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:3000',
    viewport: { width: 1440, height: 900 },
    // We take our own fullPage screenshots per tab; disable Playwright's automatic ones.
    screenshot: 'off',
    trace: 'off',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
