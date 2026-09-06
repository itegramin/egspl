import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 2 * 60 * 1000,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:3010',
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'bash e2e/run-dev.sh',
    url: 'http://127.0.0.1:3010',
    timeout: 90 * 1000,
    reuseExistingServer: !process.env.CI,
  },
});
