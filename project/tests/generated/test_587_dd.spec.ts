import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('dd', async ({ page }) => {
  await page.goto('https://www.youtube.com');
  
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const searchLocator = page.locator('input[name="search_query"], input[id="search"], input[aria-label="Rechercher"], textarea[aria-label="Rechercher"], select[aria-label="Rechercher"]')
  await searchLocator.first().fill('abtalk');
  await searchLocator.first().dispatchEvent('input');
  await page.keyboard.press('Enter');

  await page.waitForLoadState('networkidle');

  const resultsLocator = page.locator('ytd-video-renderer, h1#video-title, h2#video-title, h3#video-title, h4#video-title, h5#video-title, h6#video-title, [role="heading"]#video-title, span#video-title, p#video-title, h1[id="video-title"], h2[id="video-title"], h3[id="video-title"], h4[id="video-title"], h5[id="video-title"], h6[id="video-title"], [role="heading"][id="video-title"], span[id="video-title"], p[id="video-title"]')
  await expect(resultsLocator.first()).toBeVisible({ timeout: 10000 });
});