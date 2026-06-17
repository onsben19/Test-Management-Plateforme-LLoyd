import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('gcfhvjb', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const usernameInput = page.locator('input[name="username"], input[id*="username"], input[placeholder*="username"], textarea[placeholder*="username"], select[placeholder*="username"]');
  await usernameInput.first().evaluate((el, val) => { 
    el.value = val; 
    el.dispatchEvent(new Event('input', {bubbles: true})); 
    el.dispatchEvent(new Event('change', {bubbles: true})); 
  }, 'tomsmit');

  const passwordInput = page.locator('input[name="password"], input[id*="password"], input[placeholder*="password"], textarea[placeholder*="password"], select[placeholder*="password"]');
  await passwordInput.first().evaluate((el, val) => { 
    el.value = val; 
    el.dispatchEvent(new Event('input', {bubbles: true})); 
    el.dispatchEvent(new Event('change', {bubbles: true})); 
  }, 'SuperSecretPassword!');

  const loginButton = page.locator('button:has-text("Login"), button[type="submit"], button[id*="login"], a[id*="login"], input[id*="login"], [role="button"][id*="login"], [role="link"][id*="login"]');
  await expect(loginButton.first()).toBeEnabled({ timeout: 10000 });

  await loginButton.first().click({ force: true });
  await page.waitForLoadState('networkidle');

  const errorMessages = page.locator('h1.error, h2.error, h3.error, h4.error, h5.error, h6.error, [role="heading"].error, span.error, p.error, h1.error-message, h2.error-message, h3.error-message, h4.error-message, h5.error-message, h6.error-message, [role="heading"].error-message, span.error-message, p.error-message, [role="alert"]');
  await expect(errorMessages.first()).toBeVisible({ timeout: 10000 });
});