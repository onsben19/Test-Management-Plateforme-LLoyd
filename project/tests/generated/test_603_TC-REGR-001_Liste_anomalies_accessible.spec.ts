import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('TC-REGR-001 Liste anomalies accessible', async ({ page }) => {
  // Étape 1 : Se connecter au serveur local et accéder à l'URL
  await page.goto('http://nginx/anomalies');

  // Gérer les popups "Accepter les cookies" si présents
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  // Étape 2 : Vérifier que la page affiche le titre "Anomalies" ou une liste d'éléments
  const titreAnomalies = page.locator('h1, h2, h3:has-text("Anomalies")').first();
  const listeAnomalies = page.locator('ul, ol').first();
  await expect(titreAnomalies).toBeVisible({ timeout: 10000 });
  await expect(listeAnomalies).toBeVisible({ timeout: 10000 });

  // Étape 3 : Vérifier que la page ne contient pas d'éléments inattendus ou d'erreurs de chargement
  const erreurChargement = page.locator('text="Erreur de chargement"');
  await expect(erreurChargement).not.toBeVisible({ timeout: 5000 });
});