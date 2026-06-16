import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('ergngkneg', async ({ page }) => {
  // Étape 1 : Ouvrir l'URL
  await page.goto('https://openai.com/');

  // Gérer les popups "Accepter les cookies"
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  // Étape 2 : Saisir la valeur de l'adresse e-mail et du mot de passe
  const emailLocator = page.locator('input[name="email"], input[type="email"], input[id*="email"], textarea[id*="email"], select[id*="email"]');
  const passwordLocator = page.locator('input[name="password"], input[type="password"], input[id*="password"], textarea[id*="password"], select[id*="password"]');

  await emailLocator.first().evaluate((el, val) => { 
    el.value = 'votre_email@example.com'; 
    el.dispatchEvent(new Event('input', {bubbles: true})); 
    el.dispatchEvent(new Event('change', {bubbles: true})); 
  }, 'votre_email@example.com');

  await passwordLocator.first().evaluate((el, val) => { 
    el.value = 'votre_mot_de_passe'; 
    el.dispatchEvent(new Event('input', {bubbles: true})); 
    el.dispatchEvent(new Event('change', {bubbles: true})); 
  }, 'votre_mot_de_passe');

  // Étape 3 : Vérifier que l'utilisateur est connecté
  const loginButtonLocator = page.locator('button[type="submit"], button:has-text("Se connecter"), button[id*="login"], a[id*="login"], input[id*="login"], [role="button"][id*="login"], [role="link"][id*="login"]');
  await loginButtonLocator.first().click({ force: true });

  await page.waitForLoadState('networkidle');

  // Vérifier que l'utilisateur est connecté et a accès à l'interface utilisateur de Google Open AI
  const dashboardLocator = page.locator('main, article, [role="main"]');
  await expect(dashboardLocator.first()).toBeVisible({ timeout: 10000 });
});