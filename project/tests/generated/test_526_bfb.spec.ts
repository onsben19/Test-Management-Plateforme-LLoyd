import { test, expect } from '@playwright/test';

test.use({ screenshot: 'on', baseURL: 'http://nginx' });


test('bfb', async ({ page }) => {
  await page.goto('https://fr.wikipedia.org/');

  await page.locator('button#L2AGLb, a#L2AGLb, input#L2AGLb, [role="button"]#L2AGLb, [role="link"]#L2AGLb, button:has-text("Tout accepter"), [id*="cookie"] button:has-text("accepter")').first().click({ timeout: 5000 }).catch(() => {});

  await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

  const logo = page.locator('button#www-wikipedia-org, a#www-wikipedia-org, input#www-wikipedia-org, [role="button"]#www-wikipedia-org, [role="link"]#www-wikipedia-org, button#siteSub, a#siteSub, input#siteSub, [role="button"]#siteSub, [role="link"]#siteSub, button.central-featured-lang, a.central-featured-lang, input.central-featured-lang, [role="button"].central-featured-lang, [role="link"].central-featured-lang');
  await expect(logo.first()).toBeVisible({ timeout: 10000 });
});