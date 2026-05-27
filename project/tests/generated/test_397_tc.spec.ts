import { test, expect } from '@playwright/test';

test('tc', async ({ page }) => {
  await page.goto('https://www.google.fr');
  await page.locator('#L2AGLb, button:has-text("Tout accepter"), button:has-text("Accepter"), button:has-text("Accept all")').first().click({ timeout: 5000 }).catch(() => {});

  const barreRecherche = page.locator('textarea[name="q"], input[name="q"], [title="Rechercher"]');
  await expect(barreRecherche).toBeVisible({ timeout: 10000 });

  await barreRecherche.fill('insure tm test');
  await page.locator('button:has-text("Rechercher"), button:has-text("Google Search"), [type="submit"]').first().click();

  const resultatsRecherche = page.locator('div#rso, div#res');
  await expect(resultatsRecherche).toBeVisible({ timeout: 10000 });
  await expect(resultatsRecherche).not.toBeEmpty();
});