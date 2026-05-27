import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('urxhdc', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});
  await expect(page).toHaveURL(/.*login/, { timeout: 10000 });

  await page.reload();
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
  await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 10000 });
});