// Feature 029-detect-signup-language — US2: language preference follows the user
// across browsers/devices (R-1 / FR-008 / FR-009 / FR-011). This is the
// server-persistence half — the switcher/settings path, no detection needed.
//
// Uses seeded user non.space@alkem.io / password, authenticating through the
// Kratos browser UI (non-interactive-login is disabled on this stack). Each test
// performs multiple full UI logins across fresh contexts, so timeouts are raised.
//
// spec source: specs/029-detect-signup-language/repos.yaml -> tracks (US2)

import { test, expect, Page } from '@playwright/test';
import { BASE_URL, footerLanguageDutch, languageOfferBanner } from './helpers';
import { uiLogin } from './loginHelper';

const USER_EMAIL = 'non.space@alkem.io';

// Settings language Select (UserSettingsTabView.tsx): SelectTrigger aria-label is
// the localised "Interface language" (en) / "Interfacetaal" (nl) /
// "Oberflächensprache" (de) — match all so the test is robust to whatever the
// account's current display language is.
const languageSelectTrigger = (page: Page) =>
  page.getByRole('combobox', { name: /Interface language|Interfacetaal|Oberflächensprache/i });

/** Derive the authenticated user's URL slug in a locale-independent way. The
 *  dashboard renders an account link `/user/<slug>/settings/account` regardless
 *  of the display language, so we wait for it and parse the slug from its href. */
async function deriveUserSlug(page: Page): Promise<string> {
  await page.goto(`${BASE_URL}/home`);
  const accountLink = page.locator('a[href*="/settings/account"]').first();
  await accountLink.waitFor({ state: 'attached', timeout: 25_000 });
  const href = await accountLink.getAttribute('href');
  const slug = href?.match(/\/user\/([^/?#]+)/)?.[1];
  expect(slug, `could not derive user slug from account link href=${href}`).toBeTruthy();
  return slug as string;
}

async function gotoLanguageSettings(page: Page): Promise<void> {
  const slug = await deriveUserSlug(page);
  await page.goto(`${BASE_URL}/user/${slug}/settings/settings`);
  await expect(languageSelectTrigger(page)).toBeVisible({ timeout: 20_000 });
}

async function setLanguageViaSettings(page: Page, endonym: string): Promise<void> {
  await languageSelectTrigger(page).click();
  await page.getByRole('option', { name: endonym, exact: true }).click();
  // Give the updateUserSettings mutation time to persist.
  await page.waitForTimeout(2500);
}

test.describe('US2 — cross-device / cross-session persistence', () => {
  // Reset the user back to English at the end of each test so runs are idempotent.
  test.afterEach(async ({ browser }) => {
    const ctx = await browser.newContext({ locale: 'en-US' });
    const page = await ctx.newPage();
    try {
      await uiLogin(page, USER_EMAIL);
      await gotoLanguageSettings(page);
      const current = (await languageSelectTrigger(page).textContent())?.trim();
      if (current && current !== 'English') {
        await setLanguageViaSettings(page, 'English');
      }
    } catch {
      /* best-effort reset */
    } finally {
      await ctx.close();
    }
  });

  // US2-AS5: change language in settings -> persists on a fresh re-login (a second
  // "device" = a brand-new context with cleared storage). FR-008/FR-009/FR-011.
  test('US2-AS5 — settings language change persists across a fresh-context re-login', async ({
    browser,
  }) => {
    test.setTimeout(220_000);
    // Device 1 (en-US browser): log in, switch to Dutch via settings.
    const ctx1 = await browser.newContext({ locale: 'en-US' });
    const page1 = await ctx1.newPage();
    await uiLogin(page1, USER_EMAIL);
    await gotoLanguageSettings(page1);
    await setLanguageViaSettings(page1, 'Nederlands');
    // Immediate effect on device 1.
    await expect(footerLanguageDutch(page1)).toBeVisible({ timeout: 15_000 });
    await page1.screenshot({ path: 'us2-as5-device1-dutch.png', fullPage: false });
    await ctx1.close();

    // Device 2 (fresh context, still en-US browser): log in again — Dutch persists
    // with zero re-selection, proving it is a user-account setting not a browser one.
    const ctx2 = await browser.newContext({ locale: 'en-US' });
    const page2 = await ctx2.newPage();
    await uiLogin(page2, USER_EMAIL);
    await page2.goto(`${BASE_URL}/home`);
    await expect(footerLanguageDutch(page2)).toBeVisible({ timeout: 20_000 });
    // Stored preference wins => no new language offer banner.
    await expect(languageOfferBanner(page2)).toHaveCount(0);
    await page2.screenshot({ path: 'us2-as5-device2-dutch-persisted.png', fullPage: false });
    await ctx2.close();
  });

  // US2-AS3: stored Dutch + a de-DE browser -> stored preference wins, no offer.
  test('US2-AS3 — stored preference wins over a differing browser language; no offer', async ({
    browser,
  }) => {
    test.setTimeout(220_000);
    // Seed Dutch on the account (en-US device).
    const ctx1 = await browser.newContext({ locale: 'en-US' });
    const page1 = await ctx1.newPage();
    await uiLogin(page1, USER_EMAIL);
    await gotoLanguageSettings(page1);
    await setLanguageViaSettings(page1, 'Nederlands');
    await expect(footerLanguageDutch(page1)).toBeVisible({ timeout: 15_000 });
    await ctx1.close();

    // Sign in from a de-DE browser: account Dutch must win, and NO offer banner.
    const ctx2 = await browser.newContext({ locale: 'de-DE' });
    const page2 = await ctx2.newPage();
    await uiLogin(page2, USER_EMAIL);
    await page2.goto(`${BASE_URL}/home`);
    await expect(footerLanguageDutch(page2)).toBeVisible({ timeout: 20_000 });
    await expect(languageOfferBanner(page2)).toHaveCount(0);
    await page2.screenshot({ path: 'us2-as3-stored-wins.png', fullPage: false });
    await ctx2.close();
  });
});
