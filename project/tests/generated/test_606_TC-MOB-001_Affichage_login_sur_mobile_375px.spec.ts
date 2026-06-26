import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('TC-MOB-001 Affichage login sur mobile 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 600 });
  await page.goto('http://nginx/login');

  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const formulaireConnexion = page.locator('form, [role="form"]');
  await expect(formulaireConnexion.first()).toBeVisible({ timeout: 10000 });

  const boutonSeConnecter = page.locator('button[type="submit"], button:has-text("Se connecter")');
  await expect(boutonSeConnecter.first()).toBeVisible({ timeout: 10000 });

  const largeurPage = await page.evaluate(() => document.documentElement.clientWidth);
  expect(largeurPage).toBeLessThanOrEqual(375);

  await expect(formulaireConnexion.first()).not.toHaveAttribute('style', /overflow-x/);
});