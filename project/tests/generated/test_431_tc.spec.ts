import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('tc ', async ({ page }) => {
  // Étape 1 : Ouvrir Google Chrome sur l'ordinateur
  await page.goto('https://www.google.fr');

  // Gestion des popups "Accepter les cookies"
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  // Étape 2 : Saisir l'URL d'une page web dans la barre d'adresse
  const locator = page.locator('textarea[name="q"], input[name="q"], [title="Rechercher"]').first();
  await locator.click({ force: true });
  await locator.type('https://www.google.fr');

  // Appuyer sur la touche "Entrée" pour valider la recherche
  await page.keyboard.press('Enter');

  // Étape 3 : Vérifier que la page web s'affiche correctement dans le navigateur
  await expect(page).toHaveURL('https://www.google.fr', { timeout: 10000 });
  await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
});