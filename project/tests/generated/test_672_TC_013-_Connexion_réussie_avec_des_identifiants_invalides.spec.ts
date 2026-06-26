import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('TC_013- Connexion réussie avec des identifiants invalides', async ({ page }) => {
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

  // Étape 4 : Vérifier que le bouton "Login" est cliquable et que la page ne présente pas d'erreur
  const loginButtonLocator = page.locator('button[type="submit"], button:has-text("Login")');
  await expect(loginButtonLocator.first()).toBeEnabled({ timeout: 10000 });
  await loginButtonLocator.first().click({ force: true });

  // Vérifier qu'il n'y a pas d'erreur après avoir cliqué sur le bouton de connexion
  const errorLocator = page.locator('h1.error, h2.error, h3.error, h4.error, h5.error, h6.error, [role="heading"].error, span.error, p.error');
  await expect(errorLocator.first()).not.toBeVisible({ timeout: 10000 });
});