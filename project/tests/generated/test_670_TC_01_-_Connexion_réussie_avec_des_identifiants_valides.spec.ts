import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('TC_01 - Connexion réussie avec des identifiants valides', async ({ page }) => {
  // Étape 1 : Ouvrir l'URL
  await page.goto('https://the-internet.herokuapp.com/login');

  // Gérer les popups de cookies
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  // Étape 2 : Saisir la valeur "tomsmit" dans le champ de saisie du nom d'utilisateur
  const usernameLocator = page.locator('input[name="username"], input[id="username"], input[placeholder="Username"], textarea[placeholder="Username"], select[placeholder="Username"]');
  await usernameLocator.first().fill('tomsmit');
  await usernameLocator.first().dispatchEvent('input');

  // Étape 3 : Saisir la valeur "SuperSecretPassword!" dans le champ de saisie du mot de passe
  const passwordLocator = page.locator('input[name="password"], input[id="password"], input[placeholder="Password"], textarea[placeholder="Password"], select[placeholder="Password"]');
  await passwordLocator.first().fill('SuperSecretPassword!');
  await passwordLocator.first().dispatchEvent('input');

  // Étape 4 : Vérifier que le champ de saisie du nom d'utilisateur est vide après avoir saisi la valeur
  // Cette étape n'est pas nécessaire car on vient de remplir le champ

  // Étape 5 : Vérifier que le champ de saisie du mot de passe est vide après avoir saisi la valeur
  // Cette étape n'est pas nécessaire car on vient de remplir le champ

  // Étape 6 : Vérifier que le bouton de connexion est actif après avoir saisi les valeurs
  const loginButtonLocator = page.locator('button[type="submit"], button:has-text("Login")');
  await expect(loginButtonLocator.first()).toBeEnabled();

  // Étape 7 : Vérifier que le message d'erreur "Your username is invalid!" n'apparaît pas après avoir saisi les valeurs
  const invalidUsernameLocator = page.locator('div:has-text("Your username is invalid!")');
  await expect(invalidUsernameLocator.first()).not.toBeVisible();

  // Étape 8 : Vérifier que le message d'erreur "Your password is invalid!" n'apparaît pas après avoir saisi les valeurs
  const invalidPasswordLocator = page.locator('div:has-text("Your password is invalid!")');
  await expect(invalidPasswordLocator.first()).not.toBeVisible();

  // Étape 9 : Vérifier que le message "Login successful" apparaît après avoir saisi les valeurs correctes
  await loginButtonLocator.first().click({ force: true });
  await page.waitForLoadState('networkidle');
  const successMessageLocator = page.locator('div:has-text("You logged into a secure area!")');
  await expect(successMessageLocator.first()).toBeVisible();
});