import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('tc 11', async ({ page }) => {
  await page.goto('https://www.lloyd.com.tn/notre-reseau/');
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});
  await page.locator('input[name="search"], input[type="search"], [placeholder="Rechercher"]').first().fill('La Soukra');
  await page.locator('button:has-text("Rechercher"), button[type="submit"]').first().click();
  await page.waitForTimeout(2000);
  const agencesLocator = page.locator('div.agence, div.resultat, [class*="agence-"]');
  await expect(agencesLocator.first()).toBeVisible({ timeout: 10000 });
  await expect(agencesLocator).toContainText('La Soukra', { timeout: 10000 });
});