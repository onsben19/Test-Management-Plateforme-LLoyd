import { test as setup } from '@playwright/test';
import { existsSync } from 'fs';

const authFile = 'tests/manager/.auth/manager.json';

setup('Authentification Manager (exécutée une seule fois)', async ({ page }) => {

  // ✅ Si la session est déjà sauvegardée, on la réutilise sans se reconnecter
  if (existsSync(authFile)) {
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
    console.log('⏸️  Entrez votre code 2FA dans le navigateur, puis cliquez Resume');
    await page.pause();
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 60000 });
  }

  await page.context().storageState({ path: authFile });
  console.log('✅ Session Manager sauvegardée ! Les prochains runs n\'auront plus besoin du code 2FA.');
});
