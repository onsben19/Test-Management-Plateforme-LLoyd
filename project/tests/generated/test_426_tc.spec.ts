import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('tc', async ({ page }) => {
  await page.goto('/admissions/');
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const coursDuJourButton = page.locator('button:has-text("Cours du jour ( tunisiens)"), a:has-text("Cours du jour ( tunisiens)")').first();
  await expect(coursDuJourButton).toBeVisible({ timeout: 10000 });

  await coursDuJourButton.click({ force: true });
  await page.waitForTimeout(2000);

  const informationsAttendues = page.locator('div:has-text("Informations sur les cours du jour")').first();
  await expect(informationsAttendues).toBeVisible({ timeout: 10000 });
});