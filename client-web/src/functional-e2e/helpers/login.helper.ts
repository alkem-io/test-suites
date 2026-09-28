import { expect, Locator, Page } from '@playwright/test';
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
  // Mirror the actionability checks `Locator.fill` performs — visible,
  // enabled, editable — so a disabled field (e.g. the Kratos form while the
  // sign-in flow is still being prepared) is waited for, not written to.
  // `toBeEditable` also rejects anything that is not an input/textarea/
  // contenteditable, so a locator that resolves to a wrapper fails here
  // instead of silently setting `.value` on a <div>. Neither assertion
  // message contains the secret.
  await locator.waitFor({ state: 'visible' });
  await expect(locator).toBeEditable({ timeout: 15_000 });
  const outcome = await locator.evaluate((el, value) => {
    const isInput = el instanceof HTMLInputElement;
    const isTextArea = el instanceof HTMLTextAreaElement;
    if (!isInput && !isTextArea) {
      return 'not-an-input';
    }
    const field = el as HTMLInputElement | HTMLTextAreaElement;
    const proto = isInput
      ? window.HTMLInputElement.prototype
      : window.HTMLTextAreaElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) {
      setter.call(field, value);
    } else {
      field.value = value;
    }
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    return field.value === value ? 'ok' : 'reset-by-page';
  }, secret);
  if (outcome !== 'ok') {
    // Deliberately no expected/actual values: this message lands in the
    // published report.
    throw new Error(
      `fillSecret: could not set the secret (${outcome}) on ${locator}`
    );
  }
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
