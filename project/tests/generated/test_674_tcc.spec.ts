import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('tcc', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const usernameInput = page.locator('input[name="username"], input[type="text"], input[placeholder="Username"], textarea[placeholder="Username"], select[placeholder="Username"]');
  await usernameInput.first().fill('toms');
  await usernameInput.first().dispatchEvent('input');

  const passwordInput = page.locator('input[name="password"], input[type="password"], input[placeholder="Password"], textarea[placeholder="Password"], select[placeholder="Password"]');
  await passwordInput.first().fill('SuperSecretPassword');
  await passwordInput.first().dispatchEvent('input');

  const loginButton = page.locator('button[type="submit"], button:has-text("Login")');
  await expect(loginButton.first()).toBeEnabled({ timeout: 10000 });

  await loginButton.first().click({ force: true });
  await page.waitForLoadState('networkidle');

  const errorMessages = page.locator('div.error, div.flash.error, h1.flash.error, h2.flash.error, h3.flash.error, h4.flash.error, h5.flash.error, h6.flash.error, [role="heading"].flash.error, span.flash.error, p.flash.error, h1.alert-danger, h2.alert-danger, h3.alert-danger, h4.alert-danger, h5.alert-danger, h6.alert-danger, [role="heading"].alert-danger, span.alert-danger, p.alert-danger, [role="alert"], button#flash, a#flash, input#flash, [role="button"]#flash, [role="link"]#flash');
  await expect(errorMessages.first()).toBeVisible({ timeout: 10000 });
});