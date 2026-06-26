/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';

const frontendUrl = process.env.FRONTEND_URL || 'http://nginx';

export default defineConfig({
  testDir: './tests',
  timeout: 120 * 1000,
  expect: { timeout: 30000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'line',

  use: {
    actionTimeout: 60000,
    navigationTimeout: 60000,
    baseURL: frontendUrl,
    trace: 'on-first-retry',
    video: process.env.PW_VIDEO === 'on' ? 'on' : 'off',
    viewport: { width: 1280, height: 720 },
    launchOptions: {
      slowMo: 0,
    },
  },

  projects: [
    {
      name: 'manager-setup',
      testMatch: '**/manager/auth.setup.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'manager',
      testMatch: '**/manager/*.spec.ts',
      dependencies: ['manager-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/manager/.auth/manager.json',
      },
    },
    {
      name: 'tester-setup',
      testMatch: '**/tester/auth.setup.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'tester',
      testMatch: '**/tester/*.spec.ts',
      dependencies: ['tester-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/tester/.auth/tester.json',
      },
    },
    {
      name: 'admin',
      testMatch: '**/admin/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      testIgnore: ['**/manager/**', '**/admin/**', '**/tester/**'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: process.env.SKIP_WEBSERVER ? undefined : {
    command: 'npm run dev',
    url: process.env.FRONTEND_URL || 'http://nginx',
    reuseExistingServer: true,
  },
});
