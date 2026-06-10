import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx', storageState: 'tests/tester/.auth/tester.json', actionTimeout: 15000, navigationTimeout: 15000 });


test('tcddd', async ({ page }) => {
  // Étape 1 : Ouvrir l'URL
  await page.goto('https://the-internet.herokuapp.com/login');

  // Gérer les popups "Accepter les cookies"
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  // Étape 2 : Saisir le nom d'utilisateur et le mot de passe
  const usernameLocator = page.locator('input[name="username"], input[id*="username"], input[placeholder*="username"], textarea[placeholder*="username"], select[placeholder*="username"]').first();
  const passwordLocator = page.locator('input[name="password"], input[id*="password"], input[placeholder*="password"], textarea[placeholder*="password"], select[placeholder*="password"]').first();
  await usernameLocator.evaluate((el, val) => { el.value = val; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }, 'tomsmith');
  await passwordLocator.evaluate((el, val) => { el.value = val; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }, 'SuperSecretPassword!');

  // Étape 3 : Cliquer sur le bouton de connexion
  const loginButtonLocator = page.locator('button[type="submit"], button:has-text("Login"), [id*="login"] button').first();
  await loginButtonLocator.click({ force: true });

  // Attendre la navigation
  await page.waitForLoadState('networkidle');

  // Vérifier que la connexion est réussie
  await expect(page).not.toHaveURL(/.*login/, { timeout: 10000 });
  const welcomeMessageLocator = page.locator('h2, [role="heading"], h1[class*="welcome"], h2[class*="welcome"], h3[class*="welcome"], h4[class*="welcome"], h5[class*="welcome"], h6[class*="welcome"], [role="heading"][class*="welcome"], span[class*="welcome"], p[class*="welcome"]').first();
  await expect(welcomeMessageLocator).toBeVisible({ timeout: 10000 });
});