import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('dfdf', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const usernameInput = page.locator('input[name="username"], input[id*="username"], input[placeholder*="username"], textarea[placeholder*="username"], select[placeholder*="username"]');
  await usernameInput.first().evaluate((el, val) => { el.value = val; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }, 'tomsmith');

  const passwordInput = page.locator('input[name="password"], input[id*="password"], input[placeholder*="password"], textarea[placeholder*="password"], select[placeholder*="password"]');
  await passwordInput.first().evaluate((el, val) => { el.value = val; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }, 'SuperSecretPassword!');

  const loginButton = page.locator('button[type="submit"], button:has-text("Login"), button[id*="login"], a[id*="login"], input[id*="login"], [role="button"][id*="login"], [role="link"][id*="login"]');
  await loginButton.first().click({ force: true });

  await page.waitForLoadState('networkidle');

  const secureAreaLocator = page.locator('h2, [role="heading"], h1[class*="heading"], h2[class*="heading"], h3[class*="heading"], h4[class*="heading"], h5[class*="heading"], h6[class*="heading"], [role="heading"][class*="heading"], span[class*="heading"], p[class*="heading"]');
  await expect(secureAreaLocator.first()).toBeVisible({ timeout: 10000 });
  await expect(secureAreaLocator.first()).toContainText('Secure Area', { timeout: 10000 });
});