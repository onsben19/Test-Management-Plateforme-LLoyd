import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('tc', async ({ page }) => {
  // Étape 1 : Ouvrir l'URL
  await page.goto('https://fr.wikipedia.org');

  // Gérer les popups "Accepter les cookies"
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  // Étape 2 : Saisir la valeur "2ème guerre mondiale" dans la barre de recherche
  const searchLocator = page.locator('input[name="search"], input[type="search"], [aria-label="Rechercher"]').first();
  await searchLocator.click({ force: true });
  await searchLocator.fill('2ème guerre mondiale');
  await page.keyboard.press('Enter');

  // Étape 3 : Vérifier que le résultat de la recherche contient des informations sur la 2ème guerre mondiale
  const resultLocator = page.locator('h1[id="firstHeading"], h1.firstHeading').first();
  await expect(resultLocator).toBeVisible({ timeout: 10000 });
  await expect(resultLocator).toContainText('2ème guerre mondiale', { timeout: 10000 });
});