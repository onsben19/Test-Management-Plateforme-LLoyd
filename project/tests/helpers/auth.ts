import { Page } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// FICHIER CENTRALISÉ — Toute la logique d'authentification pour les tests E2E
// ─────────────────────────────────────────────────────────────────────────────

const CREDENTIALS = {
  admin: { username: 'admin', password: 'admin123' },
  manager: { username: 'manager', password: '+WpKuC3Rt@O*' },
  tester: { username: 'tester', password: 'qpB&II@SzA7Q' },
};

// ─── Connexion simple (sans attente 2FA) ─────────────────────────────────────
async function loginAs(page: Page, role: keyof typeof CREDENTIALS) {
  const { username, password } = CREDENTIALS[role];
  await page.goto('/login');
  await page.locator('input[type="text"]').first().fill(username);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(2500);
}

// ─── Connexion AVEC pause pour saisie manuelle du code 2FA ───────────────────
// Utilisez cette version quand la 2FA est activée sur le compte.
// Lancer avec : npx playwright test --headed --debug
async function loginAsWithManual2FA(page: Page, role: keyof typeof CREDENTIALS) {
  const { username, password } = CREDENTIALS[role];
  await page.goto('/login');
  await page.locator('input[type="text"]').first().fill(username);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  // Vérifier si la 2FA est demandée
  await page.waitForTimeout(2000);
  const is2FA = await page.locator('input[maxlength="6"]').isVisible();

  if (is2FA) {
    console.log('⏸️  CODE 2FA REQUIS — Entrez votre code dans le navigateur, puis cliquez "Resume"');
    // ← Le navigateur se gèle ici. Entrez le code 2FA manuellement, puis cliquez Resume.
    await page.pause();
    // ← Le test reprend automatiquement après votre saisie.
    await page.waitForTimeout(2000);
  }
}

// ─── Exports par rôle — Version simple ───────────────────────────────────────
export async function loginAsAdmin(page: Page) { await loginAs(page, 'admin'); }
export async function loginAsManager(page: Page) { await loginAs(page, 'manager'); }
export async function loginAsTester(page: Page) { await loginAs(page, 'tester'); }

// ─── Exports par rôle — Version avec pause 2FA manuelle ──────────────────────
export async function loginAsManagerWith2FA(page: Page) { await loginAsWithManual2FA(page, 'manager'); }
export async function loginAsAdminWith2FA(page: Page) { await loginAsWithManual2FA(page, 'admin'); }
export async function loginAsTesterWith2FA(page: Page) { await loginAsWithManual2FA(page, 'tester'); }

// ─── Utilitaire : vérifie si la connexion a réussi ────────────────────────────
export async function expectLoginSuccess(page: Page) {
  const is2FA = await page.locator('input[maxlength="6"]').isVisible();
  const url = page.url();
  const isOnHome = !url.includes('/login');

  if (is2FA) console.log('✅ Connexion → 2FA affiché (comportement attendu)');
  if (isOnHome) console.log('✅ Connexion → Redirection Dashboard réussie');

  return is2FA || isOnHome;
}

