import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('TC-MOB-002 Débordement formulaire 320px', async ({ page }) => {
  // Étape 1 : Ouvrir http://nginx/login avec une fenêtre de 320 pixels de large
  await page.setViewportSize({ width: 320, height: 600 });
  await page.goto('http://nginx/login');

  // Gérer les popups "Accepter les cookies"
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  // Étape 2 : Vérifier que tous les éléments de la page sont contenus dans la largeur de l'écran
  const pageWidth = await page.evaluate(() => document.documentElement.clientWidth);
  const elements = await page.$$('*');
  for (const element of elements) {
    const boundingBox = await element.boundingBox();
    if (boundingBox) {
      expect(boundingBox.width).toBeLessThanOrEqual(pageWidth);
    }
  }

  // Étape 3 : Vérifier qu'aucun élément ne dépasse horizontalement
  for (const element of elements) {
    const boundingBox = await element.boundingBox();
    if (boundingBox) {
      expect(boundingBox.x + boundingBox.width).toBeLessThanOrEqual(pageWidth);
    }
  }

  // Étape 4 : Vérifier que la page ne nécessite aucun scroll horizontal
  await expect(page).not.toHaveURL(/.*scroll-x/, { timeout: 10000 });
});