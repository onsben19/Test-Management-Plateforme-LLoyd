import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('vxb', async ({ page }) => {
  await page.goto('https://www.wikipedia.org/');
  await page.waitForLoadState('networkidle');
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const searchLocator = page.locator('input[name="search"], input[id="searchInput"], [type="search"]').first();
  await searchLocator.evaluate((el, val) => { el.value = val; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }, 'Intelligence Artificielle');
  await page.keyboard.press('Enter');

  await page.waitForLoadState('networkidle');
  await expect(page).toHaveTitle(/Intelligence artificielle/, { timeout: 15000 });
  // Cibler le corps de l'article Wikipedia directement (pas le premier div générique)
  const articleBody = page.locator('#mw-content-text');
  await expect(articleBody).toContainText('apprentissage automatique', { timeout: 15000 });
});