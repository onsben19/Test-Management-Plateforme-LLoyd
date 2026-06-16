import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('login', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const usernameLocator = page.locator('input[name="username"], input[id*="username"], input[placeholder*="username"], textarea[placeholder*="username"], select[placeholder*="username"]');
  const passwordLocator = page.locator('input[name="password"], input[id*="password"], input[placeholder*="password"], textarea[placeholder*="password"], select[placeholder*="password"]');

  await usernameLocator.first().evaluate((el, val) => { 
    el.value = val; 
    el.dispatchEvent(new Event('input', {bubbles: true})); 
    el.dispatchEvent(new Event('change', {bubbles: true})); 
  }, 'tomsmith');

  await passwordLocator.first().evaluate((el, val) => { 
    el.value = val; 
    el.dispatchEvent(new Event('input', {bubbles: true})); 
    el.dispatchEvent(new Event('change', {bubbles: true})); 
  }, 'SuperSecretPassword!');

  const loginButtonLocator = page.locator('button[type="submit"], button:has-text("Login"), button[id*="login"], a[id*="login"], input[id*="login"], [role="button"][id*="login"], [role="link"][id*="login"]');
  await loginButtonLocator.first().click({ force: true });

  await page.waitForLoadState('networkidle');

  await expect(page.locator('h2')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('h2')).toContainText('Secure Area', { timeout: 10000 });
});