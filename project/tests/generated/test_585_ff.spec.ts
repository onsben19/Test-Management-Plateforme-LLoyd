import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('ff', async ({ page }) => {
  // Étape 1 : Ouvrir l'application navigateur Google Chrome.
  await page.goto('https://www.google.com');

  // Gérer les popups "Accepter les cookies" avant la première interaction.
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  // Étape 2 : Saisir l'URL est déjà effectuée via page.goto.

  // Étape 3 : Vérifier que la page d'accueil de Google est affichée avec le logo Google et la barre de recherche.
  const logoGoogle = page.locator('img[alt="Google"], [id="hplogo"]', { hasText: 'Google' });
  const barreRecherche = page.locator('textarea[name="q"], input[name="q"], input[title="Rechercher"], textarea[title="Rechercher"], select[title="Rechercher"]').first();

  await expect(logoGoogle).toBeVisible({ timeout: 10000 });
  await expect(barreRecherche).toBeVisible({ timeout: 10000 });
});