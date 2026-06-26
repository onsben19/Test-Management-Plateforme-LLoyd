import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('TC-AUTH-002 Connexion identifiants incorrects', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const usernameInput = page.locator('input[name="username"]');
  await usernameInput.first().fill('tomsmit');
  await usernameInput.first().dispatchEvent('input');

  const passwordInput = page.locator('input[name="password"]');
  await passwordInput.first().fill('mauvais_mot_de_passe');
  await passwordInput.first().dispatchEvent('input');

  const loginButton = page.locator('button[type="submit"], button:has-text("Login")');
  await loginButton.first().click({ force: true });

  await page.waitForLoadState('networkidle');

  const welcomeText = page.locator('h2');
  await expect(welcomeText.first()).not.toBeVisible({ timeout: 10000 });
});