import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('tc002', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const usernameInput = page.locator('input[name="username"], input[type="text"], [id*="username"] input');
  await usernameInput.first().fill('tomsm');
  await usernameInput.first().dispatchEvent('input');

  const passwordInput = page.locator('input[name="password"], input[type="password"], [id*="password"] input');
  await passwordInput.first().fill('SuperSecretPassword!');
  await passwordInput.first().dispatchEvent('input');

  const loginButton = page.locator('button[type="submit"], button:has-text("Login"), [id*="login"] button');
  await loginButton.first().click({ force: true });

  await page.waitForLoadState('networkidle');

  await expect(page.locator('h2, [role="heading"]')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('h2, [role="heading"]')).toContainText('Secure Area', { timeout: 10000 });
});