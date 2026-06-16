import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('google', async ({ page }) => {
  await page.goto('https://www.google.fr/');

  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

  const logoGoogle = page.locator('img[alt="Google"], [id*="logo"] img');
  await expect(logoGoogle.first()).toBeVisible({ timeout: 10000 });
});