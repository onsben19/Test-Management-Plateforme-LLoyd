import { test, expect } from '@playwright/test';

test('tc', async ({ page }) => {
  await page.goto('https://www.wikipedia.org');
  await page.locator('#L2AGLb, button:has-text("Tout accepter"), button:has-text("Accepter"), button:has-text("Accept all")').first().click({ timeout: 5000 }).catch(() => {});

  const searchInput = page.locator('input[id="searchInput"], input[name="search"], [type="search"]').first();
  await searchInput.fill('Tunisia');
  await page.locator('button[type="submit"], button:has-text("Rechercher"), input[type="submit"]').first().click();

  const titleLocator = page.locator('h1[id="firstHeading"], h1[class*="firstHeading"], [role="heading"][aria-level="1"]').first();
  await expect(titleLocator).toBeVisible({ timeout: 10000 });
  await expect(titleLocator).toContainText('Tunisia');
});