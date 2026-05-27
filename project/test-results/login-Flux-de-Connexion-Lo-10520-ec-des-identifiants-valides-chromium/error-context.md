# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.spec.ts >> Flux de Connexion (Login) >> Connexion avec des identifiants valides
- Location: tests/login.spec.ts:21:3

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
              - textbox "username" [ref=e24]: manager
            - generic [ref=e25]:
              - generic [ref=e26]: Password
              - generic [ref=e27]:
                - textbox "••••••••" [ref=e28]: +WpKuC3Rt@O*
                - button [ref=e29] [cursor=pointer]:
                  - img [ref=e30]
              - button "Forgot password?" [ref=e34] [cursor=pointer]
          - button "Sign In" [ref=e35] [cursor=pointer]:
            - img [ref=e36]
            - text: Sign In
      - paragraph [ref=e38]: © 2026 InsureTM Inc. Tous droits réservés.
  - region "Notifications Alt+T":
    - generic [ref=e40] [cursor=pointer]:
      - img [ref=e42]
      - text: Login failed. Check your credentials.
      - button "close" [ref=e44]:
        - img [ref=e45]
      - generic [ref=e47]:
        - progressbar "notification timer"
  - button [ref=e50] [cursor=pointer]:
    - generic [ref=e52]:
      - img [ref=e53]
      - img [ref=e56]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Flux de Connexion (Login)', () => {
  4  | 
  5  |   test('Vérification de l\'affichage de la page de connexion', async ({ page }) => {
  6  |     // Naviguer vers la page de login
  7  |     await page.goto('/login');
  8  | 
  9  |     // Vérifier que le bouton de soumission est visible
  10 |     const submitButton = page.locator('button[type="submit"]');
  11 |     await expect(submitButton).toBeVisible();
  12 | 
  13 |     // Vérifier que les champs de saisie existent
  14 |     const usernameInput = page.locator('input[type="text"]').first();
  15 |     const passwordInput = page.locator('input[type="password"]');
  16 | 
  17 |     await expect(usernameInput).toBeVisible();
  18 |     await expect(passwordInput).toBeVisible();
  19 |   });
  20 | 
  21 |   test('Connexion avec des identifiants valides', async ({ page }) => {
  22 |     await page.goto('/login');
  23 | 
  24 |     // Remplir le nom d'utilisateur
  25 |     // Note: Vous devrez peut-être changer 'admin' et 'admin123' par de vrais identifiants de test
  26 |     await page.locator('input[type="text"]').first().fill('manager');
  27 | 
  28 |     // Remplir le mot de passe
  29 |     await page.locator('input[type="password"]').fill('+WpKuC3Rt@O*');
  30 | 
  31 |     // Cliquer sur le bouton de connexion
  32 |     await page.locator('button[type="submit"]').click();
  33 | 
  34 |     // Vérifier l'apparition du formulaire de Double Authentification (2FA)
  35 |     // Attendre que l'application réagisse après le clic (max 5 secondes)
  36 |     await page.waitForTimeout(3000);
  37 | 
  38 |     const currentUrl = page.url();
  39 | 
  40 |     if (currentUrl === 'http://localhost:5173/') {
  41 |       // Cas 1: Connexion réussie sans 2FA
  42 |       expect(currentUrl).toBe('http://localhost:5173/');
  43 |       console.log('✅ Redirection réussie vers le Dashboard !');
  44 |     } else {
  45 |       // Cas 2: On est toujours sur /login. On vérifie pourquoi.
  46 |       const otpInputVisible = await page.locator('input[maxlength="6"]').isVisible();
  47 | 
  48 |       if (otpInputVisible) {
  49 |         console.log('✅ Formulaire 2FA affiché avec succès !');
  50 |         expect(otpInputVisible).toBeTruthy();
  51 |       } else {
  52 |         // Cas 3: Erreur d'identifiants
  53 |         console.log('❌ Échec de la connexion. Les identifiants sont probablement rejetés par le backend.');
  54 |         // On force le test à vérifier la présence d'un message d'erreur (Toast)
  55 |         const toastVisible = await page.locator('.Toastify').isVisible();
> 56 |         expect(toastVisible).toBeTruthy();
     |                              ^ Error: expect(received).toBeTruthy()
  57 |       }
  58 |     }
  59 |   });
  60 | 
  61 | });
  62 | 
```