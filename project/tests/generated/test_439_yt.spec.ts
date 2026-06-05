import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('yt', async ({ page }) => {
  await page.goto('https://www.youtube.com');
  await page.waitForLoadState('networkidle');
  
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const searchLocator = page.locator('input[id="search"], input[name="search"], [aria-label="Rechercher"]');
  await searchLocator.first().evaluate((el, val) => { 
    el.value = 'valeur'; 
    el.dispatchEvent(new Event('input', {bubbles: true})); 
    el.dispatchEvent(new Event('change', {bubbles: true})); 
  }, 'recherche youtube');

  await page.keyboard.press('Enter');
  await page.waitForLoadState('networkidle');

  const mainContentLocator = page.locator('main, article, [role="main"]').first();
  await expect(mainContentLocator).toBeVisible({ timeout: 10000 });

  const videoLocator = page.locator('video, [data-test-id="video-player"]');
  await expect(videoLocator).toBeVisible({ timeout: 10000 });
});