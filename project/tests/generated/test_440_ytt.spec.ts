import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('ytt', async ({ page }) => {
  await page.goto('https://www.youtube.com');
  await page.waitForLoadState('networkidle');

  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const searchLocator = page.locator('input[name="search_query"], input[id="search"], [aria-label="Rechercher"]').first();
  await searchLocator.evaluate((el, val) => { el.value = val; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }, 'test');
  await page.keyboard.press('Enter');

  await page.waitForLoadState('networkidle');

  const videoLocator = page.locator('video, ytd-video-renderer').first();
  await expect(videoLocator).toBeVisible({ timeout: 10000 });

  const linkLocator = page.locator('a, [role="link"]').first();
  await expect(linkLocator).toBeVisible({ timeout: 10000 });

  await page.locator('a, [role="link"]').first().click({ force: true });
  await page.waitForLoadState('networkidle');

  const contentLocator = page.locator('main, article, [role="main"]').first();
  await expect(contentLocator).toBeVisible({ timeout: 10000 });
});