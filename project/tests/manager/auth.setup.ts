import { test as setup } from '@playwright/test';
import { existsSync, statSync } from 'fs';

const authFile = 'tests/manager/.auth/manager.json';

setup('Authentification Manager (exécutée une seule fois)', async ({ page }) => {

  // ✅ Si la session est déjà sauvegardée et valide (non vide), on la réutilise
  if (existsSync(authFile) && statSync(authFile).size > 700) {
    console.log('✅ Session Manager existante — connexion ignorée (pas de code 2FA requis)');
    return; // ← Fin du setup immédiatement
  }

  // Session absente → connexion complète requise
  console.log('🔐 Première connexion — création de la session...');
  await page.goto('/login');

  await page.locator('input[type="text"]').first().fill('manager');
  await page.locator('input[type="password"]').fill('+WpKuC3Rt@O*');
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
  console.log('✅ Session Manager sauvegardée ! Les prochains runs n\'auront plus besoin du code 2FA.');
});
