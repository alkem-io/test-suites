// Shared helpers for the 029-detect-signup-language acceptance walks.
//
// ENVIRONMENT NOTE (verified 2026-07-23):
//   The SPA under test is the feature worktree build served same-origin through
//   Traefik at http://localhost:3000. Reaching it at the raw vite dev origin
//   http://localhost:3001 fails CORS for every GraphQL + Kratos call
//   (apollo-require-preflight header rejected; whoami wildcard-vs-credentials),
//   so ConfigProvider never resolves and — by design (resolveOfferLanguage
//   suspends until config loads, R-10) — no banner can ever appear there.
//   All walks therefore target :3000. The spec.md/repos.yaml `:3001` URLs are
//   the dev origin; :3000 is the running-app origin.
//
// DETECTION LEVER: browser language is driven per-file via
//   test.use({ locale: 'nl-NL' })  -> sets navigator.languages, which is exactly
//   what detectBrowserLanguage() (navigator.languages[0], primary-subtag) reads.

import { Page, expect, Locator, APIRequestContext } from '@playwright/test';

export const BASE_URL = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
export const GRAPHQL_URL = process.env.ALKEMIO_GRAPHQL || `${BASE_URL}/graphql`;

/**
 * Run a GraphQL operation on the caller's session. Pass `page.request` (or any
 * context's `request`) so the browser's cookies authenticate the call — the
 * walks use this to check the SERVER-side outcome of a UI action rather than
 * trusting on-screen feedback.
 */
export async function gql(
  api: APIRequestContext,
  query: string,
  variables?: Record<string, unknown>
): Promise<Record<string, any>> {
  const response = await api.post(GRAPHQL_URL, { data: { query, variables } });
  const body = await response.json();
  expect(body.errors, `GraphQL errors: ${JSON.stringify(body.errors)}`).toBeUndefined();
  return body.data;
}

/**
 * The platform's eligible language set + default, straight from the Config query
 * the feature itself reads (anonymous-readable). Tests assert against this rather
 * than hard-coding 'nl', so an environment that widens the eligible set fails
 * loudly instead of silently under-asserting.
 */
export async function languageConfig(api: APIRequestContext): Promise<{ eligible: string[]; default: string }> {
  const data = await gql(api, '{ platform { configuration { language { eligible default } } } }');
  return data.platform.configuration.language;
}

// --- Selectors (from the real implementation) ---
// LanguageOfferBanner.tsx: <header data-testid="language-offer-banner" data-language="nl">
export const languageOfferBanner = (page: Page): Locator => page.getByTestId('language-offer-banner');

// CookieConsentBanner.tsx (crd-layout `cookies.acceptAll`). The label IS
// localised, so the locator lists every supported rendering and the landing wait
// stays locale-independent. (In practice an unanswered anonymous visitor sees the
// platform default — English — per the FR-004/SC-005 invariant the walks assert.)
export const cookieConsentAcceptAll = (page: Page): Locator =>
  page.getByRole('button', {
    name: /Accept All Cookies|Accepteer Alle Cookies|Alle Cookies akzeptieren|Accepter tous les Cookies|Aceptar todas las cookies|Приеми всички бисквитки/i,
  });
// NOTE (2026-07-28): the `preference`/functional cookie category was removed. The
// anonymous language choice is session-only (in-memory), never written to the
// browser, so there is no per-category consent to grant. The cookie banner keeps
// only technical + analysis; answering it (any way) is all the language offer waits
// on (FR-013b-ii, UX ordering). See consentAcceptCookies() below.

// The Dutch offer copy (crd-language nl namespace), rendered in the OFFERED language (FR-007).
export const DUTCH_BANNER_TITLE = 'Alkemio is ook beschikbaar in het Nederlands.';
export const DUTCH_ACCEPT_LABEL = 'Ja, gebruik Nederlands';
export const DUTCH_DECLINE_LABEL = 'Nee bedankt, blijf in het Engels';

export const dutchAcceptButton = (page: Page): Locator =>
  page.getByRole('button', { name: DUTCH_ACCEPT_LABEL });
export const dutchDeclineButton = (page: Page): Locator =>
  page.getByRole('button', { name: DUTCH_DECLINE_LABEL });

// localStorage keys the feature governs.
export const LANGUAGE_OFFER_STORAGE_KEY = 'alkemio.languageOffer';
export const LEGACY_I18N_KEY = 'i18nextLng';
export const CONSENT_COOKIE_NAME = 'accepted_cookies';

