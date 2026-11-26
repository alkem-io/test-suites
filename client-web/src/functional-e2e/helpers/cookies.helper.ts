import { BrowserContext, Locator, Page } from '@playwright/test';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

/**
 * Everything the tests know about the cookie banner and the Cookie settings
 * sheet lives in this file. No other file carries a copy of a label: when the
 * wording changes in client-web, this is the one place to follow it.
 *
 * Labels are the `cookieConsent.*` keys of client-web
 * `src/crd/i18n/layout/layout.<lang>.json`, in the order en, nl, es, bg, de,
 * fr. Every locator lists all six, so a walk that changes language keeps
 * finding the banner.
 */
const anyOf = (labels: string[]): RegExp =>
  new RegExp(
    `^(${labels.map(l => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`,
    'i'
  );

const BANNER_TITLE = anyOf(['Cookies', 'Бисквитки']);
const ACCEPT_ALL = anyOf([
  'Accept all',
  'Alles accepteren',
  'Aceptar todas',
  'Приемане на всички',
  'Alle akzeptieren',
  'Tout accepter',
]);
const ONLY_NECESSARY = anyOf([
  'Only necessary',
  'Alleen noodzakelijke',
  'Solo necesarias',
  'Само необходимите',
  'Nur notwendige',
  'Nécessaires uniquement',
]);
const BANNER_SETTINGS = anyOf([
  'Settings',
  'Instellingen',
  'Configuración',
  'Настройки',
  'Einstellungen',
  'Paramètres',
]);
const COOKIE_SETTINGS = anyOf([
  'Cookie settings',
  'Cookie-instellingen',
  'Configuración de cookies',
  'Настройки за бисквитки',
  'Cookie-Einstellungen',
  'Paramètres des cookies',
]);
const ANALYTICS = anyOf([
  'Analytics',
  'Analyse',
  'Analíticas',
  'Анализ',
  "Mesure d'audience",
]);
const SAVE_SETTINGS = anyOf([
  'Save settings',
  'Instellingen opslaan',
  'Guardar configuración',
  'Запазване на настройките',
  'Einstellungen speichern',
  'Enregistrer les paramètres',
]);
const SETTINGS_SAVED = anyOf([
  'Cookie settings saved.',
  'Cookie-instellingen opgeslagen.',
  'Configuración de cookies guardada.',
  'Настройките за бисквитки са запазени.',
  'Cookie-Einstellungen gespeichert.',
  'Paramètres des cookies enregistrés.',
]);

// --- The banner (client-web `CookieConsentBanner.tsx`: a labelled <section>) ---

export const cookieBanner = (page: Page): Locator =>
  page.getByRole('region', { name: BANNER_TITLE });
export const acceptAllCookiesButton = (page: Page): Locator =>
  cookieBanner(page).getByRole('button', { name: ACCEPT_ALL });
export const onlyNecessaryCookiesButton = (page: Page): Locator =>
  cookieBanner(page).getByRole('button', { name: ONLY_NECESSARY });
/** "Settings" on the banner; opens the Cookie settings sheet. */
export const cookieBannerSettingsButton = (page: Page): Locator =>
  cookieBanner(page).getByRole('button', { name: BANNER_SETTINGS });

// --- Cookie settings (the footer entry and `CookieSettingsSheet.tsx`) ---

/** "Cookie settings" in the page footer; present with or without a choice. */
export const footerCookieSettingsButton = (page: Page): Locator =>
  page.getByRole('contentinfo').getByRole('button', { name: COOKIE_SETTINGS });
export const cookieSettingsSheet = (page: Page): Locator =>
  page.getByRole('dialog', { name: COOKIE_SETTINGS });
export const cookieSettingsAnalyticsSwitch = (page: Page): Locator =>
  cookieSettingsSheet(page).getByRole('switch', { name: ANALYTICS });
export const cookieSettingsSaveButton = (page: Page): Locator =>
  cookieSettingsSheet(page).getByRole('button', { name: SAVE_SETTINGS });
/** The "Cookie settings saved." confirmation. */
export const cookieSettingsSavedToast = (page: Page): Locator =>
  page.getByText(SETTINGS_SAVED);

// --- The stored choice ---

export const CONSENT_COOKIE_NAME = 'accepted_cookies';

/**
 * The consent cookie the banner writes on "Accept all" (client-web
 * `src/main/cookies/useAlkemioCookies.ts`): name `accepted_cookies`, value the
 * JSON array of accepted categories, URL-encoded by react-cookie. "Only
 * necessary" writes `["technical"]`. Seeding it into a context means the
 * banner never renders — no overlay to dismiss, no click intercepted, no
 * timing to get right.
 */
export const COOKIE_CONSENT_COOKIE = {
  name: CONSENT_COOKIE_NAME,
  value: encodeURIComponent(JSON.stringify(['technical', 'analysis'])),
  url: baseUrl,
};

/** Grants cookie consent up front, before the first navigation. */
export async function grantCookieConsent(
  context: BrowserContext
): Promise<void> {
  await context.addCookies([COOKIE_CONSENT_COOKIE]);
}

/**
 * Stores a choice the way the banner does, before the first navigation:
 * `['technical']` is "Only necessary", `['technical', 'analysis']` is
 * "Accept all".
 */
export async function storeCookieChoice(
  context: BrowserContext,
  categories: string[]
): Promise<void> {
  await context.addCookies([
    {
      ...COOKIE_CONSENT_COOKIE,
      value: encodeURIComponent(JSON.stringify(categories)),
    },
  ]);
}

/**
 * The stored categories, or `undefined` when no choice is stored (or the
 * stored value is not the JSON array the client writes).
 */
export async function storedCookieChoice(
  context: BrowserContext
): Promise<string[] | undefined> {
  const stored = (await context.cookies()).find(
    cookie => cookie.name === CONSENT_COOKIE_NAME
  );
  if (!stored) return undefined;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(stored.value));
    return Array.isArray(parsed) ? parsed.map(String) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Accepts all cookies if the banner is on screen. For flows that must start
 * from a virgin context (cookie-consent and anonymous walks); everything else
 * should seed consent with `grantCookieConsent` and never see the banner.
 *
 * When the context carries no consent cookie the banner WILL mount, but after
 * the SPA's first render — an instantaneous check can run before it exists and
 * leave it covering the bottom of the page for a later click (nightly
 * 2026-10-20: "Open chat" sat under it for three minutes). So the wait for the
 * banner is bounded, and skipped entirely once consent is recorded.
 */
export async function acceptCookiesIfVisible(page: Page): Promise<void> {
  const answered = (await page.context().cookies()).some(
    cookie => cookie.name === CONSENT_COOKIE_NAME
  );
  if (answered) return;

  const accept = acceptAllCookiesButton(page);
  await accept
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => undefined);
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
    await accept.waitFor({ state: 'hidden' });
  }
}
