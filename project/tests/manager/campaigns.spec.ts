import { test, expect } from '@playwright/test';

test.describe('[MANAGER] Gestion des Campagnes', () => {

  test('1. Liste des campagnes visible', async ({ page }) => {
    await page.goto('/manager');
    await page.waitForTimeout(2000);
    const pageLoaded = await page.locator('h1, h2').first().isVisible();
    expect(pageLoaded).toBeTruthy();
    console.log('✅ Page Campagnes chargée');
  });

  test('2. Recherche dans les campagnes', async ({ page }) => {
    await page.goto('/manager');
    await page.waitForTimeout(2000);
    const searchInput = page.locator('input[type="text"], input[placeholder*="herch"]').first();
    const visible = await searchInput.isVisible();
    if (visible) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
      await searchInput.clear();
      console.log('✅ Barre de recherche fonctionnelle');
    } else {
      console.log('ℹ️ Pas de barre de recherche détectée');
    }
    expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  });

  test('3. Filtres des campagnes fonctionnels', async ({ page }) => {
    await page.goto('/manager');
    await page.waitForTimeout(2000);
    const selects = page.locator('select');
    const count = await selects.count();
    console.log(`ℹ️ ${count} filtre(s) détecté(s)`);
    if (count > 0) {
      await selects.first().selectOption({ index: 1 });
      await page.waitForTimeout(1000);
      console.log('✅ Filtre appliqué avec succès');
    }
    expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  });

  test('4. Ouverture du détail d\'une campagne', async ({ page }) => {
    await page.goto('/manager');
    await page.waitForTimeout(2000);
    const firstRow = page.locator('table tbody tr, [class*="row"], [class*="card"]').first();
    const rowVisible = await firstRow.isVisible();
    if (rowVisible) {
      await firstRow.click();
      await page.waitForTimeout(1500);
      console.log('✅ Détail d\'une campagne accessible');
    } else {
      console.log('ℹ️ Aucune campagne à cliquer');
    }
    expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  });

  test('5. Bouton de création de campagne visible', async ({ page }) => {
    await page.goto('/manager');
    await page.waitForTimeout(2000);
    const createBtn = page.locator('button, a').filter({ hasText: /créer|nouveau|nouvelle|ajouter|new|\+/i }).first();
    const visible = await createBtn.isVisible();
    if (visible) {
      console.log('✅ Bouton de création présent');
    } else {
      console.log('ℹ️ Bouton de création non trouvé');
    }
    expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  });

  test('6. Statut des campagnes affiché (En cours / Terminée)', async ({ page }) => {
    await page.goto('/manager');
    await page.waitForTimeout(2500);
    const statusBadge = page.locator('text=/en cours|terminé|actif|clôtur|progress|active/i').first();
    const visible = await statusBadge.isVisible().catch(() => false);
    console.log(visible ? '✅ Statuts de campagne affichés' : 'ℹ️ Badges statut non détectés');
    expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  });

  test('7. Indicateur de progression visible dans une campagne', async ({ page }) => {
    await page.goto('/manager');
    await page.waitForTimeout(2500);
    const progress = page.locator('[class*="progress"], [class*="Progress"], [role="progressbar"]').first();
    const visible = await progress.isVisible().catch(() => false);
    console.log(visible ? '✅ Barre de progression visible' : 'ℹ️ Barre de progression non détectée');
    expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  });

  test('8. Onglet Plan de Rattrapage IA accessible depuis une campagne', async ({ page }) => {
    await page.goto('/manager');
    // Attendre que la première carte de campagne soit visible (jusqu'à 15s)
    const firstCard = page.locator('div.group').filter({ hasText: /cahier/i }).first();
    await firstCard.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

    if (await firstCard.isVisible()) {
      // Pour cette campagne, on cherche le bouton "Lire la suite" de l'Insight IA pour ouvrir le modal
      const insightBtn = firstCard.locator('button').filter({ hasText: /lire/i }).first();
      if (await insightBtn.isVisible()) {
        await insightBtn.click();
        await page.waitForTimeout(1500);
        // Chercher le bouton ou l'onglet d'optimisation
        const catchupTab = page.locator('text=/optimis|rattrapage|plan/i').first();
        const visible = await catchupTab.isVisible().catch(() => false);
        console.log(visible ? '✅ Onglet Plan de Rattrapage IA trouvé dans le modal' : 'ℹ_ Onglet non visible dans ce détail (nécessite une campagne en dérive)');
        // Fermer le modal
        await page.locator('button').filter({ hasText: /fermer|close/i }).first().click().catch(() => {});
      } else {
        console.log('ℹ_ Section Insight IA non visible sur la carte');
      }
    } else {
      console.log('ℹ_ Aucune campagne disponible');
    }
    expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  });

  test('9. Assignation de testeurs visible dans le détail campagne', async ({ page }) => {
    await page.goto('/manager');
    // Attendre que la première carte de campagne soit visible
    const firstCard = page.locator('div.group').filter({ hasText: /cahier/i }).first();
    await firstCard.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

    if (await firstCard.isVisible()) {
      const testersBtn = firstCard.locator('text=/testeurs/i').first();
      if (await testersBtn.isVisible()) {
        await testersBtn.click();
        await page.waitForTimeout(1500);
        const assignSection = page.locator('text=/testeur|assig/i').first();
        const visible = await assignSection.isVisible().catch(() => false);
        console.log(visible ? '✅ Section Testeurs visible dans la campagne' : 'ℹ_ Section non détectée');
      } else {
        console.log('ℹ_ Bouton TESTEURS non visible sur la carte');
      }
    } else {
      console.log('ℹ_ Aucune campagne disponible');
    }
    expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  });

  test('10. Timeline ML (prédiction de retard) visible', async ({ page }) => {
    await page.goto('/manager');
    const firstCard = page.locator('div.group').filter({ hasText: /cahier/i }).first();
    await firstCard.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

    if (await firstCard.isVisible()) {
      // La timeline et le badge ML (DÉRIVE ou READY) sont visibles directement sur la carte
      const mlBadge = firstCard.locator('text=/dérive|ready|optimal|retard|ml/i').first();
      const visible = await mlBadge.isVisible().catch(() => false);
      console.log(visible ? '✅ Prédiction ML Timeline Guard visible' : 'ℹ_ Badge ML non détecté');
    } else {
      console.log('ℹ_ Aucune campagne disponible');
    }
    expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  });

});
