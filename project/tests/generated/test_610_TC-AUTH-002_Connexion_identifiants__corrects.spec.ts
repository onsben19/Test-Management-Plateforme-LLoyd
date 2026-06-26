import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('TC-AUTH-002 Connexion identifiants  corrects', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const usernameInput = page.locator('input[name="username"], input[id*="username"], input[placeholder*="username"], textarea[placeholder*="username"], select[placeholder*="username"]');
  await usernameInput.first().fill('tomsmit');
  await usernameInput.first().dispatchEvent('input');

  const passwordInput = page.locator('input[name="password"], input[id*="password"], input[placeholder*="password"], textarea[placeholder*="password"], select[placeholder*="password"]');
  await passwordInput.first().fill('SuperSecretPassword!');
  await passwordInput.first().dispatchEvent('input');

  const loginButton = page.locator('button[type="submit"], button:has-text("Login"), button[id*="login"], a[id*="login"], input[id*="login"], [role="button"][id*="login"], [role="link"][id*="login"]');
  await expect(loginButton.first()).toBeEnabled({ timeout: 10000 });

  await loginButton.first().click({ force: true });
  await page.waitForLoadState('networkidle');

  await expect(page.locator('h2')).toContainText('Secure Area');
});