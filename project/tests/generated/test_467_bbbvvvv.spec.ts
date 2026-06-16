import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('bbbvvvv', async ({ page }) => {
  await page.goto('https://www.example.com'); // Remplacez par l'URL complète si fournie

  // Gestion des popups de cookies
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  // Interaction avec la page
  const locator = page.locator('textarea[name="q"], input[name="q"], input[title="Rechercher"], textarea[title="Rechercher"], select[title="Rechercher"]').first();
  await locator.evaluate((el, val) => { el.value = val; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }, 'valeur');

  // Recherche
  await page.keyboard.press('Enter');

  // Attente de navigation
  await page.waitForLoadState('networkidle');

  // Vérification du contenu
  const contenuLocator = page.locator('main, article, [role="main"]');
  await expect(contenuLocator).toBeVisible({ timeout: 10000 });
});