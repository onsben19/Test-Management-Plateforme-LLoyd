import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('tcc dem', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const emailLocator = page.locator('input[name="email"], input[type="email"], [placeholder="Email"]');
  const passwordLocator = page.locator('input[name="password"], input[type="password"], [placeholder="Mot de passe"]');
  const connexionButtonLocator = page.locator('button[type="submit"], button:has-text("Se connecter")');

  await emailLocator.first().fill('admin');
  await passwordLocator.first().fill('admin123');

  await connexionButtonLocator.first().click();

  await expect(page).not.toHaveURL(/.*login/, { timeout: 10000 });
});