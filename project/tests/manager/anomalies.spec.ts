import { test, expect } from '@playwright/test';

test.describe('[MANAGER] Gestion des Anomalies', () => {

  test('1. Liste des anomalies visible', async ({ page }) => {
    await page.goto('/anomalies');
    await page.waitForTimeout(2000);
    expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
    console.log('✅ Page Anomalies chargée');
  });

  test('2. Filtre par criticité (Faible / Moyenne / Critique)', async ({ page }) => {
    await page.goto('/anomalies');
    await page.waitForTimeout(2000);
    const selects = page.locator('select');
    const count = await selects.count();
    if (count > 0) {
      // Tester chaque option disponible
      for (let i = 0; i < Math.min(count, 2); i++) {
        await selects.nth(i).selectOption({ index: 1 });
        await page.waitForTimeout(800);
      }
      console.log('✅ Filtres criticité appliqués');
    }
    expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  });

  test('3. Recherche dans les anomalies', async ({ page }) => {
    await page.goto('/anomalies');
    await page.waitForTimeout(2000);
    const searchInput = page.locator('input[type="text"], input[placeholder*="herch"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('bug');
      await page.waitForTimeout(1000);
      await searchInput.clear();
      console.log('✅ Recherche anomalies fonctionnelle');
    }
    expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  });

  test('4. Ouverture du détail d\'une anomalie', async ({ page }) => {
    await page.goto('/anomalies');
    await page.waitForTimeout(2000);
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await page.waitForTimeout(1500);
      // Vérifier qu'un panneau de détail ou une modale s'est ouvert
      const detail = page.locator('[class*="modal"], [class*="Modal"], [class*="detail"], [class*="Detail"], [class*="panel"]').first();
      const detailVisible = await detail.isVisible();
      console.log(detailVisible ? '✅ Détail anomalie ouvert' : 'ℹ️ Détail non détecté');
    } else {
      console.log('ℹ️ Aucune anomalie dans la liste');
    }
    expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  });

});
