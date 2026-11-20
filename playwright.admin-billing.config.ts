import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import * as os from 'os';

// Billing-dashboard E2E against a LOCAL dev server (next dev -p 3901) + local stub proxy (127.0.0.1:8210)
// + local Postgres (127.0.0.1:55440). No webServer: start them with tests/e2e/admin-billing/run.sh.
// Artifacts go outside the repo (override with BILLING_E2E_OUT).
const OUT = process.env.BILLING_E2E_OUT || path.join(os.tmpdir(), 'billing-e2e-artifacts');

export default defineConfig({
  testDir: './tests/e2e/admin-billing',
  outputDir: path.join(OUT, 'test-results'),
  timeout: 120_000,
  retries: 0,
  workers: 1,
  fullyParallel: false,
  reporter: [['list'], ['json', { outputFile: path.join(OUT, 'results.json') }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3901',
    headless: true,
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
    timezoneId: 'Asia/Jakarta',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 90_000,
    acceptDownloads: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
});
