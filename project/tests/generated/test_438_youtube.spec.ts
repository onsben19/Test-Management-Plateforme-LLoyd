import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('youtube', async ({ page }) => {
  await page.goto('https://www.youtube.com');
  await page.waitForLoadState('networkidle');
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const barreRecherche = page.locator('input[id="search"], input[name="search"], [aria-label="Rechercher"]').first();
  const videosRecommandees = page.locator('ytd-video-renderer, #video-title, [id="video-title"]').first();

  await expect(barreRecherche).toBeVisible({ timeout: 10000 });
  await expect(videosRecommandees).toBeVisible({ timeout: 10000 });

  await page.waitForTimeout(2000);
  if (await page.locator('ytd-popup, #popup').isVisible()) {
    await page.locator('ytd-popup, #popup').click({ force: true });
  }

  await expect(page.locator('body')).toContainText('YouTube', { timeout: 10000 });
});