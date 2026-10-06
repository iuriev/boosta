import { defineConfig, devices } from '@playwright/test';

/**
 * The browser test of the whole funnel. It drives a system that is already
 * running (`docker compose up` or `pnpm dev`) and does not start one itself,
 * so the same test checks a development build and the production images.
 */
export default defineConfig({
  testDir: 'e2e',
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
