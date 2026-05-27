import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('fff', async ({ page }) => {
  // Étape 1 : Ouvrir l'URL /login et se connecter
  await page.goto('/login');
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});
  await page.locator('input[name="username"], input[type="text"], [placeholder="Nom d\'utilisateur"]').first().fill('manager');
  await page.locator('input[name="password"], input[type="password"], [placeholder="Mot de passe"]').first().fill('+WpKuC3Rt@O*');
  await page.locator('button[type="submit"], button:has-text("Se connecter")').first().click();

  // Étape 2 : Attendre 2 secondes et saisir le code à 6 chiffres si nécessaire
  await page.waitForTimeout(2000);
  if (await page.locator('input[name="code"], input[type="number"], [placeholder="Code à 6 chiffres"]').first().isVisible()) {
    await page.locator('input[name="code"], input[type="number"], [placeholder="Code à 6 chiffres"]').first().fill('000000');
    await page.locator('button[type="submit"], button:has-text("Valider")').first().click();
  }

  // Étape 3 : Vérifier que l'on est bien connecté
  await expect(page).not.toHaveURL(/.*login/, { timeout: 10000 });
});