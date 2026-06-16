import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('ouvrirr ytv', async ({ page }) => {
    // 1. Ouvrir un navigateur web. (Géré par Playwright)
    // 2. Accéder à l'URL : https://www.google.com
    await page.goto('https://www.google.com');

    // GESTION DES URLs : L'URL absolue est utilisée comme spécifié.
    // Sois TRES ROBUSTE : Gestion des popups "Accepter les cookies".
    await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

    // 3. Vérifier que la page d'accueil de Google est affichée avec le logo Google et la barre de recherche.
    // Déduction de sélecteurs très flexibles pour le logo Google.
    const googleLogo = page.locator('img[alt="Google"], button#hplogo, a#hplogo, input#hplogo, [role="button"]#hplogo, [role="link"]#hplogo, button.lnXdpd, a.lnXdpd, input.lnXdpd, [role="button"].lnXdpd, [role="link"].lnXdpd').first();
    // Inclusion d'assertions pour les attendus.
    await expect(googleLogo).toBeVisible({ timeout: 10000 });

    // Déduction de sélecteurs très flexibles pour la barre de recherche.
    const searchBar = page.locator('textarea[name="q"], input[name="q"], input[title="Rechercher"], textarea[title="Rechercher"], select[title="Rechercher"]').first();
    // Inclusion d'assertions pour les attendus.
    await expect(searchBar).toBeVisible({ timeout: 10000 });
});