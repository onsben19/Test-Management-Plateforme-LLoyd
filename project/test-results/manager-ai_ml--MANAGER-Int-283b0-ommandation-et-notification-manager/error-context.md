# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: manager/ai_ml.spec.ts >> [MANAGER] Intelligence IA & ML >> 11. [INTEGRATION] Flux complet n8n - Recommandation et notification
- Location: tests/manager/ai_ml.spec.ts:114:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('div.group').filter({ hasText: 'Campagne E2E n8n' }).first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('div.group').filter({ hasText: 'Campagne E2E n8n' }).first()

```

# Page snapshot

```yaml
- main [ref=e4]:
  - generic [ref=e5]:
    - button "fr" [ref=e7] [cursor=pointer]:
      - img [ref=e8]
      - generic [ref=e12]: fr
    - generic [ref=e13]:
      - generic [ref=e14]:
        - generic [ref=e15]:
          - img "Lloyd Logo" [ref=e17]
          - heading "InsureTM" [level=1] [ref=e18]
          - paragraph [ref=e19]: Sign in to your workspace
        - generic [ref=e20]:
          - generic [ref=e21]:
            - generic [ref=e22]:
              - generic [ref=e23]: Username
              - textbox "username" [ref=e24]
            - generic [ref=e25]:
              - generic [ref=e26]: Password
              - generic [ref=e27]:
                - textbox "••••••••" [ref=e28]
                - button [ref=e29] [cursor=pointer]:
                  - img [ref=e30]
              - button "Forgot password?" [ref=e34] [cursor=pointer]
          - button "Sign In" [ref=e35] [cursor=pointer]:
            - img [ref=e36]
            - text: Sign In
      - paragraph [ref=e38]: © 2026 InsureTM Inc. Tous droits réservés.
  - region "Notifications Alt+T"
  - button [ref=e40] [cursor=pointer]:
    - generic [ref=e42]:
      - img [ref=e43]
      - img [ref=e46]
