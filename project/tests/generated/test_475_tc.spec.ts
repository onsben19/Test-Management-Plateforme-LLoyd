import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('tc', async ({ page }) => {
    // Étape 1: Ouvrir l'URL de l'application et naviguer vers la page de connexion.
    // Utilisation d'une URL d'exemple car aucune URL spécifique n'a été fournie.
    await page.goto('https://example.com/login');

    // GESTION DES COOKIES (instruction stricte 5)
    await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

    // Saisir un nom d'utilisateur valide dans le champ "Nom d'utilisateur"
    const usernameField = page.locator('input[name*="user"], input[id*="user"], input[placeholder*="utilisateur"], input[aria-label*="utilisateur"]').first();
    await usernameField.evaluate((el, val) => {
        el.value = val;
        el.dispatchEvent(new Event('input', {bubbles: true}));
        el.dispatchEvent(new Event('change', {bubbles: true}));
    }, 'validUser');

    // Saisir un mot de passe valide dans le champ "Mot de passe"
    const passwordField = page.locator('input[name*="pass"], input[id*="pass"], input[placeholder*="passe"], input[aria-label*="passe"]').first();
    await passwordField.evaluate((el, val) => {
        el.value = val;
        el.dispatchEvent(new Event('input', {bubbles: true}));
        el.dispatchEvent(new Event('change', {bubbles: true}));
    }, 'validPassword123');

    // Étape 2: Cliquer sur le bouton "Se connecter".
    const loginButton = page.locator('button:has-text("Se connecter"), button[type="submit"], input[type="submit"][value*="connecter"], a:has-text("Se connecter")').first();
    await loginButton.click({ force: true });

    // Attendre que la navigation soit complète après le clic (instruction stricte 15)
    await page.waitForLoadState('networkidle');

    // Étape 3: Vérifier que l'utilisateur est redirigé vers le tableau de bord ou la page d'accueil de l'application
    // et qu'un message de bienvenue ou le nom de l'utilisateur connecté est affiché.

    // Assertion 1: Vérifier la redirection (l'URL ne doit plus contenir "/login")
    await expect(page).not.toHaveURL(/.*login/, { timeout: 10000 });

    // Assertion 2: Vérifier la présence d'un message de bienvenue ou du nom de l'utilisateur connecté
    const welcomeMessageLocator = page.locator('text="Bienvenue", text="Hello validUser", h1[data-testid*="welcome"], h2[data-testid*="welcome"], h3[data-testid*="welcome"], h4[data-testid*="welcome"], h5[data-testid*="welcome"], h6[data-testid*="welcome"], [role="heading"][data-testid*="welcome"], span[data-testid*="welcome"], p[data-testid*="welcome"], h1[aria-label*="welcome"], h2[aria-label*="welcome"], h3[aria-label*="welcome"], h4[aria-label*="welcome"], h5[aria-label*="welcome"], h6[aria-label*="welcome"], [role="heading"][aria-label*="welcome"], span[aria-label*="welcome"], p[aria-label*="welcome"], h1:has-text("Tableau de bord"), h2:has-text("Accueil")').first();
    await expect(welcomeMessageLocator).toBeVisible({ timeout: 10000 });
});