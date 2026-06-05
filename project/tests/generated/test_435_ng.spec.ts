import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('ng', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  await page.waitForLoadState('networkidle');

  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const usernameLocator = page.locator('input[name="username"], input[id="username"], [placeholder="Username"]').first();
  const passwordLocator = page.locator('input[name="password"], input[id="password"], [placeholder="Password"]').first();
  const loginButtonLocator = page.locator('button[type="submit"], button:has-text("Login"), [role="button"]').first();

  await usernameLocator.evaluate((el, val) => { el.value = val; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }, 'admin');
  await passwordLocator.evaluate((el, val) => { el.value = val; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }, 'admin');

  await loginButtonLocator.click({ force: true });

  await page.waitForLoadState('networkidle');

  const successMessageLocator = page.locator('div.flash, div.alert, [role="alert"]').first();
  await expect(successMessageLocator).toBeVisible({ timeout: 10000 });
  await expect(successMessageLocator).toContainText('You logged into a secure area!');
});