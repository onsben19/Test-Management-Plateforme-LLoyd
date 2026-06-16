import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('ggg', async ({ page }) => {
  await page.goto('https://www.youtube.com');
  
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const searchLocator = page.locator('input[id="search"], input[name="search"], input[aria-label="Rechercher"], textarea[aria-label="Rechercher"], select[aria-label="Rechercher"]')
  await searchLocator.first().evaluate((el, val) => { el.value = val; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }, 'musique');
  
  await page.keyboard.press('Enter');
  
  await page.waitForTimeout(2000);
  
  const resultsLocator = page.locator('ytd-video-renderer, h1[id="video-title"], h2[id="video-title"], h3[id="video-title"], h4[id="video-title"], h5[id="video-title"], h6[id="video-title"], [role="heading"][id="video-title"], span[id="video-title"], p[id="video-title"]')
  await expect(resultsLocator.first()).toBeVisible({ timeout: 10000 });
  
  await page.waitForLoadState('networkidle');
  
  await expect(page.locator('ytd-video-renderer, h1[id="video-title"], h2[id="video-title"], h3[id="video-title"], h4[id="video-title"], h5[id="video-title"], h6[id="video-title"], [role="heading"][id="video-title"], span[id="video-title"], p[id="video-title"]')).not.toHaveCount(0);
});