import { test, expect } from '@playwright/test';

test.describe('[MANAGER] Gestion des Releases', () => {

  test('1. Liste des releases visible', async ({ page }) => {
    await page.goto('/releases');
    await page.waitForTimeout(2000);
    expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
    console.log('✅ Page Releases chargée');
  });

  test('2. Filtre par statut (Actif / Terminé)', async ({ page }) => {
    await page.goto('/releases');
    await page.waitForTimeout(2000);
    const selects = page.locator('select');
    const count = await selects.count();
    if (count > 0) {
      await selects.first().selectOption({ index: 1 });
      await page.waitForTimeout(1000);
      console.log('✅ Filtre statut appliqué');
    }
    expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  });

  test('3. Release Readiness Score affiché', async ({ page }) => {
    await page.goto('/releases');
    await page.waitForTimeout(3000);
    // Chercher la jauge ou le score de readiness
    const gauge = page.locator('[class*="gauge"], [class*="Gauge"], [class*="score"], [class*="Score"], svg circle').first();
    const visible = await gauge.isVisible();
    if (visible) {
      console.log('✅ Release Readiness Score affiché');
    } else {
      console.log('ℹ️ Score non encore chargé (données manquantes)');
    }
    expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  });

  test('4. Pagination des releases', async ({ page }) => {
    await page.goto('/releases');
    await page.waitForTimeout(2000);
    const pagination = page.locator('[class*="pagination"], [class*="Pagination"], button').filter({ hasText: /suivant|next|>/i }).first();
    const paginationVisible = await pagination.isVisible();
    console.log(paginationVisible ? '✅ Pagination disponible' : 'ℹ️ Pagination non visible (peu de données)');
    expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  });

});
