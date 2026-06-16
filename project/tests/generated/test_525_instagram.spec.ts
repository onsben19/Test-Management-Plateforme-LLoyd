import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('instagram', async ({ page }) => {
  await page.goto('https://www.instagram.com/');
  
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const logoInstagram = page.locator('img[alt="Instagram"], h1[aria-label="Instagram"], h2[aria-label="Instagram"], h3[aria-label="Instagram"], h4[aria-label="Instagram"], h5[aria-label="Instagram"], h6[aria-label="Instagram"], [role="heading"][aria-label="Instagram"], span[aria-label="Instagram"], p[aria-label="Instagram"], button[id*="logo"], a[id*="logo"], input[id*="logo"], [role="button"][id*="logo"], [role="link"][id*="logo"]').first();
  await expect(logoInstagram).toBeVisible({ timeout: 10000 });

  await logoInstagram.click({ force: true });

  await page.waitForLoadState('networkidle');

  const contenuPage = page.locator('main, article, [role="main"], body').first();
  await expect(contenuPage).toBeVisible({ timeout: 10000 });
});