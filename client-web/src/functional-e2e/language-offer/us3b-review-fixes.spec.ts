// Feature 029-detect-signup-language — Phase V' review-fix regression additions.
//
// These specs validate the review-phase client-web fixes committed after the
// Phase-V acceptance run (HEAD 42269a630). They are additive to the persisted
// US1/US2/US3/US5 walks and run with the same
// config/playwright.config.language-offer.ts against the running app at :3000.
//
// corr-client-4 (LIVE, structural + best-effort behavioral) — LanguageOfferProvider
//   was HOISTED to App.tsx, above all CrdLayoutWrapper route groups, so an
//   anonymous visitor's in-memory `answered` choice survives a CLIENT-SIDE route
//   change (SC-004 / FR-013b-i). See the extensive INFEASIBILITY NOTE on the test
//   below: this build's ANONYMOUS surface exposes NO client-side (SPA-internal)
//   cross-route-group link — every anonymous navigation (shell links, public
//   space cards) is a full document load, which by design loses the un-persisted
//   in-memory choice. The corr-client-4 precondition (a client-side transition)
//   therefore cannot be produced through the anonymous UI as a black-box walk.
//   The fix is instead verified structurally (provider hoisted above <Outlet/>;
//   CrdLayoutWrapper no longer owns the provider) plus the observable invariant
//   that a full reload without preference consent correctly re-offers.
//
// corr-client-2 (robustness) — a non-JSON / truncated `accepted_cookies` consent
//   cookie must NEVER crash the app (FR-013e). (Since the 2026-07-28 session-only
//   change the LanguageOfferProvider no longer reads the consent cookie at all — it
//   is pure in-memory — so nothing JSON-parses the raw value; `consentResolved` is a
//   plain presence check. This test remains a lasting regression guard that a
//   malformed consent cookie does not blank the SPA.) Seeded via context.addCookies
//   before first load; asserts the app renders and raises no uncaught error.
//
// Browser language driven by test.use({ locale: 'nl-NL' }) → navigator.languages,
// exactly what detectBrowserLanguage() reads.

import { test, expect } from '@playwright/test';
import {
  BASE_URL,
  landAnonymously,
  languageOfferBanner,
  consentAcceptCookies,
  dutchDeclineButton,
  readLanguageStorage,
  footerLanguageEnglish,
} from './helpers';

test.use({ locale: 'nl-NL' });

