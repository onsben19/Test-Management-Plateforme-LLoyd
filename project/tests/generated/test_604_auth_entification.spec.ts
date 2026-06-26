import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('auth entification', async ({ page }) => {
  await page.goto('http://nginx/login');
  
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder="Email"], textarea[placeholder="Email"], select[placeholder="Email"]');
  await emailInput.first().fill('maissa.drira1@gmail.com');
  await emailInput.first().dispatchEvent('input');

  const passwordInput = page.locator('input[type="password"], input[name="password"], button[placeholder="Mot de passe"], a[placeholder="Mot de passe"], input[placeholder="Mot de passe"], [role="button"][placeholder="Mot de passe"], [role="link"][placeholder="Mot de passe"]');
  await passwordInput.first().fill('Maissa123!');
  await passwordInput.first().dispatchEvent('input');

  const loginButton = page.locator('button[type="submit"], button:has-text("Se connecter"), button[id*="login"], a[id*="login"], input[id*="login"], [role="button"][id*="login"], [role="link"][id*="login"]');
  await loginButton.first().click({ force: true });

  await page.waitForTimeout(2000);

  const otpInput = page.locator('input[name="otp"], input[placeholder="Code OTP"], button[id*="otp"], a[id*="otp"], input[id*="otp"], [role="button"][id*="otp"], [role="link"][id*="otp"]');
  await expect(otpInput.first()).toBeVisible({ timeout: 10000 });

  await otpInput.first().fill('000000');
  await otpInput.first().dispatchEvent('input');

  const validateButton = page.locator('button[type="submit"], button:has-text("Valider"), button[id*="validate"], a[id*="validate"], input[id*="validate"], [role="button"][id*="validate"], [role="link"][id*="validate"]');
  await validateButton.first().click({ force: true });

  await page.waitForLoadState('networkidle');

  await expect(page).not.toHaveURL(/.*login/, { timeout: 10000 });
});