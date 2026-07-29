// Feature 029-detect-signup-language — US3: anonymous Dutch-speaking visitors are
// offered Dutch too. Highest-value story (widest funnel). Exercises: the banner-vs-
// cookie-consent ordering, the cold-load display race, SC-001c (session-only — the
// anonymous choice is in-memory and written NOWHERE in the browser), and the
// FR-004/SC-005 "offer never silently switches display" invariant (anonymous
// pre-answer display MUST be the platform default).
//
// NOTE (2026-07-28): the `preference` cookie category and the localStorage
// persistence were removed — the anonymous choice is session-only, so it is never
// remembered across sessions (a reload re-offers). These specs assert that.
//
// Target origin :3000 (running app, same-origin). Browser language driven by
// test.use({ locale }) which sets navigator.languages — exactly what
// detectBrowserLanguage() reads.
//
// spec source: specs/029-detect-signup-language/repos.yaml -> forge.verification.tracks (US3)

import { test, expect } from '@playwright/test';
import {
  landAnonymously,
  languageOfferBanner,
  cookieConsentAcceptAll,
  consentAcceptCookies,
  dutchAcceptButton,
  dutchDeclineButton,
  readLanguageStorage,
  activeDisplayLanguage,
  footerLanguageDutch,
  footerLanguageEnglish,
  DUTCH_BANNER_TITLE,
} from './helpers';

// A Dutch (Netherlands) browser for every test in this file.
test.use({ locale: 'nl-NL' });

