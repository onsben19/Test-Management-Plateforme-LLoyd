import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure' });


test('hhtc1ghgg', async ({ page }) => {
  await page.goto('https://www.wikipedia.org/');
  await page.locator('#L2AGLb, button:has-text("Tout accepter"), button:has-text("Accepter"), button:has-text("Accept all")').first().click({ timeout: 5000 }).catch(() => {});

  const barreRecherche = page.locator('input[name="search"], input[id="searchInput"], [type="search"]').first();
  await barreRecherche.fill('Tunisie');
  await barreRecherche.press('Enter');

  const titrePage = page.locator('h1[id="firstHeading"], h1[class="firstHeading"], h1:has-text("Tunisie")').first();
  await expect(titrePage).toBeVisible({ timeout: 10000 });
  await expect(titrePage).toContainText('Tunisie');
});