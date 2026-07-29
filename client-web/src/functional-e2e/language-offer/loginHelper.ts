// UI login helper for the 029 acceptance walks.
//
// The stack has non-interactive-login DISABLED, so we authenticate through the
// Kratos browser UI exactly like the existing harness LoginPage does, but
// against the running-app origin :3000. Seeded users log in with password
// 'password' (e.g. non.space@alkem.io). admin@alkem.io also works on this stack.
//
// IMPORTANT: the anonymous header AND the Kratos-served login form are localised
// to the browser locale under test (Log in/Anmelden/Inloggen; Password/Passwort;
// Sign in/Anmelden). All control locators below therefore match every supported
// label so the helper works under any test.use({ locale }).

import { Page, expect } from '@playwright/test';
import { BASE_URL } from './helpers';

const PASSWORD = process.env.AUTH_TEST_HARNESS_PASSWORD || 'password';

const LOGIN_LINK_RE = /^(Log in|Inloggen|Anmelden|Iniciar sesión|Se connecter|Вход)$/i;
const LOGOUT_ITEM_RE = /^(Log out|Uitloggen|Abmelden|Cerrar sesión|Se déconnecter|Изход)$/i;
// Kratos field labels carry a trailing " *"; match the stem across languages.
const PASSWORD_FIELD_RE = /^(Password|Passwort|Wachtwoord|Contraseña|Mot de passe|Парола) \*$/i;
const SIGNIN_BUTTON_RE = /^(Sign in|Anmelden|Inloggen|Iniciar sesión|Se connecter|Вход)$/i;

/** Log in through the Kratos UI. Leaves the page on the authenticated shell. */
export async function uiLogin(page: Page, email: string, password: string = PASSWORD): Promise<void> {
  await page.goto(`${BASE_URL}/home`);

  // Dismiss cookie consent if present so it doesn't overlay the header.
  const acceptAll = page.getByRole('button', {
    name: /Accept All Cookies|Alle cookies accepteren|Alle Cookies akzeptieren/i,
  });
  if (await acceptAll.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await acceptAll.click().catch(() => {});
  }

  // The in-SPA "Log in" link initialises the Kratos flow (a hard visit to /login
  // does not render the form). Wait for it, click, then fill the Kratos form.
  const loginLink = page.getByRole('link', { name: LOGIN_LINK_RE });
  await loginLink.first().waitFor({ state: 'visible', timeout: 30_000 });
  await loginLink.first().click();
  await page.waitForURL(/.*login.*/, { timeout: 30_000 });

  // Email label is "E-Mail *" in every locale; password label is localised.
  const emailField = page.getByLabel('E-Mail *');
  await emailField.waitFor({ state: 'visible', timeout: 30_000 });
  await emailField.fill(email);
  await page.getByLabel(PASSWORD_FIELD_RE).fill(password);
  await page.getByRole('button', { name: SIGNIN_BUTTON_RE }).first().click();

  // Land back on the authenticated app.
  await page.waitForURL(/.*(home|user).*/, { timeout: 30_000 });

  // One-time "A fresh new Alkemio is here" dialog — opt into the new design if shown.
  const switchToNew = page.getByRole('button', { name: /take me to the new design/i });
  if (await switchToNew.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await switchToNew.click().catch(() => {});
  }
}

/** Log out via the user menu so a subsequent login can use a different account. */
export async function uiLogout(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/home`);
  const avatar = page.getByRole('banner').getByRole('button').last();
  await avatar.click();
  const logout = page.getByRole('menuitem', { name: LOGOUT_ITEM_RE });
  await logout.click().catch(() => {});
  await page.waitForTimeout(1500);
}

/** Assert the authenticated shell is present (user avatar in the banner). */
export async function expectAuthenticated(page: Page): Promise<void> {
  await expect(page.getByRole('banner').getByRole('button').last()).toBeVisible({ timeout: 20_000 });
}
