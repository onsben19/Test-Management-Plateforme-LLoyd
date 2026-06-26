import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('TC_01 - Connexion echouee  avec des identifiants valides', async ({ page }) => {
  // Étape 1 : Ouvrir l'URL
  await page.goto('https://the-internet.herokuapp.com/login');

  // Gérer les popups de cookies
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  // Étape 2 : Saisir la valeur "ons" dans le champ de saisie du nom d'utilisateur
  const usernameLocator = page.locator('input[name="username"], input[type="text"], input[placeholder="Username"], textarea[placeholder="Username"], select[placeholder="Username"]');
  await usernameLocator.first().fill('ons');
  await usernameLocator.first().dispatchEvent('input');

  // Étape 3 : Saisir la valeur "onsss!" dans le champ de saisie du mot de passe
  const passwordLocator = page.locator('input[name="password"], input[type="password"], input[placeholder="Password"], textarea[placeholder="Password"], select[placeholder="Password"]');
  await passwordLocator.first().fill('onsss!');
  await passwordLocator.first().dispatchEvent('input');

  // Étape 4 : Vérifier que le bouton de connexion est activé et peut être cliqué
  const loginButtonLocator = page.locator('button[type="submit"], button:has-text("Login")');
  await expect(loginButtonLocator.first()).toBeEnabled({ timeout: 10000 });
  await loginButtonLocator.first().click({ force: true });

  // Attendre la navigation
  await page.waitForLoadState('networkidle');

  // Vérifier que la connexion a échoué
  const errorMessageLocator = page.locator('div.error, div.alert-danger');
  await expect(errorMessageLocator.first()).toBeVisible({ timeout: 10000 });
});