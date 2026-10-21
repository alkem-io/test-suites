import { BrowserContext, Page } from '@playwright/test';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

/**
 * The consent cookie the CRD cookie banner writes on "Accept All Cookies"
 * (client-web `src/main/cookies/useAlkemioCookies.ts`): name `accepted_cookies`,
 * value the JSON array of accepted categories, URL-encoded by react-cookie.
 * Seeding it into a context means the banner never renders — no overlay to
 * dismiss, no click intercepted, no timing to get right.
 */
export const COOKIE_CONSENT_COOKIE = {
  name: 'accepted_cookies',
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
 * Dismisses the consent banner if it is on screen. For flows that must start
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
    cookie => cookie.name === COOKIE_CONSENT_COOKIE.name
  );
  if (answered) return;

  const acceptCookiesButton = page
    .getByRole('button', { name: /accept all cookies/i })
    .first();
  await acceptCookiesButton
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => undefined);
  if (await acceptCookiesButton.isVisible().catch(() => false)) {
    await acceptCookiesButton.click();
    await acceptCookiesButton.waitFor({ state: 'hidden' });
  }
}
