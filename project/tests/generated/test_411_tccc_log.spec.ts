import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('tccc log', async ({ page }) => {
  await page.goto('https://www.google.com');
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const searchInput = page.locator('textarea[name="q"], input[name="q"], [title="Rechercher"]').first();
  await searchInput.click();
  await searchInput.fill('meteo Tunisie');
  await searchInput.press('Enter');

  await page.waitForTimeout(2000);
  const meteoResults = page.locator('div[id="rso"] div[class="g"]').first();
  await expect(meteoResults).toBeVisible({ timeout: 10000 });

  const meteoText = await meteoResults.textContent();
  await expect(meteoText).toContain('Tunisie');
  await expect(meteoText).toContain('météo');
});