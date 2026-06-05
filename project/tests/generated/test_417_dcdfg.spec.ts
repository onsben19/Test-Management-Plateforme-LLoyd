import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('dcdfg', async ({ page }) => {
  await page.goto('https://www.lloyd.com.tn/conseils-lloyd/');
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  await page.locator('input[type="email"], input[name="email"], [placeholder="Adresse e-mail"]').first().fill('onsbenmassoud7@gmail.com');
  await page.locator('button[type="submit"], button:has-text("Envoyer"), [type="button"]').first().click({ force: true });

  await expect(page.locator('text="Merci de vous être inscrit à notre newsletter"')).toBeVisible({ timeout: 10000 });
});