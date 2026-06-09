# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: manager/anomalies.spec.ts >> [MANAGER] Gestion des Anomalies >> 1. Liste des anomalies visible
- Location: tests/manager/anomalies.spec.ts:5:3

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
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('[MANAGER] Gestion des Anomalies', () => {
  4   | 
  5   |   test('1. Liste des anomalies visible', async ({ page }) => {
  6   |     await page.goto('/anomalies');
  7   |     await page.waitForTimeout(2000);
> 8   |     expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
      |                                                              ^ Error: expect(received).toBeTruthy()
  9   |     console.log('✅ Page Anomalies chargée');
  10  |   });
  11  | 
  12  |   test('2. Filtre par criticité (Faible / Moyenne / Critique)', async ({ page }) => {
  13  |     await page.goto('/anomalies');
  14  |     await page.waitForTimeout(2000);
  15  |     const selects = page.locator('select');
  16  |     const count = await selects.count();
  17  |     if (count > 0) {
  18  |       for (let i = 0; i < Math.min(count, 2); i++) {
  19  |         await selects.nth(i).selectOption({ index: 1 });
  20  |         await page.waitForTimeout(800);
  21  |       }
  22  |       console.log('✅ Filtres criticité appliqués');
  23  |     }
  24  |     expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  25  |   });
  26  | 
  27  |   test('3. Recherche dans les anomalies', async ({ page }) => {
  28  |     await page.goto('/anomalies');
  29  |     await page.waitForTimeout(2000);
  30  |     const searchInput = page.locator('input[type="text"], input[placeholder*="herch"]').first();
  31  |     if (await searchInput.isVisible()) {
  32  |       await searchInput.fill('bug');
  33  |       await page.waitForTimeout(1000);
  34  |       await searchInput.clear();
  35  |       console.log('✅ Recherche anomalies fonctionnelle');
  36  |     }
  37  |     expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  38  |   });
  39  | 
  40  |   test('4. Ouverture du détail d\'une anomalie', async ({ page }) => {
  41  |     await page.goto('/anomalies');
  42  |     await page.waitForTimeout(2000);
  43  |     const firstRow = page.locator('table tbody tr').first();
  44  |     if (await firstRow.isVisible()) {
  45  |       await firstRow.click();
  46  |       await page.waitForTimeout(1500);
  47  |       const detail = page.locator('[class*="modal"], [class*="Modal"], [class*="detail"], [class*="Detail"], [class*="panel"]').first();
  48  |       const detailVisible = await detail.isVisible();
  49  |       console.log(detailVisible ? '✅ Détail anomalie ouvert' : 'ℹ️ Détail non détecté');
  50  |     } else {
  51  |       console.log('ℹ️ Aucune anomalie dans la liste');
  52  |     }
  53  |     expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  54  |   });
  55  | 
  56  |   test('5. Badge d\'impact affiché (CRITIQUE / MAJEUR / MINEUR)', async ({ page }) => {
  57  |     await page.goto('/anomalies');
  58  |     await page.waitForTimeout(2500);
  59  |     const impactBadge = page.locator('text=/critique|majeur|mineur|bloquant/i').first();
  60  |     const visible = await impactBadge.isVisible().catch(() => false);
  61  |     console.log(visible ? '✅ Badge impact visible' : 'ℹ️ Badge non détecté (liste vide ?)');
  62  |     expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  63  |   });
  64  | 
  65  |   test('6. Statut des anomalies affiché (Ouvert / En cours / Résolu)', async ({ page }) => {
  66  |     await page.goto('/anomalies');
  67  |     await page.waitForTimeout(2500);
  68  |     const statusBadge = page.locator('text=/ouvert|en cours|résolu|fermé|ouverte/i').first();
  69  |     const visible = await statusBadge.isVisible().catch(() => false);
  70  |     console.log(visible ? '✅ Statut anomalie affiché' : 'ℹ️ Statut non détecté');
  71  |     expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  72  |   });
  73  | 
  74  |   test('7. Tri par colonnes disponible', async ({ page }) => {
  75  |     await page.goto('/anomalies');
  76  |     await page.waitForTimeout(2000);
  77  |     const sortableHeader = page.locator('th').first();
  78  |     const visible = await sortableHeader.isVisible().catch(() => false);
  79  |     if (visible) {
  80  |       await sortableHeader.click();
  81  |       await page.waitForTimeout(800);
  82  |       console.log('✅ Tri par colonne fonctionnel');
  83  |     } else {
  84  |       console.log('ℹ️ En-têtes de colonnes non détectés');
  85  |     }
  86  |     expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  87  |   });
  88  | 
  89  |   test('8. Notification email envoyée lors d\'une anomalie (vérifié via log)', async ({ page }) => {
  90  |     // Ce test vérifie que le système d'email est configuré
  91  |     // L'envoi réel se fait côté backend — on vérifie juste l'UI de signalement
  92  |     await page.goto('/anomalies');
  93  |     await page.waitForTimeout(2000);
  94  |     const reportBtn = page.locator('button').filter({ hasText: /signal|créer|nouveau|report/i }).first();
  95  |     const visible = await reportBtn.isVisible().catch(() => false);
  96  |     console.log(visible ? '✅ Bouton de signalement d\'anomalie présent' : 'ℹ️ Bouton non détecté');
  97  |     expect(await page.locator('h1, h2').first().isVisible()).toBeTruthy();
  98  |   });
  99  | 
  100 | });
  101 | 
```