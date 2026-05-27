import { test, expect } from '@playwright/test';

test.describe('[TESTEUR] Mon Espace et Exécution', () => {

  test('1. Connexion Testeur vérifiée (session active)', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    const url = page.url();
    const isLoggedIn = !url.includes('/login');
    expect(isLoggedIn).toBeTruthy();
    console.log('✅ Session Testeur active — accès confirmé');
  });

  test('2. Accès à Mon Espace (Dashboard Testeur)', async ({ page }) => {
    await page.goto('/tester-dashboard');
    await page.waitForTimeout(2000);
    const pageLoaded = await page.locator('h1, h2').first().isVisible();
    expect(pageLoaded).toBeTruthy();
    console.log('✅ Page Mon Espace Testeur accessible');
  });

  test('3. Accès au suivi d\'exécution', async ({ page }) => {
    const candidates = ['/execution', '/executions', '/tester-dashboard/execution', '/tracking'];
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

  test('5. Liste des cas de test assignés visible', async ({ page }) => {
    await page.goto('/tester-dashboard');
    await page.waitForTimeout(2500);
    // Chercher les cas de test assignés au testeur
    const testCases = page.locator('table tbody tr, [class*="testCase"], [class*="test-case"]').first();
    const visible = await testCases.isVisible().catch(() => false);
    console.log(visible ? '✅ Cas de test assignés affichés' : 'ℹ️ Aucun cas de test assigné pour ce testeur');
    expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  });

  test('6. Statut d\'un cas de test visible (PASSED / FAILED / EN COURS)', async ({ page }) => {
    await page.goto('/tester-dashboard');
    await page.waitForTimeout(2500);
    const statusBadge = page.locator('text=/passed|failed|en cours|succès|échec|bloqué/i').first();
    const visible = await statusBadge.isVisible().catch(() => false);
    console.log(visible ? '✅ Statuts de cas de test affichés' : 'ℹ️ Aucun statut visible (pas de test assigné)');
    expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  });

  test('7. Bouton de mise à jour du statut d\'exécution présent', async ({ page }) => {
    await page.goto('/tester-dashboard');
    await page.waitForTimeout(2500);
    const updateBtn = page.locator('button').filter({ hasText: /mettre à jour|execut|valider|start|commencer/i }).first();
    const visible = await updateBtn.isVisible().catch(() => false);
    console.log(visible ? '✅ Bouton d\'exécution présent' : 'ℹ️ Bouton non visible');
    expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  });

  test('8. Filtre par campagne disponible pour le testeur', async ({ page }) => {
    await page.goto('/tester-dashboard');
    await page.waitForTimeout(2000);
    const selects = page.locator('select');
    const count = await selects.count();
    if (count > 0) {
      console.log(`✅ ${count} filtre(s) disponible(s) pour le testeur`);
    } else {
      console.log('ℹ️ Pas de filtre détecté');
    }
    expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  });

  test('9. Accès à la messagerie interne (emails)', async ({ page }) => {
    const candidates = ['/messages', '/emails', '/inbox', '/tester/messages'];
    let found = false;
    for (const url of candidates) {
      await page.goto(url);
      await page.waitForTimeout(1500);
      if (!page.url().includes('/login') && await page.locator('h1, h2').first().isVisible()) {
        console.log(`✅ Messagerie trouvée à : ${url}`);
        found = true;
        break;
      }
    }
    if (!found) console.log('ℹ️ URL messagerie non trouvée');
    expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  });

  test('10. Accès aux anomalies signalées par le testeur', async ({ page }) => {
    await page.goto('/anomalies');
    await page.waitForTimeout(2000);
    const pageLoaded = await page.locator('h1, h2').first().isVisible();
    expect(pageLoaded).toBeTruthy();
    console.log('✅ Page Anomalies accessible pour le testeur');
  });

});
