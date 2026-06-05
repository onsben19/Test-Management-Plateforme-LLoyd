import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('fgf', async ({ page }) => {
  await page.goto('/notre-reseau/');
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});
  const searchLocator = page.locator('input[name="search"], input[type="search"], [placeholder="Rechercher"], [title="Rechercher"]').first();
  await searchLocator.click();
  await searchLocator.fill('La Soukra');
  await page.locator('button[type="submit"], button:has-text("Rechercher"), [title="Rechercher"]').first().click();
  await page.waitForTimeout(2000);
  const agenciesLocator = page.locator('.agence, .agency, [class*="agence-"], [class*="agency-"]').first();
  await expect(agenciesLocator).toBeVisible({ timeout: 10000 });
  await expect(agenciesLocator).toContainText('La Soukra', { timeout: 10000 });
});