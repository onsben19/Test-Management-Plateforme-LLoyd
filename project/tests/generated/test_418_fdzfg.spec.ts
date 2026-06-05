import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('fdzfg', async ({ page }) => {
  await page.goto('https://www.lloyd.com.tn/conseils-lloyd/');
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const emailInput = page.locator('input[type="email"], input[name="email"], [placeholder="Adresse e-mail"]').first();
  await emailInput.fill('onsbenmassoud7@gmail.com');

  const bouton = page.locator('button[type="submit"], button:has-text("Envoyer"), [type="button"]').first();
  await page.evaluate(el => el.click(), bouton);

  await page.waitForTimeout(2000);
  const successMessage = page.locator('div:has-text("Inscription réussie"), div:has-text("Merci de vous être inscrit")').first();
  await expect(successMessage).toBeVisible({ timeout: 10000 });
});