```

# Test source

```ts
  106 |     // Le briefing IA est une zone de texte générée par Groq
  107 |     const briefing = page.locator('text=/retard|campagne|taux|anomalie|score/i').first();
  108 |     const visible = await briefing.isVisible().catch(() => false);
  109 |     console.log(visible ? '✅ Briefing IA visible' : 'ℹ️ Briefing non encore chargé (API IA lente)');
  110 |     await expect(page.locator('h1, h2').first()).toBeVisible();
  111 |   });
  112 | 
  113 |   // ─── 11. INTEGRATION N8N - NOTIFICATION DE RENFORT ─────────────────────────
  114 |   test('11. [INTEGRATION] Flux complet n8n - Recommandation et notification', async ({ page }) => {
  115 |     // Intercepter la liste des projets pour la sélection par défaut
  116 |     await page.route('**/api/projects*', async route => {
  117 |       await route.fulfill({
  118 |         status: 200,
  119 |         contentType: 'application/json',
  120 |         body: JSON.stringify([{ id: 1, name: "Projet Principal" }])
  121 |       });
  122 |     });
  123 | 
  124 |     // Intercepter la liste des campagnes (avec ou sans paramètres de requête)
  125 |     await page.route('**/api/campaigns*', async route => {
  126 |       await route.fulfill({
  127 |         status: 200,
  128 |         contentType: 'application/json',
  129 |         body: JSON.stringify([{
  130 |           id: 101,
  131 |           title: "Campagne E2E n8n",
  132 |           project: 1,
  133 |           nb_test_cases: 50,
  134 |           rowCount: 50,
  135 |           assigned_testers_names: ["Testeur Alpha"],
  136 |           created_at: "2026-05-19T10:00:00Z"
  137 |         }])
  138 |       });
  139 |     });
  140 | 
  141 |     // Intercepter la timeline guard pour renvoyer un statut CRITICAL
  142 |     await page.route('**/api/analytics/timeline-guard/101*', async route => {
  143 |       await route.fulfill({
  144 |         status: 200,
  145 |         contentType: 'application/json',
  146 |         body: JSON.stringify({
  147 |           status: "CRITICAL",
  148 |           velocity: 2,
  149 |           projected_end_date: "2026-06-01",
  150 |           delay_days: 10,
  151 |           message: "Retard critique détecté sur la timeline.",
  152 |           progress: { finished: 5, total: 50, percentage: 10.0 }
  153 |         })
  154 |       });
  155 |     });
  156 | 
  157 |     // Intercepter le plan de rattrapage
  158 |     await page.route('**/api/analytics/catchup-plan/101*', async route => {
  159 |       await route.fulfill({
  160 |         status: 200,
  161 |         contentType: 'application/json',
  162 |         body: JSON.stringify({
  163 |           campaign_id: 101,
  164 |           campaign_title: "Campagne E2E n8n",
  165 |           delay_days: 10,
  166 |           current_velocity: 2,
  167 |           required_velocity: 10,
  168 |           days_left: 5,
  169 |           remaining_tests: 45,
  170 |           progress_percentage: 10.0,
  171 |           tester_distribution: [{
  172 |             id: 4,
  173 |             name: "Testeur Bêta",
  174 |             email: "beta@test.com",
  175 |             current_load: 2.0,
  176 |             is_overloaded: false,
  177 |             is_already_in: false,
  178 |             ml_score: 95.0,
  179 |             ml_label: "ELITE",
  180 |             recommended_extra: 5,
  181 |             status: "RECOMMENDED"
  182 |           }],
  183 |           deadline: "2026-06-01",
  184 |           recommendation_engine: "ML Model v1.0"
  185 |         })
  186 |       });
  187 |     });
  188 | 
  189 |     // Intercepter l'appel de notification n8n
  190 |     let notifyRequestPayload: any = null;
  191 |     await page.route('**/api/analytics/catchup-plan/101/notify*', async route => {
  192 |       notifyRequestPayload = route.request().postDataJSON();
  193 |       await route.fulfill({
  194 |         status: 200,
  195 |         contentType: 'application/json',
  196 |         body: JSON.stringify({ status: 'success', message: 'Notification envoyée à n8n.' })
  197 |       });
  198 |     });
  199 | 
  200 |     // Aller sur le manager
  201 |     await page.goto('/manager');
  202 |     await page.waitForTimeout(2000);
  203 | 
  204 |     // Attendre que la carte de campagne mockée apparaisse
  205 |     const mockCard = page.locator('div.group').filter({ hasText: 'Campagne E2E n8n' }).first();
> 206 |     await expect(mockCard).toBeVisible();
      |                            ^ Error: expect(locator).toBeVisible() failed
  207 | 
  208 |     // Cliquer sur "Lire la suite" de l'Insight IA sur cette carte
  209 |     const readMoreBtn = mockCard.locator('button').filter({ hasText: /lire/i }).first();
  210 |     await readMoreBtn.click();
  211 |     await page.waitForTimeout(1000);
  212 | 
  213 |     // Vérifier que le bouton d'optimisation est présent
  214 |     const optimizeBtn = page.locator('button').filter({ hasText: /optimis/i }).first();
  215 |     await expect(optimizeBtn).toBeVisible();
  216 |     await optimizeBtn.click();
  217 |     await page.waitForTimeout(1000);
  218 | 
  219 |     // Vérifier que le plan de rattrapage affiche le testeur recommandé "Testeur Bêta"
  220 |     const testerRow = page.locator('text="Testeur Bêta"').first();
  221 |     await expect(testerRow).toBeVisible();
  222 | 
  223 |     // Cliquer sur le bouton "Informer le testeur"
  224 |     const notifyBtn = page.locator('button').filter({ hasText: /informer|notif/i }).first();
  225 |     await expect(notifyBtn).toBeVisible();
  226 |     await notifyBtn.click();
  227 |     await page.waitForTimeout(1000);
  228 | 
  229 |     // Valider que le payload contient bien les testeurs à notifier
  230 |     expect(notifyRequestPayload).not.toBeNull();
  231 |     console.log("✅ Payload envoyé au backend pour n8n :", notifyRequestPayload);
  232 |   });
  233 | 
  234 | });
  235 | 
```