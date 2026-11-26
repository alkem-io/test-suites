import { Browser, Page, expect, test } from '@playwright/test';
import { readPlatformBrowserMeasurement } from '@alkemio/tests-lib';
import {
  acceptAllCookiesButton,
  cookieBanner,
  cookieBannerSettingsButton,
  cookieSettingsAnalyticsSwitch,
  cookieSettingsSaveButton,
  cookieSettingsSavedToast,
  cookieSettingsSheet,
  footerCookieSettingsButton,
  onlyNecessaryCookiesButton,
  storeCookieChoice,
  storedCookieChoice,
} from '../helpers/cookies.helper';

const baseUrl = process.env.ALKEMIO_BASE_URL ?? 'http://localhost:3000';

/** Elastic APM RUM ("browser measurement") posts its events here. */
const RUM_EVENTS = /\/intake\/v2\/rum\/events/;

/** How long a page is watched before "no measurement request" is concluded. */
const RUM_WATCH_MS = 6_000;

/**
 * Why the measurement tests cannot prove anything here, or `undefined` when
 * they can. "No request went out" only means something where the page WOULD
 * send measurement once it is allowed, so that is established first:
 *
 * - the server has to switch it on (`APM_RUM_ENABLED`, served to the browser
 *   as `apm.rumEnabled`);
 * - the client build has to start the agent. client-web starts it in a
 *   production build only, so a development-mode build never measures.
 */
async function whyMeasurementCannotBeTested(
  browser: Browser
): Promise<string | undefined> {
  const { enabled, result } = await readPlatformBrowserMeasurement();
  expect(result.error, 'the platform configuration is readable').toBeFalsy();
  if (!enabled) {
    return 'Browser measurement (APM_RUM_ENABLED) is off in this environment: the client never starts the agent, so the absence of requests would prove nothing about consent.';
  }

  const context = await browser.newContext();
  try {
    await storeCookieChoice(context, ['technical', 'analysis']);
    const page = await context.newPage();
    const measured = page.waitForRequest(RUM_EVENTS, { timeout: 45_000 }).then(
      () => true,
      () => false
    );
    await page.goto(baseUrl);
    return (await measured)
      ? undefined
      : 'Browser measurement is switched on, but this client sends none even with analytics accepted (a development-mode build never starts the agent), so the absence of requests would prove nothing about consent.';
  } finally {
    await context.close();
  }
}

/**
 * Passes when the page sends no browser-measurement request for the whole
 * watch window. Start it BEFORE the navigation it should cover.
 */
async function expectNoRumRequest(page: Page, during: () => Promise<unknown>) {
  const seen: string[] = [];
  const record = (url: string) => {
    if (RUM_EVENTS.test(url)) seen.push(url);
  };
  const listener = (request: { url(): string }) => record(request.url());
  page.context().on('request', listener);
  try {
    await during();
    // The agent queues events and flushes them shortly after the page load
    // transaction ends, so the window has to outlast the load itself.
    await page.waitForLoadState('load');
    await page
      .waitForRequest(RUM_EVENTS, { timeout: RUM_WATCH_MS })
      .catch(() => undefined);
  } finally {
    page.context().off('request', listener);
  }
  expect(seen, 'no request to the browser-measurement endpoint').toEqual([]);
}

