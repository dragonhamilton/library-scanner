import { defineConfig, devices } from '@playwright/test';

// Uses the Chromium that is already installed for Playwright 1.56.
// Never run `playwright install` here: browser downloads are blocked.
// If Playwright can't find the browser, set PLAYWRIGHT_CHROMIUM_PATH.
const port = Number(process.env.E2E_PORT ?? 3100);
const databaseUrl =
  process.env.E2E_DATABASE_URL ?? 'postgres://scanner:scanner@127.0.0.1:5432/library_scanner_e2e';

export default defineConfig({
  testDir: 'e2e',
  timeout: 180_000,
  workers: 1,
  globalSetup: './e2e/global-setup.ts',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: process.env.PLAYWRIGHT_CHANNEL || undefined },
    },
  ],
  webServer: {
    command: 'pnpm build && pnpm --filter @scanner/server start',
    url: `http://127.0.0.1:${port}/api/health`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'ignore',
    env: {
      PORT: String(port),
      HOST: '127.0.0.1',
      DATABASE_URL: databaseUrl,
      DATA_DIR: './data-e2e',
      OCR_ENGINE: 'tesseract',
    },
  },
});
