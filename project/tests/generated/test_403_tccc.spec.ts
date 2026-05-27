import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('tccc', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});
  await page.locator('input[name="username"], input[type="text"], [placeholder="Nom d\'utilisateur"]').first().fill('manager');
  await page.locator('input[name="password"], input[type="password"], [placeholder="Mot de passe"]').first().fill('+WpKuC3Rt@O*');
  await page.locator('button:has-text("Valider"), button[type="submit"], [role="button"]').first().click();
  const twoFaLocator = page.locator('input[name="2fa"], input[type="number"], [placeholder="Code 2FA"]');
  if (await twoFaLocator.first().isVisible({ timeout: 5000 })) {
    await twoFaLocator.first().fill('000000');
    await page.locator('button:has-text("Valider"), button[type="submit"], [role="button"]').first().click();
  }
  await expect(page.locator('text="Tableau de bord"')).toBeVisible({ timeout: 10000 });
});