test.describe("US3b — Phase V' review-fix regressions", () => {
  // corr-client-4 — observable half: after DECLINE, a FULL page reload (the only
  // navigation this build's anonymous surface offers between route groups) correctly
  // RE-OFFERS, because the choice is session-only (in-memory) and never persisted.
  // This is the contrapositive that proves the choice was NOT written to storage
  // (session-only stores nothing; the in-memory choice survives client-side
  // navigation only while the hoisted provider stays mounted, which a full reload
  // deliberately tears down).
  test('corr-client-4 — anon decline is session-only / in-memory (re-offered after a full reload)', async ({ page }, testInfo) => {
    await landAnonymously(page, '/home');
    await consentAcceptCookies(page); // answer the cookie banner so the language offer can appear

    const banner = languageOfferBanner(page);
    await expect(banner).toBeVisible({ timeout: 15_000 });
    await expect(banner).toHaveAttribute('data-language', 'nl');

    await dutchDeclineButton(page).click();
    await expect(banner).toHaveCount(0, { timeout: 10_000 });
    await expect(footerLanguageEnglish(page)).toBeVisible({ timeout: 15_000 });

    // Nothing persisted (session-only).
    const afterDecline = await readLanguageStorage(page);
    expect(
      afterDecline.languageOffer,
      'session-only → alkemio.languageOffer must NOT be written'
    ).toBeNull();

    // A full reload loses the in-memory choice → the visitor is re-offered. This is
    // the documented, correct behaviour without consent AND confirms nothing was
    // silently persisted that would suppress the re-offer.
    await page.reload();
    // consent cookie (technical) persists, so consent is already resolved → banner returns directly.
    await expect(languageOfferBanner(page)).toBeVisible({ timeout: 15_000 });
    const afterReload = await readLanguageStorage(page);
    expect(afterReload.languageOffer, 'still nothing persisted after reload').toBeNull();

    await page.screenshot({ path: testInfo.outputPath('us3b-corr-client-4-inmemory-only.png'), fullPage: false });
  });

  // corr-client-4 — LIVE client-side-navigation form of the scenario.
  // INFEASIBILITY NOTE (verified 2026-07-23): the anonymous surface of this build
  // exposes no client-side (SPA-internal) cross-route-group link. Probed
  // exhaustively: the shell links (logo→/home, Log in→/login, Sign Up→/sign_up)
  // and every public space card (absolute-URL <a> e.g. /welcome-space) each
  // trigger a FULL document load (a window sentinel planted before the click does
  // not survive), which by design discards the un-persisted in-memory choice.
  // React Router v7 is a data router: history.pushState + synthetic popstate does
  // not drive a transition, and page.goBack() also reloads here. There is thus no
  // anonymous UI path that performs a client-side route-group transition, so the
  // corr-client-4 precondition cannot be reproduced as an anonymous black-box
  // walk. The fix is verified structurally in App.tsx (provider hoisted above
  // <Outlet/>) + CrdLayoutWrapper (provider removed) — see the verifier report.
  // Kept as an explicit skip so the committed suite records WHY, rather than
  // silently omitting the scenario.
  test.skip('corr-client-4 LIVE — in-memory answered survives CLIENT-SIDE cross-route-group navigation', async () => {
    // Intentionally empty: infeasible on the anonymous surface (see note above).
  });

  // corr-client-2 robustness: a non-JSON accepted_cookies cookie must NOT crash the
  // app. Seed the raw cookie BEFORE load.
  //
  // NOTE on behavior: react-cookie returns the raw (unparseable) string, so App.tsx
  // sees `cookies.accepted_cookies` as truthy and does NOT re-show the cookie-consent
  // banner; useCrdLanguage's `consentResolved` is a plain presence check (=== undefined)
  // and is therefore true. Nothing JSON-parses the raw value anymore (the anonymous
  // choice is session-only, so LanguageOfferProvider no longer reads the cookie). The
  // load-bearing assertion is only that nothing crashes on the unparseable value.
  test('corr-client-2 — non-JSON consent cookie does not crash the app', async ({ page, context }, testInfo) => {
    const url = new URL(BASE_URL);
    await context.addCookies([
      {
        name: 'accepted_cookies',
        value: 'not-a-json-value{{{',
        domain: url.hostname,
        path: '/',
      },
    ]);

    const pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(String(err)));

    await page.goto(`${BASE_URL}/home`);

    // The app must render — a crash in an unguarded JSON.parse would blank the SPA.
    await expect(page.getByRole('contentinfo')).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole('contentinfo').getByRole('button', { name: /English|Nederlands/ })
    ).toBeVisible({ timeout: 15_000 });

    // No uncaught page error from the malformed cookie (the try/catch held).
    expect(
      pageErrors,
      'corr-client-2: malformed accepted_cookies must not raise an uncaught error'
    ).toEqual([]);

    // The crash this guards against is caught by React's error boundary, which
    // means it raises NO uncaught pageerror — the assertion above cannot see it.
    // Assert the boundary's own output is absent instead. (Verified on acc: a
    // wrong-shape cookie renders exactly this screen with pageErrors === 0.)
    await expect(
      page.getByText(/something went wrong/i),
      'corr-client-2: malformed accepted_cookies must not trip the error boundary'
    ).toHaveCount(0);

    // NOTE: deliberately NO assertion on the cookie-consent banner. Whether an
    // unreadable consent value re-asks for consent is environment-dependent —
    // the deployed acc build re-shows the banner, which is the SAFER behaviour,
    // so pinning it to "not shown" would lock in the worse one. Out of scope for
    // this scenario, which is about not crashing.

    await page.screenshot({ path: testInfo.outputPath('us3b-corr-client-2-bad-cookie-no-crash.png'), fullPage: false });
  });

  // corr-client-2b — the sibling case corr-client-2 never exercised, and a REAL
  // defect on the deployed build.
  //
  // `accepted_cookies` holds a JSON ARRAY of accepted categories (the live value
  // is ["technical","analysis"]). A value that is valid JSON but the WRONG SHAPE
  // parses cleanly and then reaches a `.includes(...)` call on a non-array:
  //
  //   TypeError: s.includes is not a function
  //
  // React's error boundary catches it, so there is NO uncaught pageerror — the
  // whole app is replaced by the "Looks like something went wrong" screen and the
  // user cannot proceed. Clearing the cookie is the only way out, which an
  // ordinary user has no way to discover.
  //
  // Reproduced on acc (2026-08-07) with both `true` and `{"a":1}`; the unparseable
  // string in corr-client-2 does NOT trigger it (it never parses, so nothing calls
  // .includes).
  //
  // Crash site: core/analytics/apm/useApmInit.ts `useGetOrSetApmCookie`, which
  // types the value `const acceptedCookies: string` — react-cookie JSON-parses
  // it, so at runtime it is a string[]. Arrays and strings both have .includes,
  // which is why the annotation has never bitten; a boolean/number/object has not.
  //
  // PRECONDITION — the browser must hold NO `apm` tracking cookie. That function
  // early-returns on it BEFORE reading the consent value, so a visitor who has
  // already accepted analysis cookies never reaches the .includes call. It is the
  // apm cookie that gates this, not the consent-migration localStorage flag.
  //
  // LIKELIHOOD — low. Every client-web release since #2267 (2022) has written this
  // cookie as JSON.stringify of an array, so no shipped build produces a crashing
  // shape, and truncation/corruption is safe (unparseable => raw string => .includes
  // works). The open vector is welcome.alkem.io, which writes this cookie at the
  // same apex domain from a different codebase — unverified here.
  //
  // fixme: product defect, not a test defect — un-fixme once the consent read
  // shape-guards its parsed value. Tracked in language-offer-test-plan.md.
  test.fixme('corr-client-2b — wrong-shape consent cookie must not break the app', async ({
    page,
    context,
  }) => {
    const url = new URL(BASE_URL);
    await context.addCookies([
      { name: 'accepted_cookies', value: 'true', domain: `.${url.hostname}`, path: '/' },
    ]);

    await page.goto(`${BASE_URL}/home`);

    // Order matters: assert the app RENDERED first. A bare toHaveCount(0) here
    // would pass vacuously against the empty DOM right after goto, before the
    // boundary has had a chance to render.
    await expect(page.getByRole('contentinfo')).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByText(/something went wrong/i),
      'a wrong-shape consent cookie must not trip the error boundary'
    ).toHaveCount(0);
  });
});
