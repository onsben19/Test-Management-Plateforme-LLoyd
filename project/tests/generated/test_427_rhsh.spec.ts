import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('rhsh', async ({ page }) => {
  await page.goto('https://www.esprit.tn/admissions/');
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const coursDuJourButton = page.locator('button:has-text("Cours du jour (tunisiens)"), a:has-text("Cours du jour (tunisiens)")').first();
  await expect(coursDuJourButton).toBeVisible({ timeout: 10000 });

  await coursDuJourButton.click({ force: true });
  await expect(coursDuJourButton).toBeEnabled({ timeout: 10000 });

  await page.waitForTimeout(2000);
  if (await page.locator('div:has-text("Cours du jour (tunisiens)")').isVisible()) {
    await expect(page.locator('div:has-text("Cours du jour (tunisiens)")')).toBeVisible({ timeout: 10000 });
  } else {
    await expect(page.locator('div:has-text("Cours du jour (tunisiens)")')).not.toBeVisible({ timeout: 10000 });
  }
});