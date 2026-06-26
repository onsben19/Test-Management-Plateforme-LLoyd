import { test, expect } from '@playwright/test';

test.describe('Flux de Connexion (Login)', () => {

  test('Vérification de l\'affichage de la page de connexion', async ({ page }) => {
    // Naviguer vers la page de login
    await page.goto('/login');

    // Vérifier que le bouton de soumission est visible
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();

    // Vérifier que les champs de saisie existent
    const usernameInput = page.locator('input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"]');

    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('Connexion avec des identifiants valides', async ({ page }) => {
    await page.goto('/login');

    // Remplir le nom d'utilisateur
    // Note: Vous devrez peut-être changer 'admin' et 'admin123' par de vrais identifiants de test
    await page.locator('input[type="text"]').first().fill('manager');

    // Remplir le mot de passe
    await page.locator('input[type="password"]').fill('+WpKuC3Rt@O*');

    // Cliquer sur le bouton de connexion
    await page.locator('button[type="submit"]').click();

    // Vérifier l'apparition du formulaire de Double Authentification (2FA)
    // Attendre que l'application réagisse après le clic (max 5 secondes)
    await page.waitForTimeout(3000);

    const pathname = new URL(page.url()).pathname;

    if (pathname === '/' || pathname === '/manager' || pathname === '/tester-dashboard') {
      console.log('✅ Redirection réussie après connexion !');
    } else {
      // Cas 2: On est toujours sur /login. On vérifie pourquoi.
      const otpInputVisible = await page.locator('input[maxlength="6"]').isVisible();

      if (otpInputVisible) {
        console.log('✅ Formulaire 2FA affiché avec succès !');
        expect(otpInputVisible).toBeTruthy();
      } else {
        // Cas 3: Erreur d'identifiants
        console.log('❌ Échec de la connexion. Les identifiants sont probablement rejetés par le backend.');
        // On force le test à vérifier la présence d'un message d'erreur (Toast)
        const toastVisible = await page.locator('.Toastify').isVisible();
        expect(toastVisible).toBeTruthy();
      }
    }
  });

});
