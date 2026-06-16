import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('ftfhhgf', async ({ page }) => {
  await page.goto('https://www.facebook.com/login');
  
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  await expect(page.locator('main, [role="main"]')).toBeVisible({ timeout: 10000 });

  const emailInput = page.locator('input[name="email"], input[type="email"], button[placeholder="Adresse e-mail"], a[placeholder="Adresse e-mail"], input[placeholder="Adresse e-mail"], [role="button"][placeholder="Adresse e-mail"], [role="link"][placeholder="Adresse e-mail"], h1[aria-label="Adresse e-mail"], h2[aria-label="Adresse e-mail"], h3[aria-label="Adresse e-mail"], h4[aria-label="Adresse e-mail"], h5[aria-label="Adresse e-mail"], h6[aria-label="Adresse e-mail"], [role="heading"][aria-label="Adresse e-mail"], span[aria-label="Adresse e-mail"], p[aria-label="Adresse e-mail"]');
  const passwordInput = page.locator('input[name="pass"], input[type="password"], button[placeholder="Mot de passe"], a[placeholder="Mot de passe"], input[placeholder="Mot de passe"], [role="button"][placeholder="Mot de passe"], [role="link"][placeholder="Mot de passe"], h1[aria-label="Mot de passe"], h2[aria-label="Mot de passe"], h3[aria-label="Mot de passe"], h4[aria-label="Mot de passe"], h5[aria-label="Mot de passe"], h6[aria-label="Mot de passe"], [role="heading"][aria-label="Mot de passe"], span[aria-label="Mot de passe"], p[aria-label="Mot de passe"]');

  await expect(emailInput.first()).toBeVisible({ timeout: 10000 });
  await expect(passwordInput.first()).toBeVisible({ timeout: 10000 });

  await emailInput.first().evaluate((el, val) => { 
    el.value = 'test@example.com'; 
    el.dispatchEvent(new Event('input', {bubbles: true})); 
    el.dispatchEvent(new Event('change', {bubbles: true})); 
  }, 'test@example.com');

  await passwordInput.first().evaluate((el, val) => { 
    el.value = 'password123'; 
    el.dispatchEvent(new Event('input', {bubbles: true})); 
    el.dispatchEvent(new Event('change', {bubbles: true})); 
  }, 'password123');

  await page.locator('button[type="submit"], button:has-text("Se connecter")').first().click({ force: true });
  await page.waitForLoadState('networkidle');
});