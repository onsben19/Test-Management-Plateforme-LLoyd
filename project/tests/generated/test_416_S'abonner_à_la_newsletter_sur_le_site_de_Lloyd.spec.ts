import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('S\'abonner à la newsletter sur le site de Lloyd', async ({ page }) => {
  await page.goto('https://www.lloyd.com.tn/conseils-lloyd/');
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  await page.locator('textarea, input[type="email"]').first().scrollIntoViewIfNeeded();
  await page.locator('textarea, input[type="email"]').first().fill('onsbenmassoud7@gmail.com');

  await page.locator('button:has-text("Envoyer"), button[type="submit"]').first().waitFor({ timeout: 5000 });
  await expect(page.locator('button:has-text("Envoyer"), button[type="submit"]').first()).toBeEnabled({ timeout: 5000 });

  await page.locator('button:has-text("Envoyer"), button[type="submit"]').first().click();
  await expect(page.locator('div:has-text("Merci pour votre inscription")')).toBeVisible({ timeout: 10000 });
});