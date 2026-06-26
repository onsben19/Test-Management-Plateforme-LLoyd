import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('vvtestt', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const usernameInput = page.locator('input[name="username"], input[type="text"], input[placeholder="Username"], textarea[placeholder="Username"], select[placeholder="Username"]');
  await usernameInput.first().fill('tomsmith');
  await usernameInput.first().dispatchEvent('input');

  const passwordInput = page.locator('input[name="password"], input[type="password"], input[placeholder="Password"], textarea[placeholder="Password"], select[placeholder="Password"]');
  await passwordInput.first().fill('SuperSecretPassword!');
  await passwordInput.first().dispatchEvent('input');

  const loginButton = page.locator('button[type="submit"], button:has-text("Login")');
  await loginButton.first().click({ force: true });

  await page.waitForLoadState('networkidle');

  const successMessage = page.locator('button#flash, a#flash, input#flash, [role="button"]#flash, [role="link"]#flash, button.flash, a.flash, input.flash, [role="button"].flash, [role="link"].flash, [role="alert"], button[aria-live="assertive"], a[aria-live="assertive"], input[aria-live="assertive"], [role="button"][aria-live="assertive"], [role="link"][aria-live="assertive"]');
  await expect(successMessage.first()).toBeVisible({ timeout: 10000 });
  await expect(successMessage.first()).toContainText('You logged into a secure area!', { timeout: 10000 });
});