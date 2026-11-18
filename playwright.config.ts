import { defineConfig } from '@playwright/test';

const suppliedUrl = process.env.STUDIO_TEST_URL;

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: suppliedUrl ?? 'http://127.0.0.1:4173',
    launchOptions: { executablePath: process.env.STUDIO_CHROMIUM || undefined },
  },
  webServer: suppliedUrl ? undefined : {
    command: 'npm run preview -- --host 127.0.0.1 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
