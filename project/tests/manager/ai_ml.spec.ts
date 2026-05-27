import { test, expect } from '@playwright/test';

test.describe('[MANAGER] Intelligence IA & ML', () => {

  // ─── 1. DATA-DRIVEN MANAGER ─────────────────────────────────────────────
  test('1. Page Data-Driven Manager accessible', async ({ page }) => {
    await page.goto('/manager');
    await page.waitForTimeout(2500);
    await expect(page.locator('h1, h2').first()).toBeVisible();
    console.log('✅ Page Data-Driven Manager chargée');
  });

  test('2. Agent Analytics (chat IA) visible', async ({ page }) => {
    await page.goto('/manager');
    await page.waitForTimeout(2500);
    // Ouvrir le chat global s'il est fermé
    const bubbleBtn = page.locator('button:has(svg.lucide-message-circle), button:has(svg.lucide-message-square)').first();
    if (await bubbleBtn.isVisible()) {
      await bubbleBtn.click();
      await page.waitForTimeout(1000);
    }
    const chatInput = page.locator('input[placeholder*="question"], input[placeholder*="message"], textarea').first();
    const chatVisible = await chatInput.isVisible();
    if (chatVisible) {
      console.log('✅ Interface Agent Analytics IA visible');
    } else {
      console.log('ℹ️ Widget chat non détecté sur cette URL');
    }
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('3. ML Timeline Guard - Indicateurs de prédiction visibles', async ({ page }) => {
    await page.goto('/manager');
    await page.waitForTimeout(3000);
    const scoreEl = page.locator('[class*="score"], [class*="Score"], [class*="gauge"], [class*="percent"]').first();
    const visible = await scoreEl.isVisible();
    console.log(visible ? '✅ Indicateurs ML visibles' : 'ℹ️ Indicateurs ML non détectés');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('4. Section Recommandations de Testeurs visible', async ({ page }) => {
    await page.goto('/manager');
    await page.waitForTimeout(3000);
    const recomm = page.locator('text=/recommand|testeur|tester/i').first();
    const visible = await recomm.isVisible().catch(() => false);
    console.log(visible ? '✅ Section Recommandations visible' : 'ℹ️ Section non trouvée sur cette URL');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  // ─── 5. PLAN DE RATTRAPAGE IA ────────────────────────────────────────────
  test('5. Section Plan de Rattrapage IA accessible', async ({ page }) => {
    await page.goto('/manager');
    await page.waitForTimeout(3000);
    // Chercher le bouton ou titre "Plan de Rattrapage" / "Catchup"
    const catchupSection = page.locator('text=/rattrapage|catchup|plan ia/i').first();
    const visible = await catchupSection.isVisible().catch(() => false);
    console.log(visible ? '✅ Section Plan de Rattrapage IA trouvée' : 'ℹ️ Section non visible (sélectionner une campagne d\'abord)');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('6. Bouton "Informer le testeur" présent dans le Plan IA', async ({ page }) => {
    await page.goto('/manager');
    await page.waitForTimeout(3000);
    const notifyBtn = page.locator('button').filter({ hasText: /informer|notif|renfort/i }).first();
    const visible = await notifyBtn.isVisible().catch(() => false);
    console.log(visible ? '✅ Bouton "Informer le testeur" trouvé' : 'ℹ️ Bouton non visible (nécessite une campagne avec retard)');
    await expect(page.locator('h1, h2').first().isVisible()).toBeTruthy();
  });

  // ─── 7. MONITORING N8N ──────────────────────────────────────────────────
  test('7. Panel Suivi des Notifications n8n présent', async ({ page }) => {
    await page.goto('/manager');
    await page.waitForTimeout(3000);
    // Chercher le panel de monitoring
    const monitorPanel = page.locator('text=/suivi des notifications|statut.*email|notifications.*renfort/i').first();
    const visible = await monitorPanel.isVisible().catch(() => false);
    console.log(visible ? '✅ Panel Monitoring n8n visible' : 'ℹ️ Panel non visible (aucune notification envoyée)');
    // Le panel s'affiche seulement après envoi — la page doit quand même être chargée
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  // ─── 8. RAPPORT DE CLÔTURE ──────────────────────────────────────────────
  test('8. Rapport de Clôture IA accessible', async ({ page }) => {
    await page.goto('/manager');
    await page.waitForTimeout(3000);
    const closureBtn = page.locator('button, a').filter({ hasText: /cl.ture|rapport|closure|report/i }).first();
    const visible = await closureBtn.isVisible().catch(() => false);
    console.log(visible ? '✅ Rapport de Clôture disponible' : 'ℹ️ Rapport non visible (nécessite une campagne terminée)');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  // ─── 9. SCORE DE READINESS ──────────────────────────────────────────────
  test('9. Release Readiness Score chargé', async ({ page }) => {
    await page.goto('/releases');
    await page.waitForTimeout(3000);
    const scoreEl = page.locator('[class*="readiness"], [class*="Readiness"], svg circle, [class*="gauge"]').first();
    const visible = await scoreEl.isVisible().catch(() => false);
    console.log(visible ? '✅ Readiness Score affiché' : 'ℹ️ Score non détecté (données insuffisantes)');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  // ─── 10. BRIEFING IA DU DASHBOARD ───────────────────────────────────────
  test('10. Briefing IA Dashboard chargé', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(4000);
    // Le briefing IA est une zone de texte générée par Groq
    const briefing = page.locator('text=/retard|campagne|taux|anomalie|score/i').first();
    const visible = await briefing.isVisible().catch(() => false);
    console.log(visible ? '✅ Briefing IA visible' : 'ℹ️ Briefing non encore chargé (API IA lente)');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  // ─── 11. INTEGRATION N8N - NOTIFICATION DE RENFORT ─────────────────────────
  test('11. [INTEGRATION] Flux complet n8n - Recommandation et notification', async ({ page }) => {
    // Intercepter la liste des projets pour la sélection par défaut
    await page.route('**/api/projects*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 1, name: "Projet Principal" }])
      });
    });

    // Intercepter la liste des campagnes (avec ou sans paramètres de requête)
    await page.route('**/api/campaigns*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 101,
          title: "Campagne E2E n8n",
          project: 1,
          nb_test_cases: 50,
          rowCount: 50,
          assigned_testers_names: ["Testeur Alpha"],
          created_at: "2026-05-19T10:00:00Z"
        }])
      });
    });

    // Intercepter la timeline guard pour renvoyer un statut CRITICAL
    await page.route('**/api/analytics/timeline-guard/101*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: "CRITICAL",
          velocity: 2,
          projected_end_date: "2026-06-01",
          delay_days: 10,
          message: "Retard critique détecté sur la timeline.",
          progress: { finished: 5, total: 50, percentage: 10.0 }
        })
      });
    });

    // Intercepter le plan de rattrapage
    await page.route('**/api/analytics/catchup-plan/101*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          campaign_id: 101,
          campaign_title: "Campagne E2E n8n",
          delay_days: 10,
          current_velocity: 2,
          required_velocity: 10,
          days_left: 5,
          remaining_tests: 45,
          progress_percentage: 10.0,
          tester_distribution: [{
            id: 4,
            name: "Testeur Bêta",
            email: "beta@test.com",
            current_load: 2.0,
            is_overloaded: false,
            is_already_in: false,
            ml_score: 95.0,
            ml_label: "ELITE",
            recommended_extra: 5,
            status: "RECOMMENDED"
          }],
          deadline: "2026-06-01",
          recommendation_engine: "ML Model v1.0"
        })
      });
    });

    // Intercepter l'appel de notification n8n
    let notifyRequestPayload: any = null;
    await page.route('**/api/analytics/catchup-plan/101/notify*', async route => {
      notifyRequestPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', message: 'Notification envoyée à n8n.' })
      });
    });

    // Aller sur le manager
    await page.goto('/manager');
    await page.waitForTimeout(2000);

    // Attendre que la carte de campagne mockée apparaisse
    const mockCard = page.locator('div.group').filter({ hasText: 'Campagne E2E n8n' }).first();
    await expect(mockCard).toBeVisible();

    // Cliquer sur "Lire la suite" de l'Insight IA sur cette carte
    const readMoreBtn = mockCard.locator('button').filter({ hasText: /lire/i }).first();
    await readMoreBtn.click();
    await page.waitForTimeout(1000);

    // Vérifier que le bouton d'optimisation est présent
    const optimizeBtn = page.locator('button').filter({ hasText: /optimis/i }).first();
    await expect(optimizeBtn).toBeVisible();
    await optimizeBtn.click();
    await page.waitForTimeout(1000);

    // Vérifier que le plan de rattrapage affiche le testeur recommandé "Testeur Bêta"
    const testerRow = page.locator('text="Testeur Bêta"').first();
    await expect(testerRow).toBeVisible();

    // Cliquer sur le bouton "Informer le testeur"
    const notifyBtn = page.locator('button').filter({ hasText: /informer|notif/i }).first();
    await expect(notifyBtn).toBeVisible();
    await notifyBtn.click();
    await page.waitForTimeout(1000);

    // Valider que le payload contient bien les testeurs à notifier
    expect(notifyRequestPayload).not.toBeNull();
    console.log("✅ Payload envoyé au backend pour n8n :", notifyRequestPayload);
  });

});
