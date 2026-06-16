import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('ggg', async ({ page }) => {
    // Étape 1: Ouvrir l'URL : https://www.youtube.com
    await page.goto('https://www.youtube.com');

    // GESTION DES COOKIES : Tente d'accepter les cookies si le popup apparaît.
    await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ force: true, timeout: 5000 }).catch(() => {});

    // Étape 2: Attendre le chargement complet de la page
    await page.waitForLoadState('networkidle');

    // Vérification de l'URL pour s'assurer que nous sommes bien sur YouTube
    await expect(page).toHaveURL(/youtube\.com/, { timeout: 10000 });

    // Étape 3: Vérifier que la page d'accueil de YouTube s'affiche correctement avec les éléments attendus
    // Vérifier la présence du conteneur principal des vidéos recommandées
    await expect(page.locator('button[id="contents"], a[id="contents"], input[id="contents"], [role="button"][id="contents"], [role="link"][id="contents"], main[role="main"]').first()).toBeVisible({ timeout: 10000 });

    // Vérifier la présence d'au moins une vignette de vidéo (indicateur de chargement des vidéos)
    await expect(page.locator('ytd-thumbnail img, img[src*="ytimg.com"]').first()).toBeVisible({ timeout: 10000 });

    // Vérifier la présence de la barre latérale ou des catégories (indicateur de l'interface complète)
    await expect(page.locator('button[id="guide-content"], a[id="guide-content"], input[id="guide-content"], [role="button"][id="guide-content"], [role="link"][id="guide-content"], ytd-guide-entry-renderer').first()).toBeVisible({ timeout: 10000 });
});