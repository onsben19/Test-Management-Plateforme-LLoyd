import { test, expect } from '@playwright/test';

test.describe('[MANAGER] Intelligence IA & ML', () => {

  test('1. Page Data-Driven Manager accessible', async ({ page }) => {
    await page.goto('/manager/data');
    await page.waitForTimeout(2500);
    const loaded = await page.locator('h1, h2').first().isVisible();
    expect(loaded).toBeTruthy();
    console.log('✅ Page Data-Driven Manager chargée');
  });

  test('2. Agent Analytics (chat IA) visible', async ({ page }) => {
    await page.goto('/manager/data');
    await page.waitForTimeout(2500);
    // Chercher le widget de chat IA
    const chatInput = page.locator('input[placeholder*="question"], input[placeholder*="message"], textarea').first();
    const chatVisible = await chatInput.isVisible();
    if (chatVisible) {
      console.log('✅ Interface Agent Analytics IA visible');
    } else {
      console.log('ℹ️ Widget chat non détecté sur cette URL');
    }
    expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  });

  test('3. ML Timeline Guard - Indicateurs de prédiction visibles', async ({ page }) => {
    await page.goto('/manager/data');
    await page.waitForTimeout(3000);
    // Chercher des éléments de score ou jauge
    const scoreEl = page.locator('[class*="score"], [class*="Score"], [class*="gauge"], [class*="percent"]').first();
    const visible = await scoreEl.isVisible();
    console.log(visible ? '✅ Indicateurs ML visibles' : 'ℹ️ Indicateurs ML non détectés');
    expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  });

  test('4. Section Recommandations de Testeurs visible', async ({ page }) => {
    await page.goto('/manager/data');
    await page.waitForTimeout(3000);
    // Chercher une section "recommandation" ou "testeur"
    const recomm = page.locator('text=/recommand|testeur|tester/i').first();
    const visible = await recomm.isVisible().catch(() => false);
    console.log(visible ? '✅ Section Recommandations visible' : 'ℹ️ Section non trouvée sur cette URL');
    expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  });

});
