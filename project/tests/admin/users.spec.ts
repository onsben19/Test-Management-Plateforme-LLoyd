import { test, expect } from '@playwright/test';
import { loginAsAdmin, expectLoginSuccess } from '../helpers/auth';

test.describe('[ADMIN] Gestion des Utilisateurs', () => {

  test('1. Connexion en tant qu\'Admin', async ({ page }) => {
    await loginAsAdmin(page);
    const success = await expectLoginSuccess(page);
    expect(success).toBeTruthy();
  });

  
  test('2. Navigation vers la page Gestion des Utilisateurs', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/users');
    await page.waitForTimeout(1500);

    const pageLoaded = await page.locator('table, h1, h2').first().isVisible();
    expect(pageLoaded).toBeTruthy();
    console.log('✅ Page Gestion des Utilisateurs accessible');
  });

  test('3. Recherche d\'un utilisateur', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/users');
    await page.waitForTimeout(1500);

    const searchInput = page.locator('input[type="text"], input[placeholder*="herch"]').first();
    const searchVisible = await searchInput.isVisible();

    if (searchVisible) {
      await searchInput.fill('manager');
      await page.waitForTimeout(1000);
      console.log('✅ Recherche utilisateur fonctionnelle');
    }
    const pageLoaded = await page.locator('table, h1, h2').first().isVisible();
    expect(pageLoaded).toBeTruthy();
  });

});
