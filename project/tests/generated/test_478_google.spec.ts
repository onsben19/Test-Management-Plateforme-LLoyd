import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('google', async ({ page }) => {
  await page.goto('https://www.google.fr');
  
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const searchBar = page.locator('textarea[name="q"], input[name="q"], input[title="Rechercher"], textarea[title="Rechercher"], select[title="Rechercher"]').first();
  await searchBar.evaluate((el, val) => { el.value = val; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }, 'test');
  await page.keyboard.press('Enter');

  await page.waitForLoadState('networkidle');
  await expect(page.locator('main, article, [role="main"]')).toBeVisible({ timeout: 10000 });
});