// The footer renders the ACTIVE display language as its endonym ("English" /
// "Nederlands") in every locale file — this is the app's own ground truth for
// which language the interface is currently displayed in.
export const footerLanguageEnglish = (page: Page): Locator =>
  page.getByRole('contentinfo').getByRole('button', { name: 'English' });
export const footerLanguageDutch = (page: Page): Locator =>
  page.getByRole('contentinfo').getByRole('button', { name: 'Nederlands' });

// Either footer language endonym — used to auto-wait for the footer to render
// before reading the active display language (the footer lazy-loads AFTER the
// cookie-consent banner that landAnonymously anchors on; reading the language
// with a bare isVisible() before it renders races to 'unknown' under load).
export const footerLanguageAny = (page: Page): Locator =>
  page.getByRole('contentinfo').getByRole('button', { name: /^(English|Nederlands)$/ });

/**
 * Returns 'en' | 'nl', read from the footer language button endonym. Auto-waits
 * for the footer language control to render first (deterministic — no race), so
 * callers get the app's own ground-truth display language rather than 'unknown'
 * when the footer is still mounting. Throws (via expect) only if the footer never
 * renders a language control within the timeout — a real failure, not a flake.
 */
export async function activeDisplayLanguage(page: Page, timeout = 20_000): Promise<string> {
  await expect(footerLanguageAny(page)).toBeVisible({ timeout });
  if (await footerLanguageDutch(page).isVisible().catch(() => false)) return 'nl';
  if (await footerLanguageEnglish(page).isVisible().catch(() => false)) return 'en';
  return 'unknown';
}

/**
 * Assert that no language offer is made. Waits up to `window` ms for the banner
 * to appear and fails if it ever does — an explicit negative wait rather than a
 * fixed sleep followed by a one-shot count, so a banner that renders late (the
 * gate opens only after config + reconciliation resolve) is still caught.
 */
export async function expectNoLanguageOffer(page: Page, reason: string, window = 3_000): Promise<void> {
  const appeared = await languageOfferBanner(page)
    .waitFor({ state: 'visible', timeout: window })
    .then(() => true)
    .catch(() => false);
  expect(appeared, reason).toBe(false);
}

/**
 * Land on a public page as a genuinely fresh anonymous visitor. The Playwright
 * fixture already gives each test an isolated context (no cookies/storage), so
 * this is just the navigation + settle. We land on /home; the SPA resolves
 * anonymously (public Explore Spaces) and shows the cookie-consent banner.
 * The landing wait is locale-independent (the consent Accept-All button).
 */
export async function landAnonymously(page: Page, pathAfterBase = '/home'): Promise<void> {
  await page.goto(`${BASE_URL}${pathAfterBase}`);
  await expect(cookieConsentAcceptAll(page)).toBeVisible({ timeout: 30_000 });
}

/**
 * Answer (accept) the cookie-consent banner so the language offer can appear.
 * With the `preference` category removed, there is a single "answer the cookie
 * banner" action — Accept All resolves consent (technical + analysis). The
 * anonymous language choice itself is session-only and never stored regardless.
 */
export async function consentAcceptCookies(page: Page): Promise<void> {
  await cookieConsentAcceptAll(page).click();
  await expect(cookieConsentAcceptAll(page)).toHaveCount(0, { timeout: 10_000 });
}

/** Read the two language-related localStorage keys + the consent cookie. Used to
 *  assert the session-only invariant: an anonymous choice writes NOTHING (SC-001c). */
export async function readLanguageStorage(page: Page): Promise<{
  languageOffer: string | null;
  legacyI18n: string | null;
  consentCookie: string | undefined;
}> {
  const ls = await page.evaluate(
    ({ offerKey, legacyKey }) => ({
      languageOffer: window.localStorage.getItem(offerKey),
      legacyI18n: window.localStorage.getItem(legacyKey),
    }),
    { offerKey: LANGUAGE_OFFER_STORAGE_KEY, legacyKey: LEGACY_I18N_KEY }
  );
  const cookies = await page.context().cookies();
  const consent = cookies.find(c => c.name === CONSENT_COOKIE_NAME)?.value;
  return { languageOffer: ls.languageOffer, legacyI18n: ls.legacyI18n, consentCookie: consent };
}
