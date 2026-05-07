import { test, expect } from '@playwright/test';
// ✅ Plus besoin d'importer loginAsManager !
// La session est déjà chargée automatiquement via storageState dans playwright.config.ts

test.describe('[MANAGER] Dashboard et KPIs', () => {

  test('1. Dashboard principal visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    const hasTitle = await page.locator('h1, h2').first().isVisible();
    expect(hasTitle).toBeTruthy();
    console.log('✅ Dashboard Manager chargé');
  });

  test('2. Navigation vers les Campagnes', async ({ page }) => {
    await page.goto('/campaigns');
    await page.waitForTimeout(2000);
    const pageLoaded = await page.locator('h1, h2, table').first().isVisible();
    expect(pageLoaded).toBeTruthy();
    console.log('✅ Page Campagnes accessible');
  });

  test('3. Navigation vers les Releases', async ({ page }) => {
    await page.goto('/releases');
    await page.waitForTimeout(2000);
    const pageLoaded = await page.locator('h1, h2, table').first().isVisible();
    expect(pageLoaded).toBeTruthy();
    console.log('✅ Page Releases accessible');
  });

  test('4. Navigation vers les Anomalies', async ({ page }) => {
    await page.goto('/anomalies');
    await page.waitForTimeout(2000);
    const pageLoaded = await page.locator('h1, h2, table').first().isVisible();
    expect(pageLoaded).toBeTruthy();
    console.log('✅ Page Anomalies accessible');
  });

});
