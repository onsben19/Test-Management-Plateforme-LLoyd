import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('ttt', async ({ page }) => {
  // Étape 1 : Ouvrir l'URL
  await page.goto('https://www.wikipedia.org/');

  // Gestion des cookies
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  // Étape 2 : Saisir "Intelligence Artificielle" dans la barre de recherche
  const searchLocator = page.locator('input[id="searchInput"], input[name="search"], [type="search"]').first();
  await searchLocator.fill('Intelligence Artificielle');
  await page.keyboard.press('Enter');

  // Étape 3 : Vérifier que le titre de la page contient "Intelligence artificielle" et que le contenu mentionne "apprentissage automatique"
  await expect(page).toHaveTitle(/Intelligence artificielle/);
  const contentLocator = page.locator('body').first();
  await expect(contentLocator).toContainText('apprentissage automatique', { timeout: 10000 });
});