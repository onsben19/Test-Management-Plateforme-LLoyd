import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('efwf', async ({ page }) => {
  // Étape 1 : Ouvrir un navigateur web
  await page.goto('https://www.esprit.tn/', { waitUntil: 'networkidle' });

  // Gérer les popups "Accepter les cookies"
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  // Étape 2 : Saisir l'URL https://www.esprit.tn/ dans la barre d'adresse
  // Cette étape est déjà réalisée lors de l'appel à page.goto

  // Étape 3 : Vérifier que la page d'accueil du site s'affiche correctement
  await expect(page).toHaveURL('https://www.esprit.tn/', { timeout: 10000 });
  await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
});