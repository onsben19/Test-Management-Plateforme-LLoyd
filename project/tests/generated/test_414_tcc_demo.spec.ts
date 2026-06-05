import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('tcc demo', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const emailInput = page.locator('input[name="email"], input[type="email"], [placeholder="Email"]').first();
  const passwordInput = page.locator('input[name="password"], input[type="password"], [placeholder="Mot de passe"]').first();
  const loginButton = page.locator('button[type="submit"], button:has-text("Se connecter")').first();

  await emailInput.fill('admin');
  await passwordInput.fill('admin123');
  await loginButton.click();

  await expect(page).not.toHaveURL(/.*login/, { timeout: 10000 });
});