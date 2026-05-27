import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('cff', async ({ page }) => {
  // Étape 1 : Ouvrir l'URL /login
  await page.goto('/login');

  // Fermer les popups de cookies si présent
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  // Étape 2 : Saisir les informations de connexion et cliquer sur le bouton "se connecter"
  await page.locator('input[name="username"], input[type="text"], [placeholder="Nom d\'utilisateur"]').first().fill('manager');
  await page.locator('input[name="password"], input[type="password"], [placeholder="Mot de passe"]').first().fill('+WpKuC3Rt@O*');
  await page.locator('button[type="submit"], button:has-text("Se connecter")').first().click();

  // Étape 3 : Vérifier que l'on est bien connecté
  // Vérifier si le champ 2FA à 6 chiffres apparaît
  const twoFaLocator = page.locator('input[name="2fa"], input[type="number"], [placeholder="Code 2FA"]');
  if (await twoFaLocator.first().isVisible({ timeout: 5000 })) {
    await twoFaLocator.first().fill('000000');
    await page.locator('button[type="submit"], button:has-text("Valider")').first().click();
  }

  // Vérifier que l'URL ne contient plus "/login"
  await expect(page).not.toHaveURL({ url: '/login', timeout: 10000 });
});