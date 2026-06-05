import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('def', async ({ page }) => {
  await page.goto('/notre-reseau/');
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const searchLocator = page.locator('input[name="search"], input[type="search"], [placeholder="Rechercher"], [title="Rechercher"]').first();
  if (await searchLocator.isVisible()) {
    await searchLocator.fill('La Soukra');
    await page.locator('button:has-text("Rechercher"), button[type="submit"]').first().click();
  } else {
    const agenceLocator = page.locator('h2:has-text("Agences"), h3:has-text("Agences")').first();
    await expect(agenceLocator).toBeVisible({ timeout: 10000 });
    const agenceListLocator = page.locator('ul:has(> h2:has-text("Agences")) > li, ul:has(> h3:has-text("Agences")) > li').first();
    await expect(agenceListLocator).toBeVisible({ timeout: 10000 });
    const laSoukraAgenceLocator = page.locator('text="La Soukra"').first();
    await expect(laSoukraAgenceLocator).toBeVisible({ timeout: 10000 });
  }

  const diploAgenceLocator = page.locator('text="Diplo"').first();
  await expect(diploAgenceLocator).toBeVisible({ timeout: 10000 });
});