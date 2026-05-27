import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('tcc', async ({ page }) => {
  // Étape 1 : Ouvrir l'URL de connexion
  await page.goto('/login');

  // Fermer les popups de cookies si présents
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  // Étape 2 : Saisir les identifiants et se connecter
  await page.locator('input[name="username"], input[type="text"], [placeholder="Nom d\'utilisateur"]').first().fill('manager');
  await page.locator('input[name="password"], input[type="password"], [placeholder="Mot de passe"]').first().fill('+WpKuC3Rt@O*');
  await page.locator('button[type="submit"], button:has-text("Se connecter")').first().click();

  // Étape 3 : Gérer l'éventuel champ 2FA
  try {
    await expect(page.locator('input[name="2fa"], input[type="number"], [placeholder="Code 2FA"]')).toBeVisible({ timeout: 5000 });
    await page.locator('input[name="2fa"], input[type="number"], [placeholder="Code 2FA"]').first().fill('000000');
    await page.locator('button[type="submit"], button:has-text("Valider")').first().click();
  } catch (error) {
    // Si le champ 2FA n'apparaît pas, on passe à l'étape suivante
  }

  // Vérifier que l'on est bien connecté
  await expect(page).not.toHaveURL(/.*login/, { timeout: 10000 });
});