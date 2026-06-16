import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('okkk', async ({ page }) => {
  await page.goto('https://www.google.com');
  
  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  const logoGoogle = page.locator('img[alt="Google"], [id*="logo"] img').first();
  await expect(logoGoogle).toBeVisible({ timeout: 10000 });

  const barreRecherche = page.locator('textarea[name="q"], input[name="q"], input[title="Rechercher"], textarea[title="Rechercher"], select[title="Rechercher"]').first();
  await expect(barreRecherche).toBeVisible({ timeout: 10000 });
  await barreRecherche.first().evaluate((el, val) => { el.value = val; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }, 'test');
  await page.keyboard.press('Enter');

  await page.waitForLoadState('networkidle');
  const resultatsRecherche = page.locator('div#rso, button[id*="result"], a[id*="result"], input[id*="result"], [role="button"][id*="result"], [role="link"][id*="result"]').first();
  await expect(resultatsRecherche).toBeVisible({ timeout: 10000 });

  const liensNavigation = page.locator('a[href*="google.com"], [id*="hdtb"] a').first();
  await expect(liensNavigation).toBeVisible({ timeout: 10000 });
  await liensNavigation.click({ force: true });
  await page.waitForLoadState('networkidle');
});