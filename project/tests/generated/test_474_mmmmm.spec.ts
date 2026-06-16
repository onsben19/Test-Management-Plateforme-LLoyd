import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('mmmmm', async ({ page }) => {
    // 1. Ouvrir l'URL : `https://www.google.com`.
    await page.goto('https://www.google.com');

    // GESTION DES COOKIES : Tente d'accepter les cookies si le popup apparaît.
    await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

    // 2. Saisir la valeur "qualité logicielle" dans le champ de recherche.
    const searchInputLocator = page.locator('textarea[name="q"], input[name="q"], input[title="Rechercher"], textarea[title="Rechercher"], select[title="Rechercher"], input[aria-label="Rechercher"], textarea[aria-label="Rechercher"], select[aria-label="Rechercher"]').first();
    await searchInputLocator.evaluate((el, val) => {
        el.value = val;
        el.dispatchEvent(new Event('input', {bubbles: true}));
        el.dispatchEvent(new Event('change', {bubbles: true}));
    }, 'qualité logicielle');

    // 3. Cliquer sur le bouton "Recherche Google" ou appuyer sur la touche Entrée.
    // Utilisation de la touche Entrée pour plus de robustesse.
    await page.keyboard.press('Enter');

    // Attendre que la navigation soit complète après la recherche.
    await page.waitForLoadState('networkidle');

    // 4. Vérifier que la page de résultats de recherche s'affiche et contient des résultats pertinents pour le terme "qualité logicielle".
    // Vérifier l'URL pour s'assurer que la recherche a été effectuée.
    await expect(page).toHaveURL(/.*search\?q=qualit%C3%A9\+logicielle.*/, { timeout: 10000 });

    // Vérifier que le terme de recherche est présent sur la page des résultats.
    await expect(page.locator('body')).toContainText('qualité logicielle', { timeout: 10000 });
});