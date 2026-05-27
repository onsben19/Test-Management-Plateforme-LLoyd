import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('dd', async ({ page }) => {
  // Étape 1 : Ouvrir l'URL de connexion
  await page.goto('/login');

  // Fermer les popups de cookies si présent
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  // Étape 2 : Saisir les identifiants et se connecter
  await page.locator('input[name="username"], input[type="text"], [placeholder="Nom d\'utilisateur"]').first().fill('manager');
  await page.locator('input[name="password"], input[type="password"], [placeholder="Mot de passe"]').first().fill('+WpKuC3Rt@O*');
  await page.locator('button:has-text("Se connecter"), button[type="submit"], [role="button"]').first().click();

  // Fermer les popups de cookies si présent après connexion
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  // Étape 3 : Vérifier la connexion réussie
  await page.locator('input[name="code"], input[type="number"], [placeholder="Code"]').first().fill('000000');
  await expect(page).not.toHaveURL(/.*login/, { timeout: 10000 });
});