import { test, expect } from '@playwright/test';
import {
  acceptAllCookiesButton,
  cookieConsentBanner,
} from './common-authentication-page-elements';

const baseUrl = process.env.ALKEMIO_BASE_URL ?? 'http://localhost:3000';

test.describe('Authentication - Cookie Consent', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('cookie consent banner appears on first visit', async ({ page }) => {
    // Navigate to platform as unauthenticated user
    await page.goto(baseUrl);

    // Verify cookie consent banner is visible
    await expect(cookieConsentBanner(page)).toBeVisible({ timeout: 5000 });
  });

  test('cookie consent persists after acceptance', async ({ page }) => {
    // Navigate to platform
    await page.goto(baseUrl);

    // Accept cookies
    await expect(cookieConsentBanner(page)).toBeVisible({ timeout: 5000 });
    await acceptAllCookiesButton(page).click();

    // Verify banner disappears
    await expect(cookieConsentBanner(page)).not.toBeVisible({ timeout: 3000 });

    // Navigate to another page
    await page.goto(`${baseUrl}/spaces`);

    // Verify cookie consent banner does not appear (consent persisted)
    await expect(cookieConsentBanner(page)).not.toBeVisible();
  });

  test('cookie consent persists after page reload', async ({ page }) => {
    // Navigate and accept cookies
    await page.goto(baseUrl);
    await expect(cookieConsentBanner(page)).toBeVisible({ timeout: 5000 });
    await acceptAllCookiesButton(page).click();
    await expect(cookieConsentBanner(page)).not.toBeVisible({ timeout: 3000 });

    // Refresh page
    await page.reload();

    // Verify banner still does not appear
    await expect(cookieConsentBanner(page)).not.toBeVisible();
  });

  test('cookie consent persists across navigation', async ({ page }) => {
    // Navigate and accept cookies
    await page.goto(baseUrl);
    await expect(cookieConsentBanner(page)).toBeVisible({ timeout: 5000 });
    await acceptAllCookiesButton(page).click();
    await expect(cookieConsentBanner(page)).not.toBeVisible({ timeout: 3000 });

    // Navigate away and back
    await page.goto(`${baseUrl}/spaces`);
    await expect(cookieConsentBanner(page)).not.toBeVisible();

    await page.goto(baseUrl);
    await expect(cookieConsentBanner(page)).not.toBeVisible();
  });
});
