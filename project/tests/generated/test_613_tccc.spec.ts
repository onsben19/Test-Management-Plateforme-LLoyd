import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('tccc', async ({ page }) => {
  await page.goto('https://www.google.com');
  
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  await expect(page.locator('img[alt="Google"]')).toBeVisible({ timeout: 10000 });

  const searchLocator = page.locator('textarea[name="q"], input[name="q"], input[title="Rechercher"], textarea[title="Rechercher"], select[title="Rechercher"]').first();
  await expect(searchLocator).toBeVisible({ timeout: 10000 });
  await searchLocator.fill('Playwright');
  await searchLocator.dispatchEvent('input');
  await page.keyboard.press('Enter');

  await page.waitForLoadState('networkidle');
});