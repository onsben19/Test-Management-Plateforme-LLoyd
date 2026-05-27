import { test, expect } from '@playwright/test';

test('tcc445', async ({ page }) => {
  await page.goto('https://www.wikipedia.org');
  await page.locator('#L2AGLb, button:has-text("Tout accepter"), button:has-text("Accepter"), button:has-text("Accept all")').first().click({ timeout: 5000 }).catch(() => {});

  const searchInput = page.locator('input[name="search"], input[id="searchInput"], [type="search"]');
  await searchInput.fill('Tunisie');
  await page.locator('button[type="submit"], button:has-text("Rechercher"), input[type="submit"]').first().click();

  await page.locator('#L2AGLb, button:has-text("Tout accepter"), button:has-text("Accepter"), button:has-text("Accept all")').first().click({ timeout: 5000 }).catch(() => {});

  const titleLocator = page.locator('h1[id="firstHeading"], h1[class="firstHeading"], [class*="page-title"]');
  await expect(titleLocator).toBeVisible({ timeout: 10000 });
  const titleText = await titleLocator.textContent();
  await expect(titleText).toContain('Tunisie');
});