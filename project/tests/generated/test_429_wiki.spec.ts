import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('wiki', async ({ page }) => {
  await page.goto('/');
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const searchLocator = page.locator('input[name="search"], input[type="search"], [placeholder="Rechercher"], [title="Rechercher"]').first();
  await searchLocator.click({ force: true });
  await searchLocator.fill('2ème guerre mondiale');
  await page.keyboard.press('Enter');

  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const resultLocator = page.locator('h1, h2, h3, [class*="mw-headline"]').first();
  await expect(resultLocator).toBeVisible({ timeout: 10000 });
  await expect(resultLocator).toContainText('2ème guerre mondiale', { timeout: 10000 });

  const informationLocator = page.locator('p, [class*="mw-parser-output"]').first();
  await expect(informationLocator).toBeVisible({ timeout: 10000 });
  await expect(informationLocator).toContainText('La 2ème guerre mondiale', { timeout: 10000 });
});