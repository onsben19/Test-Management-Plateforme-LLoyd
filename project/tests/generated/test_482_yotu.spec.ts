import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('yotu', async ({ page }) => {
  await page.goto('https://www.youtube.com');
  
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const isConnected = await page.locator('button[id="avatar-btn"]').isVisible();
  if (!isConnected) {
    await page.locator('button:has-text("Se connecter")').first().click({ force: true });
    await page.locator('input[type="email"]').first().evaluate((el, val) => { 
      el.value = val; 
      el.dispatchEvent(new Event('input', {bubbles: true})); 
      el.dispatchEvent(new Event('change', {bubbles: true})); 
    }, 'votre_email@gmail.com');
    await page.locator('input[type="password"]').first().evaluate((el, val) => { 
      el.value = val; 
      el.dispatchEvent(new Event('input', {bubbles: true})); 
      el.dispatchEvent(new Event('change', {bubbles: true})); 
    }, 'votre_mot_de_passe');
    await page.locator('button[type="submit"]').first().click({ force: true });
    await page.waitForLoadState('networkidle');
  }

  await expect(page.locator('main, [role="main"]')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('ytd-video-renderer')).toBeVisible({ timeout: 10000 });
});