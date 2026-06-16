import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('ytb', async ({ page }) => {
    // 1. Ouvrir l'URL : https://www.youtube.com
    await page.goto('https://www.youtube.com');

    // 5. GESTION DES URLs & ROBUSTESSE (Cookies)
    // Tente de cliquer sur un bouton d'acceptation des cookies si présent
    await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

    // 2. Attendre le chargement complet de la page (15. ATTENTE DE NAVIGATION)
    await page.waitForLoadState('networkidle');

    // 3. Vérifier que la page d'accueil de YouTube s'affiche correctement avec les éléments attendus
    // (8. Inclus les assertions pour les 'Attendus' & 16. ASSERTIONS PRÉCISES)

    // Vérifier la présence du logo YouTube
    await expect(page.locator('a[id="logo"], a[title="Page d\'accueil YouTube"]').first()).toBeVisible({ timeout: 10000 });

    // Vérifier la présence de la barre de recherche
    await expect(page.locator('input[id="search"], input[name="search_query"]').first()).toBeVisible({ timeout: 10000 });

    // Vérifier la présence d'une section de vidéos recommandées ou de vignettes vidéo
    // Utilisation de sélecteurs plus génériques pour les vidéos
    await expect(page.locator('ytd-rich-grid-media, ytd-video-renderer, a[id="video-title"]').first()).toBeVisible({ timeout: 15000 }); // Augmenter le timeout pour le chargement des vidéos

    // Vérifier la présence d'une section de catégories ou de navigation latérale
    await expect(page.locator('ytd-guide-renderer, ytd-mini-guide-renderer, #sections #items a[role="link"]').first()).toBeVisible({ timeout: 10000 });

    // Vérifier que l'URL est bien celle de YouTube (ou une variante)
    await expect(page).toHaveURL(/youtube\.com/, { timeout: 10000 });
});