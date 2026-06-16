import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('fhfh', async ({ page }) => {
  await page.goto('https://www.google.com');
  
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const logoGoogle = page.locator('img[alt="Google"], [id*="logo"] img').first();
  const barreRecherche = page.locator('textarea[name="q"], input[name="q"], input[title="Rechercher"], textarea[title="Rechercher"], select[title="Rechercher"]').first();

  await expect(logoGoogle).toBeVisible({ timeout: 10000 });
  await expect(barreRecherche).toBeVisible({ timeout: 10000 });
});