test.describe('US3 — anonymous Dutch offer', () => {
  // DL-6 / FR-004 / SC-005 core invariant: a nl-NL anonymous visitor who has NOT
  // yet answered the offer must see the platform DEFAULT (English) — tier #4
  // (browser detection) feeds the OFFER only, never a silent display switch.
  test('US3-SC005 — anonymous pre-answer display is the platform default (English), NOT auto-switched to Dutch', async ({
    page,
  }) => {
    await landAnonymously(page);
    // Cookie consent unanswered at this point; display must be the platform default.
    const lang = await activeDisplayLanguage(page);
    await page.screenshot({ path: 'us3-sc005-preanswer-display.png', fullPage: false });
    expect(
      lang,
      'FR-004/SC-005/DL-6: an un-answered anonymous nl-NL visitor must be shown the platform default (en), not silently switched to Dutch by navigator detection'
    ).toBe('en');
  });

  // US3-AS2b: on first visit, while the cookie-consent banner is unanswered, the
  // language banner MUST NOT be shown (FR-013b-ii — consent resolved first).
  test('US3-AS2b — language banner not shown until consent resolved', async ({ page }) => {
    await landAnonymously(page);

    // Consent banner is present (fresh context => no accepted_cookies cookie).
    await expect(cookieConsentAcceptAll(page)).toBeVisible({ timeout: 15_000 });

    // Language banner must NOT be present yet, even though the browser is nl-NL.
    await expect(languageOfferBanner(page)).toHaveCount(0);

    await page.screenshot({
      path: 'us3-as2b-consent-unanswered-no-language-banner.png',
      fullPage: false,
    });
  });

  // US3-AS1: nl-NL context + the cookie banner answered -> the same non-blocking
  // banner offers Dutch, written in Dutch (FR-007).
  test('US3-AS1 — Dutch banner appears after consent, written in Dutch', async ({ page }) => {
    await landAnonymously(page);
    await consentAcceptCookies(page);

    const banner = languageOfferBanner(page);
    await expect(banner).toBeVisible({ timeout: 15_000 });
    // data-language must be the eligible Dutch language.
    await expect(banner).toHaveAttribute('data-language', 'nl');
    // Copy is in Dutch (FR-007): the title.
    await expect(banner).toContainText(DUTCH_BANNER_TITLE);

    await page.screenshot({ path: 'us3-as1-dutch-banner.png', fullPage: false });
  });

  // US3-AS2 (session-only): accept -> the interface renders Dutch for the CURRENT
  // SESSION only. Nothing is written to the browser, and because the choice is
  // in-memory, a reload (a fresh page session) is RE-OFFERED — it is not remembered.
  test('US3-AS2 — accept renders Dutch for the session; nothing stored; reload re-offers', async ({ page }) => {
    await landAnonymously(page);
    await consentAcceptCookies(page);

    const banner = languageOfferBanner(page);
    await expect(banner).toBeVisible({ timeout: 15_000 });
    await dutchAcceptButton(page).click();

    // Banner dismisses; interface is Dutch for this session.
    await expect(banner).toHaveCount(0, { timeout: 10_000 });
    await expect(footerLanguageDutch(page)).toBeVisible({ timeout: 15_000 });

    // Session-only: NOTHING language-related is written to the browser.
    const storage = await readLanguageStorage(page);
    expect(storage.languageOffer, 'session-only: alkemio.languageOffer is never written').toBeNull();
    expect(storage.legacyI18n, 'session-only: legacy i18nextLng is never written').toBeNull();

    // A reload starts a fresh page session -> the in-memory choice is gone. The
    // cookie-consent cookie persists (consent already resolved), so the language
    // banner returns directly, re-offering Dutch (not remembered across sessions).
    await page.reload();
    await expect(languageOfferBanner(page)).toBeVisible({ timeout: 15_000 });
    const afterReload = await readLanguageStorage(page);
    expect(afterReload.languageOffer, 'still nothing stored after reload').toBeNull();

    await page.screenshot({ path: 'us3-as2-accept-session-only.png', fullPage: false });
  });

  // US3-AS2a (SC-001c hard negative): any anonymous accept renders Dutch for the
  // session but writes ZERO language keys to browser storage (session-only by design).
  test('US3-AS2a — accept writes zero language keys to browser storage (SC-001c)', async ({
    page,
  }) => {
    await landAnonymously(page);
    await consentAcceptCookies(page);

    const banner = languageOfferBanner(page);
    await expect(banner).toBeVisible({ timeout: 15_000 });
    await dutchAcceptButton(page).click();

    // Session renders Dutch (in-memory context) ...
    await expect(footerLanguageDutch(page)).toBeVisible({ timeout: 15_000 });

    // ... but NOTHING language-related is written to the browser at all.
    const storage = await readLanguageStorage(page);
    expect(storage.languageOffer, 'session-only: alkemio.languageOffer must never be written').toBeNull();
    expect(storage.legacyI18n, 'session-only: legacy i18nextLng must never be written (retired ungated write)').toBeNull();

    await page.screenshot({ path: 'us3-as2a-accept-zero-storage.png', fullPage: false });
  });

  // US3-AS3 (session-only): decline -> stays default (English) and the banner is
  // gone for the rest of the session. Nothing is stored; a reload (fresh session)
  // re-offers, since the answer is not remembered across sessions.
  test('US3-AS3 — decline stays English; nothing stored; not re-shown this session', async ({ page }) => {
    await landAnonymously(page);
    await consentAcceptCookies(page);

    const banner = languageOfferBanner(page);
    await expect(banner).toBeVisible({ timeout: 15_000 });
    await dutchDeclineButton(page).click();

    // Stays in the platform default (English footer label) and the banner is gone
    // for the rest of this session.
    await expect(banner).toHaveCount(0, { timeout: 10_000 });
    await expect(footerLanguageEnglish(page)).toBeVisible({ timeout: 15_000 });

    // Session-only: nothing is written to the browser.
    const storage = await readLanguageStorage(page);
    expect(storage.languageOffer, 'session-only: the decline is not persisted').toBeNull();

    // Not re-shown within the same session (in-memory answered) — assert it stays gone.
    await expect(footerLanguageEnglish(page)).toBeVisible();
    await expect(languageOfferBanner(page)).toHaveCount(0);

    await page.screenshot({ path: 'us3-as3-decline-session-only.png', fullPage: false });
  });
});
