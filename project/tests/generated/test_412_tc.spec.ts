import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('tc', async ({ page }) => {
  // Étape 1 : Ouvrir l'application Opera sur l'appareil de test
  await page.goto('https://www.opera.com/');

  // Étape 2 : Saisir une URL valide dans la barre d'adresse du navigateur
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});
  const urlBarre = page.locator('input[type="url"], input[type="search"], [role="searchbox"]').first();
  await urlBarre.click();
  await urlBarre.fill('https://www.google.com');

  // Étape 3 : Vérifier que la page web correspondante s'affiche correctement dans le navigateur Opera
  await page.keyboard.press('Enter');
  await expect(page.locator('img[alt="Google"]').first()).toBeVisible({ timeout: 10000 });
});