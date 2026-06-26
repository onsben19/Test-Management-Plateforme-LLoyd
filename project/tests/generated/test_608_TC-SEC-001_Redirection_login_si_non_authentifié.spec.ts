import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('TC-SEC-001 Redirection login si non authentifié', async ({ page }) => {
  // Étape 1 : Ouvrir l'URL sans se connecter
  await page.goto('http://nginx/manager');

  // Gérer les popups de cookies si présents
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  // Vérifier la redirection ou le message d'accès non autorisé
  await page.waitForTimeout(2000);
  if (await page.url().then(url => url.includes('login'))) {
    // La page a été redirigée vers la page de login
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
  } else {
    // La page affiche un message d'accès non autorisé
    const messageNonAutorise = page.locator('text="Accès non autorisé"');
    await expect(messageNonAutorise).toBeVisible({ timeout: 10000 });
  }
});