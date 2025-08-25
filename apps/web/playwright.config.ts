import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests',
  // globalSetup is temporarily disabled due to an OOM/killed issue observed locally
  // globalSetup: require.resolve('./tests/global-setup'),
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  timeout: 60000,
  expect: { timeout: 10000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001',
    headless: process.env.HEADFUL ? false : true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      slowMo: Number(process.env.SLOWMO || 0),
    },
  },
  webServer: {
    command: 'NEXT_PUBLIC_AGENT_BUILD=1 NEXT_PUBLIC_E2E_HOOKS=1 npm run build && NEXT_PUBLIC_AGENT_BUILD=1 NEXT_PUBLIC_E2E_HOOKS=1 npm run start:3001',
    url: 'http://localhost:3001',
    reuseExistingServer: true,
    timeout: 120000,
    cwd: undefined,
  },
  projects: [
    // Limit Chromium runs to non-visual/non-perf flows for CI stability
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, grepInvert: /@visual|@bundle|@perf/ },
    // Dedicated perf/bundle budgets on Chromium only, with tighter timeouts to avoid hangs
    { name: 'perf', use: { ...devices['Desktop Chrome'] }, grep: /@perf|@bundle/, timeout: 30000, expect: { timeout: 8000 } },
    // Visual snapshots on Chromium only
    { name: 'visual', use: { ...devices['Desktop Chrome'] }, grep: /@visual/, timeout: 30000, expect: { timeout: 8000 } },
    // Limit cross-browser/mobile to smoke+API headers+planner only; exclude @visual and heavy @e2e flows
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, grep: /@smoke|@security-headers|@planner|@console|@axe/ },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, grep: /@smoke|@security-headers|@planner|@console|@axe/ },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] }, grep: /@smoke|@security-headers|@planner/ },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] }, grep: /@smoke|@security-headers|@planner/ },
  ],
})



