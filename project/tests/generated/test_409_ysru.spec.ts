import { test, expect } from '@playwright/test';

test.use({ screenshot: 'only-on-failure', baseURL: 'http://nginx' });


test('ysru', async ({ page }) => {
  // Étape 1 : Ouvrir l'URL /dashboard et attendre que la page soit complètement chargée
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  // Gérer les popups "Accepter les cookies"
  await page.locator('#L2AGLb, button:has-text("Tout accepter")').first().click({ timeout: 5000 }).catch(() => {});

  // Étape 2 : Rafraîchir la page du navigateur
  await page.reload();

  // Étape 3 : Vérifier que le titre principal ou un élément contenant "Tableau" est toujours visible et que l'URL contient toujours "dashboard"
  const tableauLocator = page.locator('h1:has-text("Tableau"), h2:has-text("Tableau"), [title="Tableau"]').first();
  await expect(tableauLocator).toBeVisible({ timeout: 10000 });
  await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
});