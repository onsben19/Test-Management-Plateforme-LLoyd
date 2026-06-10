import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx', storageState: 'tests/tester/.auth/tester.json', actionTimeout: 15000, navigationTimeout: 15000 });


test('hghjn', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  
  await page.locator('#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const usernameLocator = page.locator('input[name="username"], input[id="username"], [placeholder="Username"]');
  await usernameLocator.first().evaluate((el, val) => { el.value = val; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }, 'tomsmith');

  const passwordLocator = page.locator('input[name="password"], input[id="password"], [placeholder="Password"]');
  await passwordLocator.first().evaluate((el, val) => { el.value = val; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }, 'SuperSecretPassword!');

  const loginButtonLocator = page.locator('button[type="submit"], button:has-text("Login"), [id*="login"]');
  await loginButtonLocator.first().click({ force: true });

  await page.waitForLoadState('networkidle');

  await expect(page.locator('h2, [role="heading"]')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('h2, [role="heading"]')).toContainText('Secure Area', { timeout: 10000 });
});