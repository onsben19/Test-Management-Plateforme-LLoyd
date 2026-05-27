import { test, expect } from '@playwright/test';

test('gfh', async ({ page }) => {
  await page.goto('https://www.wikipedia.org/');
  await page.locator('#L2AGLb, button:has-text("Tout accepter"), button:has-text("Accepter"), button:has-text("Accept all")').first().click({ timeout: 5000 }).catch(() => {});

  const barreRecherche = page.locator('input[name="search"], input[id="searchInput"], [type="search"]').first();
  await barreRecherche.fill('Tunisie');
  await page.locator('button[type="submit"], button:has-text("Rechercher"), input[type="submit"]').first().click();

  const titrePrincipal = page.locator('h1[id="firstHeading"], h1[class="firstHeading"], [role="heading"][aria-level="1"]').first();
  await expect(titrePrincipal).toBeVisible({ timeout: 10000 });
  await expect(titrePrincipal).toContainText('Tunisie');
});