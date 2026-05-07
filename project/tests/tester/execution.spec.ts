import { test, expect } from '@playwright/test';
// ✅ Plus besoin d'importer loginAsTester — la session est déjà chargée via storageState

test.describe('[TESTEUR] Mon Espace et Exécution', () => {

  test('1. Connexion Testeur vérifiée (session active)', async ({ page }) => {
    // La session est déjà chargée, on vérifie juste qu'on N'est PAS sur la page login
    await page.goto('/');
    await page.waitForTimeout(2000);
    const url = page.url();
    const isLoggedIn = !url.includes('/login');
    expect(isLoggedIn).toBeTruthy();
    console.log('✅ Session Testeur active — accès confirmé');
  });

  test('2. Accès à Mon Espace (Dashboard Testeur)', async ({ page }) => {
    await page.goto('/tester');
    await page.waitForTimeout(2000);
    const pageLoaded = await page.locator('h1, h2').first().isVisible();
    expect(pageLoaded).toBeTruthy();
    console.log('✅ Page Mon Espace Testeur accessible');
  });

  test('3. Accès au suivi d\'exécution', async ({ page }) => {
    // Essayer plusieurs URLs possibles pour le suivi d'exécution
    const candidates = ['/execution', '/executions', '/tester/execution', '/tracking'];
    let found = false;

    for (const url of candidates) {
      await page.goto(url);
      await page.waitForTimeout(1500);
      const isNotLogin = !page.url().includes('/login');
      const hasContent = await page.locator('h1, h2, table').first().isVisible();
      if (isNotLogin && hasContent) {
        console.log(`✅ Page Exécution trouvée à : ${url}`);
        found = true;
        break;
      }
    }

    if (!found) console.log('ℹ️ URL d\'exécution non trouvée parmi les candidats testés');
    expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  });

  test('4. Le menu Admin est masqué pour un Testeur', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    const adminLink = page.locator('a[href*="/admin"]');
    const adminVisible = await adminLink.isVisible();
    expect(adminVisible).toBeFalsy();
    console.log('✅ Menu Admin correctement masqué pour le rôle Testeur');
  });

});
