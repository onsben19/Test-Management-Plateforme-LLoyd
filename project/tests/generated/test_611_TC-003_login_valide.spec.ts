import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('TC-003 login valide', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const usernameInput = page.locator('input[name="username"], input[id*="username"], input[placeholder*="username"], textarea[placeholder*="username"], select[placeholder*="username"]');
  await usernameInput.first().fill('tomsmit');
  await usernameInput.first().dispatchEvent('input');

  const passwordInput = page.locator('input[name="password"], input[id*="password"], input[placeholder*="password"], textarea[placeholder*="password"], select[placeholder*="password"]');
  await passwordInput.first().fill('SuperSecretPassword!');
  await passwordInput.first().dispatchEvent('input');

  const loginButton = page.locator('button[type="submit"], button:has-text("Login"), button[id*="login"], a[id*="login"], input[id*="login"], [role="button"][id*="login"], [role="link"][id*="login"]');
  await loginButton.first().click({ force: true });

  await page.waitForLoadState('networkidle');

  const successMessage = page.locator('button#flash, a#flash, input#flash, [role="button"]#flash, [role="link"]#flash, button.flash, a.flash, input.flash, [role="button"].flash, [role="link"].flash, [role="alert"], h1[id*="success"], h2[id*="success"], h3[id*="success"], h4[id*="success"], h5[id*="success"], h6[id*="success"], [role="heading"][id*="success"], span[id*="success"], p[id*="success"]');
  await expect(successMessage.first()).toBeVisible({ timeout: 10000 });
});