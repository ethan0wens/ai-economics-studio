import { defineConfig } from '@playwright/test';
import studio from './playwright.config';

export default defineConfig({
  ...studio,
  testDir: './scripts',
  testMatch: 'capture-readme.spec.ts',
  use: { ...studio.use, viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1, colorScheme: 'light' },
});
