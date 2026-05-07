import { test as setup } from '@playwright/test';

const authFile = 'tests/tester/.auth/tester.json';

setup('Authentification Testeur (exécutée une seule fois)', async ({ page }) => {
  await page.goto('/login');

  await page.locator('input[type="text"]').first().fill('tester');
  await page.locator('input[type="password"]').fill('qpB&II@SzA7Q');
  await page.locator('button[type="submit"]').click();

  await page.waitForTimeout(2000);

  const is2FA = await page.locator('input[maxlength="6"]').isVisible();
  if (is2FA) {
    console.log('⏸️  Entrez votre code 2FA dans le navigateur, puis cliquez Resume');
    await page.pause();
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 60000 });
  }

  await page.context().storageState({ path: authFile });
  console.log('✅ Session Testeur sauvegardée !');
});
