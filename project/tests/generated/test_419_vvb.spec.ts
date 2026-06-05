import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('vvb', async ({ page }) => {
  await page.goto('/notre-reseau/');

  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const searchLocator = page.locator('input[name="search"], input[type="search"], [placeholder="Rechercher"], [title="Rechercher"]').first();
  await searchLocator.fill('La Soukra');

  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  await page.waitForTimeout(2000);

  const resultsLocator = page.locator('.agence, .resultat, [class*="agence-"], [class*="resultat-"]').first();
  await expect(resultsLocator).toBeVisible({ timeout: 10000 });

  await expect(page.locator('text="La Soukra"')).toBeVisible({ timeout: 10000 });
});