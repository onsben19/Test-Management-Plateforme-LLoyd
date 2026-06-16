import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('tc', async ({ page }) => {
  await page.goto('https://www.google.com');
  
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const captchaLocator = page.locator('div.recaptcha-checkbox-border, [id*="recaptcha"] [role="presentation"]');
  if (await captchaLocator.isVisible()) {
    await captchaLocator.first().click({ force: true });
  }

  await expect(page.locator('body, main, [role="main"]')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('div.recaptcha-checkbox-checked, [id*="recaptcha"] button[aria-checked="true"], [id*="recaptcha"] a[aria-checked="true"], [id*="recaptcha"] input[aria-checked="true"], [id*="recaptcha"] [role="button"][aria-checked="true"], [id*="recaptcha"] [role="link"][aria-checked="true"]')).toBeVisible({ timeout: 10000 });
});