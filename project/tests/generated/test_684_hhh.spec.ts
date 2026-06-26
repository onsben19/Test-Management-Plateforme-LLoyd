import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('hhh', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const usernameLocator = page.locator('input[name="username"], input[id="username"], input[placeholder="Username"], textarea[placeholder="Username"], select[placeholder="Username"]');
  await usernameLocator.first().fill('tomsmith');
  await usernameLocator.first().dispatchEvent('input');

  const passwordLocator = page.locator('input[name="password"], input[id="password"], input[placeholder="Password"], textarea[placeholder="Password"], select[placeholder="Password"]');
  await passwordLocator.first().fill('SuperSecretPassword!');
  await passwordLocator.first().dispatchEvent('input');

  const loginButtonLocator = page.locator('button[type="submit"], button:has-text("Login"), button[id*="login"], a[id*="login"], input[id*="login"], [role="button"][id*="login"], [role="link"][id*="login"]');
  await loginButtonLocator.first().click({ force: true });

  await page.waitForLoadState('networkidle');

  const welcomeMessageLocator = page.locator('div[class*="flash"], [role="alert"], h1[id*="message"], h2[id*="message"], h3[id*="message"], h4[id*="message"], h5[id*="message"], h6[id*="message"], [role="heading"][id*="message"], span[id*="message"], p[id*="message"]');
  await expect(welcomeMessageLocator.first()).toContainText('Welcome to the secure area. When you are done browsing, sign out.', { timeout: 10000 });
});