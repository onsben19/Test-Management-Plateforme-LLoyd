import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('googlr', async ({ page }) => {
    await page.goto('https://www.google.com/');
    await page.waitForLoadState('networkidle');

    // Gérer le popup de consentement aux cookies si présent
    await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

    // Vérifier que la page Google est bien chargée
    await expect(page).toHaveTitle(/Google/);
    await expect(page.locator('textarea[name="q"], input[name="q"], input[title="Rechercher"], textarea[title="Rechercher"], select[title="Rechercher"]')).toBeVisible({ timeout: 10000 });
});