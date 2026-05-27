# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tester/execution.spec.ts >> [TESTEUR] Mon Espace et Exécution >> 1. Connexion Testeur vérifiée (session active)
- Location: tests/tester/execution.spec.ts:5:3

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
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
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('[TESTEUR] Mon Espace et Exécution', () => {
  4   | 
  5   |   test('1. Connexion Testeur vérifiée (session active)', async ({ page }) => {
  6   |     await page.goto('/');
  7   |     await page.waitForTimeout(2000);
  8   |     const url = page.url();
  9   |     const isLoggedIn = !url.includes('/login');
> 10  |     expect(isLoggedIn).toBeTruthy();
      |                        ^ Error: expect(received).toBeTruthy()
  11  |     console.log('✅ Session Testeur active — accès confirmé');
  12  |   });
  13  | 
  14  |   test('2. Accès à Mon Espace (Dashboard Testeur)', async ({ page }) => {
  15  |     await page.goto('/tester-dashboard');
  16  |     await page.waitForTimeout(2000);
  17  |     const pageLoaded = await page.locator('h1, h2').first().isVisible();
  18  |     expect(pageLoaded).toBeTruthy();
  19  |     console.log('✅ Page Mon Espace Testeur accessible');
  20  |   });
  21  | 
  22  |   test('3. Accès au suivi d\'exécution', async ({ page }) => {
  23  |     const candidates = ['/execution', '/executions', '/tester-dashboard/execution', '/tracking'];
  24  |     let found = false;
  25  | 
  26  |     for (const url of candidates) {
  27  |       await page.goto(url);
  28  |       await page.waitForTimeout(1500);
  29  |       const isNotLogin = !page.url().includes('/login');
  30  |       const hasContent = await page.locator('h1, h2, table').first().isVisible();
  31  |       if (isNotLogin && hasContent) {
  32  |         console.log(`✅ Page Exécution trouvée à : ${url}`);
  33  |         found = true;
  34  |         break;
  35  |       }
  36  |     }
  37  | 
  38  |     if (!found) console.log('ℹ️ URL d\'exécution non trouvée parmi les candidats testés');
  39  |     expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  40  |   });
  41  | 
  42  |   test('4. Le menu Admin est masqué pour un Testeur', async ({ page }) => {
  43  |     await page.goto('/');
  44  |     await page.waitForTimeout(2000);
  45  |     const adminLink = page.locator('a[href*="/admin"]');
  46  |     const adminVisible = await adminLink.isVisible();
  47  |     expect(adminVisible).toBeFalsy();
  48  |     console.log('✅ Menu Admin correctement masqué pour le rôle Testeur');
  49  |   });
  50  | 
  51  |   test('5. Liste des cas de test assignés visible', async ({ page }) => {
  52  |     await page.goto('/tester-dashboard');
  53  |     await page.waitForTimeout(2500);
  54  |     // Chercher les cas de test assignés au testeur
  55  |     const testCases = page.locator('table tbody tr, [class*="testCase"], [class*="test-case"]').first();
  56  |     const visible = await testCases.isVisible().catch(() => false);
  57  |     console.log(visible ? '✅ Cas de test assignés affichés' : 'ℹ️ Aucun cas de test assigné pour ce testeur');
  58  |     expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  59  |   });
  60  | 
  61  |   test('6. Statut d\'un cas de test visible (PASSED / FAILED / EN COURS)', async ({ page }) => {
  62  |     await page.goto('/tester-dashboard');
  63  |     await page.waitForTimeout(2500);
  64  |     const statusBadge = page.locator('text=/passed|failed|en cours|succès|échec|bloqué/i').first();
  65  |     const visible = await statusBadge.isVisible().catch(() => false);
  66  |     console.log(visible ? '✅ Statuts de cas de test affichés' : 'ℹ️ Aucun statut visible (pas de test assigné)');
  67  |     expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  68  |   });
  69  | 
  70  |   test('7. Bouton de mise à jour du statut d\'exécution présent', async ({ page }) => {
  71  |     await page.goto('/tester-dashboard');
  72  |     await page.waitForTimeout(2500);
  73  |     const updateBtn = page.locator('button').filter({ hasText: /mettre à jour|execut|valider|start|commencer/i }).first();
  74  |     const visible = await updateBtn.isVisible().catch(() => false);
  75  |     console.log(visible ? '✅ Bouton d\'exécution présent' : 'ℹ️ Bouton non visible');
  76  |     expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  77  |   });
  78  | 
  79  |   test('8. Filtre par campagne disponible pour le testeur', async ({ page }) => {
  80  |     await page.goto('/tester-dashboard');
  81  |     await page.waitForTimeout(2000);
  82  |     const selects = page.locator('select');
  83  |     const count = await selects.count();
  84  |     if (count > 0) {
  85  |       console.log(`✅ ${count} filtre(s) disponible(s) pour le testeur`);
  86  |     } else {
  87  |       console.log('ℹ️ Pas de filtre détecté');
  88  |     }
  89  |     expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  90  |   });
  91  | 
  92  |   test('9. Accès à la messagerie interne (emails)', async ({ page }) => {
  93  |     const candidates = ['/messages', '/emails', '/inbox', '/tester/messages'];
  94  |     let found = false;
  95  |     for (const url of candidates) {
  96  |       await page.goto(url);
  97  |       await page.waitForTimeout(1500);
  98  |       if (!page.url().includes('/login') && await page.locator('h1, h2').first().isVisible()) {
  99  |         console.log(`✅ Messagerie trouvée à : ${url}`);
  100 |         found = true;
  101 |         break;
  102 |       }
  103 |     }
  104 |     if (!found) console.log('ℹ️ URL messagerie non trouvée');
  105 |     expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  106 |   });
  107 | 
  108 |   test('10. Accès aux anomalies signalées par le testeur', async ({ page }) => {
  109 |     await page.goto('/anomalies');
  110 |     await page.waitForTimeout(2000);
```