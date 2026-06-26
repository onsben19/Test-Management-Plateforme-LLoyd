import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('TC-AUTH-002 Connexion avec identifiants incorrects', async ({ page }) => {
  await page.goto('/login');
  
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const emailInput = page.locator('input[type="email"], input[name="email"], button[placeholder="Adresse e-mail"], a[placeholder="Adresse e-mail"], input[placeholder="Adresse e-mail"], [role="button"][placeholder="Adresse e-mail"], [role="link"][placeholder="Adresse e-mail"]');
  await emailInput.first().fill('faux@inexistant.com');
  await emailInput.first().dispatchEvent('input');

  const passwordInput = page.locator('input[type="password"], input[name="password"], button[placeholder="Mot de passe"], a[placeholder="Mot de passe"], input[placeholder="Mot de passe"], [role="button"][placeholder="Mot de passe"], [role="link"][placeholder="Mot de passe"]');
  await passwordInput.first().fill('mauvaismdp123');
  await passwordInput.first().dispatchEvent('input');

  const submitButton = page.locator('button[type="submit"], button:has-text("Se connecter"), button[id*="login"], a[id*="login"], input[id*="login"], [role="button"][id*="login"], [role="link"][id*="login"]');
  await submitButton.first().click({ force: true });

  await page.waitForLoadState('networkidle');

  const welcomeText = page.locator('h1:has-text("Bienvenue"), p:has-text("Bienvenue"), [role="alert"]:has-text("Bienvenue")');
  await expect(welcomeText).not.toBeVisible({ timeout: 10000 });
});