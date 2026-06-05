import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('fdf', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const loginPageLocator = page.locator('h2:has-text("Se connecter"), h1:has-text("Connexion")');
  await expect(loginPageLocator.first()).toBeVisible({ timeout: 10000 });

  const usernameInputLocator = page.locator('input[name="email"], input[name="username"], input[type="email"]');
  const passwordInputLocator = page.locator('input[name="pass"], input[name="password"], input[type="password"]');

  await expect(usernameInputLocator.first()).toBeVisible({ timeout: 10000 });
  await expect(passwordInputLocator.first()).toBeVisible({ timeout: 10000 });

  await usernameInputLocator.first().click();
  await passwordInputLocator.first().click();

  await expect(usernameInputLocator.first()).toBeFocused({ timeout: 10000 });
  await expect(passwordInputLocator.first()).toBeFocused({ timeout: 10000 });
});