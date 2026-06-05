import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('fvfv', async ({ page }) => {
  await page.goto('https://www.google.com/webhp?hl=en&sa=X&ved=0ahUKEwj5o7yhvO6UAxWn2gIHHTm8LrMQPAgI');
  
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});
  
  const searchLocator = page.locator('textarea[name="q"], input[name="q"], [title="Rechercher"]').first();
  await searchLocator.click();
  await searchLocator.fill('capitale de la France');
  
  await page.keyboard.press('Enter');
  
  await page.waitForTimeout(2000);
  
  const resultLocator = page.locator('text="Paris"').first();
  await expect(resultLocator).toBeVisible({ timeout: 10000 });
});