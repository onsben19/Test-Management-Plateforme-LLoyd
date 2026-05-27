import { test as setup } from '@playwright/test';

const authFile = 'tests/tester/.auth/tester.json';

setup('Authentification Testeur (exécutée une seule fois)', async ({ page }) => {
  await page.goto('/login');

  await page.locator('input[type="text"]').first().fill('laaa');
  await page.locator('input[type="password"]').fill('.!*GY8&Rkd-L');
  await page.locator('button[type="submit"]').click();

  await page.waitForTimeout(2000);

  const is2FA = await page.locator('input[maxlength="6"]').isVisible();
  if (is2FA) {
    console.log('🤖 Détection 2FA : Saisie automatique du code de contournement E2E...');
    await page.locator('input[maxlength="6"]').first().fill('000000');
    await page.locator('button[type="submit"]').click();
    // Attendre la redirection hors de la page de login pour s'assurer que les tokens sont stockés dans le localStorage
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
  }

  await page.context().storageState({ path: authFile });
  console.log('✅ Session Testeur sauvegardée !');
});
