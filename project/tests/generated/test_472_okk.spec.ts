import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('okk', async ({ page }) => {
  // Étape 1 & 2: Ouvrir le navigateur et naviguer vers l'URL de Google
  await page.goto('https://www.google.com');

  // GESTION DES COOKIES : Tenter d'accepter les cookies si le popup apparaît
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  // Étape 3: Vérifier que la page d'accueil de Google s'affiche correctement
  // Vérifier le logo Google
  await expect(page.locator('img[alt="Google"], img[aria-label="Google"]')).first().toBeVisible({ timeout: 10000 });

  // Vérifier la barre de recherche
  await expect(page.locator('textarea[name="q"], input[name="q"], input[title="Rechercher"], textarea[title="Rechercher"], select[title="Rechercher"]')).first().toBeVisible({ timeout: 10000 });

  // Vérifier le bouton "Recherche Google"
  await expect(page.locator('button:has-text("Recherche Google"), input[value="Recherche Google"]')).first().toBeVisible({ timeout: 10000 });

  // Vérifier le bouton "J'ai de la chance"
  await expect(page.locator('button:has-text("J\'ai de la chance"), input[value="J\'ai de la chance"]')).first().toBeVisible({ timeout: 10000 });
});