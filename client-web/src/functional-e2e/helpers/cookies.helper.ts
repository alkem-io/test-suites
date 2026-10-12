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
export async function grantCookieConsent(context: BrowserContext): Promise<void> {
  await context.addCookies([COOKIE_CONSENT_COOKIE]);
}

/**
 * Dismisses the consent banner if it is on screen. For flows that must start
 * from a virgin context (cookie-consent and anonymous walks); everything else
 * should seed consent with `grantCookieConsent` and never see the banner.
 * No fixed wait: the banner is either already rendered with the page or it is
 * not shown at all.
 */
export async function acceptCookiesIfVisible(page: Page): Promise<void> {
  const acceptCookiesButton = page
    .getByRole('button', { name: /accept all cookies/i })
    .first();
  if (await acceptCookiesButton.isVisible().catch(() => false)) {
    await acceptCookiesButton.click();
    await acceptCookiesButton.waitFor({ state: 'hidden' });
  }
}
