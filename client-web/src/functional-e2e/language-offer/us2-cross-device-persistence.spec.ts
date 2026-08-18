// Feature 029-detect-signup-language — US2: the language preference follows the
// USER across browsers/devices (R-1 / FR-008 / FR-009 / FR-011). This is the
// server-persistence half — the switcher/settings path, no detection needed.
//
// "Device 2" is a brand-new browser context restored from the persona's `.auth/`
// session (see authState.ts): fresh cookie jar, empty localStorage, no in-memory
// state — the ONLY channel that can carry the preference is the account itself.
// Each walk asserts that explicitly (nothing language-related in browser storage)
// so the proof does not rest on the absence of a login step.
//
// spec source: specs/029-detect-signup-language/repos.yaml -> tracks (US2)

import { test, expect, Page, Browser } from '@playwright/test';
import {
  BASE_URL,
  footerLanguageDutch,
  expectNoLanguageOffer,
  readLanguageStorage,
  gql,
} from './helpers';
import { MEMBER_STATE } from './authState';

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

/**
 * Pick a language in the settings switcher and wait for the persisting mutation
 * to come back OK — no fixed sleep, and a failed write fails the test here rather
 * than as a confusing assertion further down.
 */
async function setLanguageViaSettings(page: Page, endonym: string): Promise<void> {
  await languageSelectTrigger(page).click();
  const [response] = await Promise.all([
    page.waitForResponse(
      async res => res.url().includes('/graphql') && res.request().postData()?.includes('updateUserSettings') === true,
      { timeout: 20_000 }
    ),
    page.getByRole('option', { name: endonym, exact: true }).click(),
  ]);
  const body = await response.json();
  expect(body.errors, `updateUserSettings failed: ${JSON.stringify(body.errors)}`).toBeUndefined();
}

/**
 * Reset the account back to English over the API so runs are idempotent.
 * Deliberately NOT swallowed: a failed reset leaves the persona in Dutch and
 * would contaminate later scenarios, so it must fail loudly.
 */
async function resetAccountLanguageToEnglish(browser: Browser): Promise<void> {
  const ctx = await browser.newContext({ storageState: MEMBER_STATE });
  try {
    const me = await gql(ctx.request, '{ me { user { id settings { language } } } }');
    const user = me?.me?.user;
    expect(user?.id, 'could not resolve the authenticated user for the language reset').toBeTruthy();
    if (user.settings?.language === 'en') return;
    await gql(
      ctx.request,
      `mutation ResetLanguage($userID: UUID!) {
         updateUserSettings(settingsData: { userID: $userID, settings: { language: "en" } }) {
           id settings { language }
         }
       }`,
      { userID: user.id }
    );
  } finally {
    await ctx.close();
  }
}

test.describe('US2 — cross-device / cross-session persistence', () => {
  // Session comes from the `auth-setup` project (.auth/ storage state).
  test.use({ storageState: MEMBER_STATE });

  test.afterEach(async ({ browser }) => {
    await resetAccountLanguageToEnglish(browser);
  });

  // US2-AS5: change the language in settings on device 1 -> a second device
  // (fresh context, same account) shows Dutch with zero re-selection.
  // FR-008/FR-009/FR-011.
  test('US2-AS5 — settings language change is served to a fresh device', async ({ page, browser }, testInfo) => {
    // Device 1 (en-US browser): switch to Dutch via settings.
    await gotoLanguageSettings(page);
    await setLanguageViaSettings(page, 'Nederlands');
    await expect(footerLanguageDutch(page)).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: testInfo.outputPath('us2-as5-device1-dutch.png') });

    // Device 2: brand-new context, still an en-US browser.
    const device2 = await browser.newContext({ storageState: MEMBER_STATE, locale: 'en-US' });
    try {
      const page2 = await device2.newPage();
      await page2.goto(`${BASE_URL}/home`);
      await expect(footerLanguageDutch(page2)).toBeVisible({ timeout: 20_000 });
      // Stored preference wins => no new language offer banner. Use the explicit
      // negative wait: the offer gate opens only after config + reconciliation
      // resolve, so an immediate count would pass before a late banner renders.
      await expectNoLanguageOffer(page2, 'a stored account preference must suppress the offer');

      // The account is the ONLY carrier: this device has no language in browser storage.
      const storage = await readLanguageStorage(page2);
      expect(storage.languageOffer, 'device 2 must not be reading a stored browser preference').toBeNull();
      expect(storage.legacyI18n, 'device 2 must not be reading a legacy i18nextLng value').toBeNull();

      await page2.screenshot({ path: testInfo.outputPath('us2-as5-device2-dutch-persisted.png') });
    } finally {
      await device2.close();
    }
  });

  // US2-AS3: stored Dutch + a de-DE browser -> stored preference wins, no offer.
  test('US2-AS3 — stored preference wins over a differing browser language; no offer', async ({
    page,
    browser,
  }, testInfo) => {
    // Seed Dutch on the account (en-US device).
    await gotoLanguageSettings(page);
    await setLanguageViaSettings(page, 'Nederlands');
    await expect(footerLanguageDutch(page)).toBeVisible({ timeout: 15_000 });

    // Same account from a de-DE browser: the account preference must win, and the
    // visitor must NOT be offered anything.
    const germanDevice = await browser.newContext({ storageState: MEMBER_STATE, locale: 'de-DE' });
    try {
      const page2 = await germanDevice.newPage();
      await page2.goto(`${BASE_URL}/home`);
      await expect(footerLanguageDutch(page2)).toBeVisible({ timeout: 20_000 });
      await expectNoLanguageOffer(
        page2,
        'a stored preference must win over the browser language, with no offer made'
      );
      await page2.screenshot({ path: testInfo.outputPath('us2-as3-stored-wins.png') });
    } finally {
      await germanDevice.close();
    }
  });
});
