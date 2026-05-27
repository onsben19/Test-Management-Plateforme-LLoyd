import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('tccc', async ({ page }) => {
  // Étape 1 : Ouvrir l'URL /login
  await page.goto('/login');
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  // Étape 2 : Saisir les informations de connexion et cliquer sur valider
  await page.locator('input[name="username"], input[type="text"], [placeholder="Nom d\'utilisateur"]').first().fill('manager');
  await page.locator('input[name="password"], input[type="password"], [placeholder="Mot de passe"]').first().fill('+WpKuC3Rt@O*');
  await page.locator('button[type="submit"], button:has-text("Valider"), [type="submit"]').first().click();

  // Étape 3 : Vérifier que le champ 2FA à 6 chiffres apparaît
  await expect(page.locator('input[name="2fa"], input[type="number"], [placeholder="Code 2FA"]')).toBeVisible({ timeout: 10000 });

  // Saisir le code 2FA et valider
  await page.locator('input[name="2fa"], input[type="number"], [placeholder="Code 2FA"]').first().fill('000000');
  await page.locator('button[type="submit"], button:has-text("Valider"), [type="submit"]').first().click();

  // Vérifier qu'on arrive sur une page contenant le texte "Tableau de bord"
  await expect(page.locator('text="Tableau de bord"')).toBeVisible({ timeout: 10000 });
});