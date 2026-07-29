// Feature 029-detect-signup-language — US1: new Dutch-speaking user offered Dutch.
//
// HEADLESS SIGNUP IS INFEASIBLE on this stack: the multi-step Kratos sign-up
// (terms -> details -> password -> MailSlurper email verification) does not drive
// reliably headless — the "Volgende/Next" transition stalls after the details
// step. Recorded as infeasible-headless. US1's banner appears on FIRST
// AUTHENTICATED LANDING via the very same detection + gate code exercised by US3
// (detectBrowserLanguage + resolveOfferLanguage + useLanguageOffer), so the
// detection-precedence half of US1 is covered here at the anonymous surface,
// which runs the identical resolveOfferLanguage() decision:
//   AS5 (de-DE -> no offer), AS6 (nl-BE -> Dutch offered), AS7 (en-first -> no
//   offer). AS1/AS2/AS3 (accept/decline recording on a new account) and AS8
//   (external-IdP) require completed signup and are recorded as infeasible /
//   covered-by-US3 + client-web:T007 unit.
//
// NOTE: the anonymous offer banner was originally broken (it never rendered for an
// unauthenticated visitor because useLegacyLanguageReconciliation never latched
// reconcileComplete=true for !isAuthenticated — BUG-B). That is now FIXED, so the
// nl-BE POSITIVE case (banner offered) is the regression guard for the fix, and the
// de-DE / en-first NEGATIVE cases (no banner) continue to hold.
//
// spec source: specs/029-detect-signup-language/repos.yaml -> tracks (US1)

import { test, expect } from '@playwright/test';
import { landAnonymously, languageOfferBanner, consentAcceptCookies } from './helpers';

test.describe('US1-AS5 de-DE — no Dutch offer (not eligible, SC-008)', () => {
  test.use({ locale: 'de-DE' });
  test('US1-AS5 — de-DE browser shows no offer banner', async ({ page }) => {
    await landAnonymously(page);
    await consentAcceptCookies(page);
    await page.waitForTimeout(3000);
    await expect(languageOfferBanner(page)).toHaveCount(0);
    await page.screenshot({ path: 'us1-as5-de-no-offer.png', fullPage: false });
  });
});

test.describe('US1-AS7 en-US — English top-ranked, no Dutch offer', () => {
  test.use({ locale: 'en-US' });
  test('US1-AS7 — English browser shows no offer banner', async ({ page }) => {
    await landAnonymously(page);
    await consentAcceptCookies(page);
    await page.waitForTimeout(3000);
    await expect(languageOfferBanner(page)).toHaveCount(0);
    await page.screenshot({ path: 'us1-as7-en-no-offer.png', fullPage: false });
  });
});

test.describe('US1-AS6 nl-BE — Belgian Dutch maps to nl, Dutch offered', () => {
  test.use({ locale: 'nl-BE' });
  test('US1-AS6 — nl-BE browser is offered Dutch', async ({ page }) => {
    await landAnonymously(page);
    await consentAcceptCookies(page);
    const banner = languageOfferBanner(page);
    await expect(banner).toBeVisible({ timeout: 15_000 });
    await expect(banner).toHaveAttribute('data-language', 'nl');
    await page.screenshot({ path: 'us1-as6-nlbe-dutch-offered.png', fullPage: false });
  });
});