test.describe('Authentication - Cookie Consent', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('cookie consent banner appears on first visit', async ({ page }) => {
    // Navigate to platform as unauthenticated user
    await page.goto(baseUrl);

    // The banner is visible, with both choices and the way into the settings
    await expect(cookieBanner(page)).toBeVisible({ timeout: 15_000 });
    await expect(acceptAllCookiesButton(page)).toBeVisible();
    await expect(onlyNecessaryCookiesButton(page)).toBeVisible();
    await expect(cookieBannerSettingsButton(page)).toBeVisible();
    expect(await storedCookieChoice(page.context())).toBeUndefined();
  });

  test('cookie consent persists after acceptance', async ({ page }) => {
    // Navigate to platform
    await page.goto(baseUrl);

    // Accept cookies
    await expect(cookieBanner(page)).toBeVisible({ timeout: 15_000 });
    await acceptAllCookiesButton(page).click();

    // Verify banner disappears and the choice is stored
    await expect(cookieBanner(page)).toHaveCount(0);
    expect(await storedCookieChoice(page.context())).toEqual([
      'technical',
      'analysis',
    ]);

    // Navigate to another page
    await page.goto(`${baseUrl}/spaces`);
    await expect(page.getByRole('contentinfo')).toBeVisible({
      timeout: 30_000,
    });

    // Verify cookie consent banner does not appear (consent persisted)
    await expect(cookieBanner(page)).toHaveCount(0);
  });

  test('cookie consent persists after page reload', async ({ page }) => {
    // Navigate and accept cookies
    await page.goto(baseUrl);
    await expect(cookieBanner(page)).toBeVisible({ timeout: 15_000 });
    await acceptAllCookiesButton(page).click();
    await expect(cookieBanner(page)).toHaveCount(0);

    // Refresh page
    await page.reload();
    await expect(page.getByRole('contentinfo')).toBeVisible({
      timeout: 30_000,
    });

    // Verify banner still does not appear
    await expect(cookieBanner(page)).toHaveCount(0);
  });

  test('cookie consent persists across navigation', async ({ page }) => {
    // Navigate and accept cookies
    await page.goto(baseUrl);
    await expect(cookieBanner(page)).toBeVisible({ timeout: 15_000 });
    await acceptAllCookiesButton(page).click();
    await expect(cookieBanner(page)).toHaveCount(0);

    // Navigate away and back
    await page.goto(`${baseUrl}/spaces`);
    await expect(page.getByRole('contentinfo')).toBeVisible({
      timeout: 30_000,
    });
    await expect(cookieBanner(page)).toHaveCount(0);

    await page.goto(baseUrl);
    await expect(page.getByRole('contentinfo')).toBeVisible({
      timeout: 30_000,
    });
    await expect(cookieBanner(page)).toHaveCount(0);
  });

  test('"Only necessary" closes the banner and the choice survives a reload', async ({
    page,
  }) => {
    await page.goto(baseUrl);
    await expect(cookieBanner(page)).toBeVisible({ timeout: 15_000 });

    await onlyNecessaryCookiesButton(page).click();

    // The banner is gone and only the necessary category is stored
    await expect(cookieBanner(page)).toHaveCount(0);
    expect(await storedCookieChoice(page.context())).toEqual(['technical']);

    // A reload does not ask again and does not widen the choice
    await page.reload();
    await expect(page.getByRole('contentinfo')).toBeVisible({
      timeout: 30_000,
    });
    await expect(cookieBanner(page)).toHaveCount(0);
    expect(await storedCookieChoice(page.context())).toEqual(['technical']);
  });

  test('the choice can be changed later through "Cookie settings"', async ({
    page,
  }) => {
    // Start from a stored "Only necessary", as a returning visitor would
    await storeCookieChoice(page.context(), ['technical']);
    await page.goto(baseUrl);
    await expect(page.getByRole('contentinfo')).toBeVisible({
      timeout: 30_000,
    });
    await expect(cookieBanner(page)).toHaveCount(0);

    // The footer entry opens the settings with the stored choice: Analytics off
    await footerCookieSettingsButton(page).click();
    await expect(cookieSettingsSheet(page)).toBeVisible();
    await expect(cookieSettingsAnalyticsSwitch(page)).not.toBeChecked();

    // Closing without saving stores nothing
    await cookieSettingsAnalyticsSwitch(page).click();
    await expect(cookieSettingsAnalyticsSwitch(page)).toBeChecked();
    await page.keyboard.press('Escape');
    await expect(cookieSettingsSheet(page)).toHaveCount(0);
    expect(await storedCookieChoice(page.context())).toEqual(['technical']);

    // Turning Analytics on and saving stores both categories
    await footerCookieSettingsButton(page).click();
    await expect(cookieSettingsAnalyticsSwitch(page)).not.toBeChecked();
    await cookieSettingsAnalyticsSwitch(page).click();
    await cookieSettingsSaveButton(page).click();
    await expect(cookieSettingsSheet(page)).toHaveCount(0);
    await expect(cookieSettingsSavedToast(page)).toBeVisible();
    expect(await storedCookieChoice(page.context())).toEqual([
      'technical',
      'analysis',
    ]);

    // The settings now open with Analytics on; turning it off again withdraws.
    // (Where browser measurement is running, withdrawing reloads the page, so
    // the stored choice is polled rather than read once.)
    await footerCookieSettingsButton(page).click();
    await expect(cookieSettingsAnalyticsSwitch(page)).toBeChecked();
    await cookieSettingsAnalyticsSwitch(page).click();
    await cookieSettingsSaveButton(page).click();
    await expect
      .poll(() => storedCookieChoice(page.context()))
      .toEqual(['technical']);
    await expect(cookieSettingsSheet(page)).toHaveCount(0);
    await expect(cookieBanner(page)).toHaveCount(0);
  });
});

test.describe('Cookie Consent - browser measurement', () => {
  let cannotTest: string | undefined;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000);
    cannotTest = await whyMeasurementCannotBeTested(browser);
  });

  test.beforeEach(async ({ context }) => {
    test.skip(Boolean(cannotTest), cannotTest ?? '');
    await context.clearCookies();
  });

  test('before any choice, a page load sends no browser measurement', async ({
    page,
  }) => {
    await expectNoRumRequest(page, async () => {
      await page.goto(baseUrl);
      await expect(cookieBanner(page)).toBeVisible({ timeout: 15_000 });
    });
    expect(await storedCookieChoice(page.context())).toBeUndefined();
  });

  test('after "Only necessary", no browser measurement is sent', async ({
    page,
  }) => {
    await page.goto(baseUrl);
    await expect(cookieBanner(page)).toBeVisible({ timeout: 15_000 });

    await expectNoRumRequest(page, async () => {
      await onlyNecessaryCookiesButton(page).click();
      await expect(cookieBanner(page)).toHaveCount(0);
    });

    // Nor on the next full page load with that choice stored
    await expectNoRumRequest(page, async () => {
      await page.reload();
      await expect(page.getByRole('contentinfo')).toBeVisible({
        timeout: 30_000,
      });
    });
  });

  // Proves that a page with analytics accepted sends measurement. It does not
  // prove the start without a reload: the navigation below loads a new
  // document, and a client that only starts the agent on load would pass too.
  // The start in the same page is covered in client-web ("starts the agent
  // when the visitor accepts mid-session", ApmProvider.test.tsx).
  test('after "Accept all", browser measurement is sent', async ({ page }) => {
    await page.goto(baseUrl);
    await expect(cookieBanner(page)).toBeVisible({ timeout: 15_000 });

    const measured = page.waitForRequest(RUM_EVENTS, { timeout: 60_000 });
    await acceptAllCookiesButton(page).click();
    await expect(cookieBanner(page)).toHaveCount(0);
    // A full page load with the choice stored: the agent reports it once done
    await page.goto(`${baseUrl}/spaces`);
    await measured;
  });
});
