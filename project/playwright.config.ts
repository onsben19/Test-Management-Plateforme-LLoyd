/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';


export default defineConfig({
  testDir: './tests',
  timeout: 120 * 1000,
  expect: { timeout: 30000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'line',

  use: {
    actionTimeout: 60000,
    navigationTimeout: 60000,
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    launchOptions: {
      slowMo: 0, // ← 0 pour une exécution immédiate (mettre 500 ou 1000 pour ralentir la démo)
    },
  },

  projects: [
    // ─── Projet SETUP : se connecte une seule fois et sauvegarde la session ───
    {
      name: 'manager-setup',
      testMatch: '**/manager/auth.setup.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // ─── Tests Manager : réutilisent la session sauvegardée ────────────────────
    {
      name: 'manager',
      testMatch: '**/manager/*.spec.ts',
      dependencies: ['manager-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/manager/.auth/manager.json',
      },
    },

    // ─── Projet SETUP Testeur ──────────────────────────────────────────────────
    {
      name: 'tester-setup',
      testMatch: '**/tester/auth.setup.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // ─── Tests Testeur : réutilisent la session sauvegardée ────────────────────
    {
      name: 'tester',
      testMatch: '**/tester/*.spec.ts',
      dependencies: ['tester-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/tester/.auth/tester.json',
      },
    },

    // ─── Tests Admin : autonomes ───────────────────────────────────────────────
    {
      name: 'admin',
      testMatch: '**/admin/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // ─── Tests généraux (login.spec.ts) sans session pré-chargée ──────────────
    {
      name: 'chromium',
      testIgnore: ['**/manager/**', '**/admin/**', '**/tester/**'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
});
