import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('wiki', async ({ page }) => {
  await page.goto('https://www.wikipedia.org/');
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const searchLocator = page.locator('input[id="searchInput"], input[name="search"], [type="search"]').first();
  await searchLocator.click({ force: true });
  await searchLocator.fill('Seconde Guerre mondiale');
  await page.keyboard.press('Enter');

  await expect(page.locator('h1[id="firstHeading"], h1:first-child')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('h1[id="firstHeading"], h1:first-child')).toContainText('Seconde Guerre mondiale', { timeout: 10000 });
});