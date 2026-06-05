import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('hjfxf', async ({ page }) => {
  await page.goto('/notre-reseau');
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const searchLocator = page.locator('input[name="search"], input[type="search"], [placeholder="Rechercher"], [title="Rechercher"]').first();
  await searchLocator.fill('La Soukra');
  await searchLocator.press('Enter');

  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const agencesLocator = page.locator('.agence, .agency, [class*="agence-"], [class*="agency-"]').first();
  await expect(agencesLocator).toBeVisible({ timeout: 10000 });

  const agencesListLocator = page.locator('.agences-list, .agencies-list, [class*="agences-list-"], [class*="agencies-list-"]');
  await expect(agencesListLocator).toContainText('La Soukra', { timeout: 10000 });
});