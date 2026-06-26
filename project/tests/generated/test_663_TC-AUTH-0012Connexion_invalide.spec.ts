import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('TC-AUTH-0012Connexion invalide', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  await page.locator('input[name="username"], input[type="text"]').first().fill('ons ben');
  await page.locator('input[name="username"], input[type="text"]').first().dispatchEvent('input');

  await page.locator('input[name="password"], input[type="password"]').first().fill('SuperSecretPassword');
  await page.locator('input[name="password"], input[type="password"]').first().dispatchEvent('input');

  await page.locator('button[type="submit"], button:has-text("Login")').first().click({ force: true });

  await page.waitForLoadState('networkidle');

  await expect(page.locator('div.flash.error')).toBeVisible({ timeout: 10000 });
});