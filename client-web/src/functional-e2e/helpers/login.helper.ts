import { Page } from '@playwright/test';
import { acceptCookiesIfVisible } from './cookies.helper';

const defaultPassword = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';
const defaultBaseUrl =
  process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

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
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(/.*home.*/, { timeout: 30_000 });

  const switchToNewDesign = page.getByRole('button', {
    name: /take me to the new design/i,
  });
  if (
    await switchToNewDesign.isVisible({ timeout: 5000 }).catch(() => false)
  ) {
    await switchToNewDesign.click().catch(() => {});
  }
}
