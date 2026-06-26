import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('tc acces page google ', async ({ page }) => {
  await page.goto('https://www.google.com');
  
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  await expect(page.locator('img[alt="Google"]')).toBeVisible({ timeout: 10000 });
  
  await expect(page).toHaveURL('https://www.google.com/', { timeout: 10000 });
});