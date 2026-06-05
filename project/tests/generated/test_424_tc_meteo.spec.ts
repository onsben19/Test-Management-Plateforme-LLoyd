import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('tc meteo', async ({ page }) => {
  await page.goto('https://www.google.com/webhp?hl=en&sa=X&ved=0ahUKEwj5o7yhvO6UAxWn2gIHHTm8LrMQPAgI');
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});
  const searchInput = page.locator('textarea[name="q"], input[name="q"], [title="Rechercher"]').first();
  await searchInput.click();
  await searchInput.fill('capitale de la Tunisie');
  await page.locator('button:has-text("Rechercher"), button:has-text("Google Search")').first().click();
  await page.waitForTimeout(2000);
  const resultLocator = page.locator('text="Tunis"');
  await expect(resultLocator.first()).toBeVisible({ timeout: 10000 });
});