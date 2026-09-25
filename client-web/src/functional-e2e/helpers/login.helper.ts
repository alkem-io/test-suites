import { Locator, Page } from '@playwright/test';
import { acceptCookiesIfVisible } from './cookies.helper';

const defaultPassword = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';
const defaultBaseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

/**
 * Sets a secret into an input WITHOUT `Locator.fill`. Playwright's reporters
 * record `fill` as a step titled `Fill "<value>" <locator>`, and the nightly
 * workflow publishes the HTML report to the PUBLIC gh-pages site — so every
 * `fill(password)` put the harness password on that site in plaintext.
 * `evaluate` is recorded as a bare "Evaluate" step; its arguments are never
 * serialised into the report. The native value setter + input/change events
 * are what React-controlled inputs (the Kratos sign-in form here) need to
 * pick the value up as if it were typed.
 */
export async function fillSecret(
  locator: Locator,
  secret: string
): Promise<void> {
  await locator.waitFor({ state: 'visible' });
  await locator.evaluate((el, value) => {
    const input = el as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;
    if (setter) {
      setter.call(input, value);
    } else {
      input.value = value;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, secret);
}

/**
 * CRD login helper. The CRD header exposes a direct "Log in" link; a full-page
 * visit to /login does NOT initialise the Kratos sign-in flow, so the form
 * fields never render. This helper loads the SPA, dismisses the cookie banner,
 * clicks the in-SPA "Log in" link, signs in, and dismisses the one-time
 * "A fresh new Alkemio is here" design dialog.
 */
export async function loginViaCrd(
  page: Page,
  email: string,
  password: string = defaultPassword,
  baseUrl: string = defaultBaseUrl
): Promise<void> {
  await page.goto(baseUrl);
  await acceptCookiesIfVisible(page);

  const loginLink = page.getByRole('link', { name: 'Log in', exact: true });
  await loginLink.waitFor({ state: 'visible', timeout: 30_000 });
  await loginLink.click();
  await page.waitForURL(/.*login.*/);

  const emailField = page.getByRole('textbox', { name: 'E-Mail' });
  await emailField.waitFor({ state: 'visible', timeout: 30_000 });
  await emailField.fill(email);
  await fillSecret(page.getByRole('textbox', { name: 'Password' }), password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(/.*home.*/, { timeout: 30_000 });

  const switchToNewDesign = page.getByRole('button', {
    name: /take me to the new design/i,
  });
  if (await switchToNewDesign.isVisible({ timeout: 5000 }).catch(() => false)) {
    await switchToNewDesign.click().catch(() => {});
  }
}
