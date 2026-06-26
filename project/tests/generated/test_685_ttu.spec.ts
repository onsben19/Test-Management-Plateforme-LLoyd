import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('ttu', async ({ page }) => {
  // Étape 1 : Ouvrir l'URL
  await page.goto('https://the-internet.herokuapp.com/login');

  // Gérer les popups de cookies si présents
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  // Étape 2 : Saisir la valeur "tomsmith" dans le champ de saisie du nom d'utilisateur
  const usernameInput = page.locator('input[name="username"], input[type="text"], input[placeholder*="username"], textarea[placeholder*="username"], select[placeholder*="username"]').first();
  await usernameInput.fill('tomsmith');
  await usernameInput.dispatchEvent('input');

  // Étape 3 : Saisir la valeur "SuperSecretPassword!" dans le champ de saisie du mot de passe
  const passwordInput = page.locator('input[name="password"], input[type="password"], input[placeholder*="password"], textarea[placeholder*="password"], select[placeholder*="password"]').first();
  await passwordInput.fill('SuperSecretPassword!');
  await passwordInput.dispatchEvent('input');

  // Étape 4 : Cliquer sur le bouton de connexion
  const loginButton = page.locator('button[type="submit"], button:has-text("Login")').first();
  await loginButton.click({ force: true });

  // Attendre que la page se charge complètement après la soumission
  await page.waitForLoadState('networkidle');

  // Vérifier que le message de connexion est affiché
  const successMessage = page.locator('button#flash, a#flash, input#flash, [role="button"]#flash, [role="link"]#flash, button.flash, a.flash, input.flash, [role="button"].flash, [role="link"].flash, [role="alert"]').first();
  await expect(successMessage).toBeVisible({ timeout: 10000 });
  await expect(successMessage).toContainText('You logged into a secure area!', { timeout: 10000 });
});