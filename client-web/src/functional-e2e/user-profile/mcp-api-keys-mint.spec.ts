// spec: agents-hq/specs/038-mcp-api-key-management/spec.md (User Story 1 —
// Mint a personal MCP key and connect a client, P1)
//
// Durable regression cover for the US1 live acceptance walk: create a named
// MCP API key with the `read` operation, see the plaintext exactly once with
// a will-not-be-shown-again warning, a copy control and a connection recipe
// naming the MCP endpoint + substituted Authorization header, confirm the
// reveal panel is accessible (focus, announced warning, focusable read-only
// field, announced copy outcome), confirm the value never resurfaces after
// close/reload, confirm an expiry date is listed, and confirm submitting with
// no operation selected is refused client-side with an actionable message and
// no key created. The freshly minted key authenticating against `/rest/mcp`
// (US1-AS3) and the expiry actually cutting authentication (US1-AS5, second
// half) are exercised live but are not repeated here as a browser assertion —
// they are the connection-contract / server-side halves of these criteria,
// already covered by the MCP module's own server-side test suite
// (`src/services/mcp-server/**`) and the `gql-live` track.

import { test, expect } from '@playwright/test';
import {
  acceptAllCookiesButton,
  logInHeaderLink,
} from '../authentication/common-authentication-page-elements';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const adminEmail = process.env.AUTH_ADMIN_EMAIL || 'admin@alkem.io';
const adminPassword = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';

const uniqueName = (label: string) =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const signIn = async (page: import('@playwright/test').Page) => {
  await page.goto(baseUrl);
  if (
    await acceptAllCookiesButton(page)
      .isVisible({ timeout: 3000 })
      .catch(() => false)
  ) {
    await acceptAllCookiesButton(page).click();
  }
  if (
    await logInHeaderLink(page)
      .isVisible({ timeout: 5000 })
      .catch(() => false)
  ) {
    await logInHeaderLink(page).click();
  } else {
    await page.goto(`${baseUrl}/login`);
  }
  await page.getByRole('textbox', { name: 'E-Mail' }).fill(adminEmail);
  await page.getByRole('textbox', { name: 'Password' }).fill(adminPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(url => !url.pathname.startsWith('/login'), {
    timeout: 15000,
  });
};

const goToSecuritySettings = async (page: import('@playwright/test').Page) => {
  // Resolve the signed-in user's own nameID from the header's "My Account"
  // link rather than hardcoding it — keeps this spec valid regardless of
  // which admin identity the environment seeds.
  await page.goto(`${baseUrl}/home`);
  const accountLink = page.getByRole('link', { name: 'My Account' });
  await accountLink.waitFor({ state: 'visible', timeout: 15000 });
  const href = await accountLink.getAttribute('href');
  const nameId = href?.match(/\/user\/([^/]+)\/settings/)?.[1];
  expect(nameId).toBeTruthy();
  await page.goto(`${baseUrl}/user/${nameId}/settings/security`);
  await expect(
    page.getByRole('heading', { name: 'MCP API Keys' })
  ).toBeVisible({ timeout: 15000 });
};

test.describe(
  'MCP API keys — mint + one-time reveal (US1)',
  { tag: '@forge-acceptance' },
  () => {
    test.beforeEach(async ({ page }) => {
      await signIn(page);
      await goToSecuritySettings(page);
    });

    test('US1-AS1/AS4: creating a key reveals the value exactly once with a warning, copy control and connection recipe', async ({
      page,
    }) => {
      const keyName = uniqueName('Claude Desktop');

      await page.getByRole('button', { name: 'Create API key' }).click();
      await page.getByLabel('Name').fill(keyName);
      await page.locator('label:has-text("Read")').first().click();
      await page.getByRole('button', { name: 'Create key' }).click();

      // US1-AS1 — the plaintext, the will-not-see-it-again warning, and a
      // copy control.
      await expect(
        page.getByRole('heading', { name: 'API key created' })
      ).toBeVisible();
      await expect(
        page.getByText(/you will not be able to see it again/i)
      ).toBeVisible();

      const keyInput = page.locator('#mcp-api-key-reveal-value');
      const revealedValue = await keyInput.inputValue();
      expect(revealedValue).toMatch(/^mcp_/);

      const copyButton = page.getByRole('button', { name: /^copy$/i });
      await expect(copyButton).toBeVisible();

      // US1-AS4 — connection recipe names the MCP endpoint and the exact
      // Authorization header with the new key substituted in.
      await expect(page.getByText('/rest/mcp')).toBeVisible();
      await expect(
        page.getByText(`Authorization: Bearer ${revealedValue}`)
      ).toBeVisible();

      await page.getByRole('button', { name: 'Done', exact: true }).last().click();
      await expect(
        page.getByRole('heading', { name: 'API key created' })
      ).toBeHidden();

      await expect(
        page.getByText(keyName, { exact: true }).first()
      ).toBeVisible();
    });

    test('US1-AS4a: the reveal panel is keyboard/screen-reader accessible', async ({
      page,
    }) => {
      const keyName = uniqueName('A11y Key');

      await page.getByRole('button', { name: 'Create API key' }).click();
      await page.getByLabel('Name').fill(keyName);
      await page.locator('label:has-text("Read")').first().click();
      await page.getByRole('button', { name: 'Create key' }).click();

      const keyInput = page.locator('#mcp-api-key-reveal-value');
      await expect(keyInput).toBeVisible();

      // Focus enters the panel on open, into the read-only, selectable value
      // field.
      await expect(keyInput).toBeFocused();
      await expect(keyInput).toHaveAttribute('readonly', '');

      // The warning is announced (role=alert / aria-live=assertive).
      const warning = page.getByText(/you will not be able to see it again/i);
      await expect(warning).toHaveAttribute('role', 'alert');

      // Copy outcome is announced via a live region, not colour alone.
      await page.getByRole('button', { name: /^copy$/i }).click();
      const announcement = page.locator('output[aria-live]');
      await expect(announcement).toHaveText(/copied/i);

      await page.getByRole('button', { name: 'Done', exact: true }).last().click();
    });

    test('US1-AS2: the revealed value disappears on close and never resurfaces on reload', async ({
      page,
    }) => {
      const keyName = uniqueName('Ephemeral Reveal');

      await page.getByRole('button', { name: 'Create API key' }).click();
      await page.getByLabel('Name').fill(keyName);
      await page.locator('label:has-text("Read")').first().click();
      await page.getByRole('button', { name: 'Create key' }).click();

      const revealedValue = await page
        .locator('#mcp-api-key-reveal-value')
        .inputValue();
      expect(revealedValue).toMatch(/^mcp_/);

      await page.getByRole('button', { name: 'Done', exact: true }).last().click();

      // Gone from the interface immediately after close.
      await expect(page.getByText(revealedValue)).toHaveCount(0);

      // Still gone after a full reload of the settings page — never
      // re-fetchable, never persisted by the interface (FR-026).
      await page.reload();
      await expect(
        page.getByRole('heading', { name: 'MCP API Keys' })
      ).toBeVisible({ timeout: 15000 });
      await expect(page.getByText(revealedValue)).toHaveCount(0);
      await expect(page.locator('[role="dialog"]')).toHaveCount(0);

      // The key is still listed by name — only the value is gone.
      await expect(page.getByText(keyName, { exact: true }).first()).toBeVisible();
    });

    test('US1-AS5: a chosen expiry date is listed against the new key', async ({
      page,
    }) => {
      const keyName = uniqueName('Expiry Key');

      await page.getByRole('button', { name: 'Create API key' }).click();
      await page.getByLabel('Name').fill(keyName);
      await page.locator('label:has-text("Read")').first().click();

      await page.getByRole('button', { name: /expiry/i }).click();
      // `.first()` can land on "today", which the create mutation refuses
      // (expiry must be strictly in the future) — pick a day a few cells in
      // to land safely in the future, mirroring the manual verification walk.
      const enabledDays = page.locator('button[name="day"]:not([disabled])');
      await enabledDays.nth(Math.min(5, (await enabledDays.count()) - 1)).click();

      // The dialog now shows a concrete date rather than "Never expires".
      await expect(
        page.getByRole('button', { name: /never expires/i })
      ).toHaveCount(0);

      // Capture the date the picker actually selected, so the row assertion
      // below proves the chosen expiry is DISPLAYED — `not.toContainText(
      // 'Never expires')` alone would also pass if the row showed no expiry
      // at all, which is the regression most worth catching here.
      const selectedExpiry = (
        await page
          .getByRole('button', { name: /expiry \(optional\)/i })
          .innerText()
      ).trim();
      expect(selectedExpiry).not.toMatch(/never expires/i);

      await page.getByRole('button', { name: 'Create key' }).click();
      await page.getByRole('button', { name: 'Done', exact: true }).last().click();

      const row = page
        .getByText(keyName, { exact: true })
        .first()
        .locator('xpath=ancestor::li');
      await expect(row).not.toContainText('Never expires');
      await expect(row).toContainText(selectedExpiry);
    });

    test('US1-AS6: submitting with no operation selected is refused client-side, with no key created', async ({
      page,
    }) => {
      const keyName = uniqueName('No Operation Key');

      const rowsBefore = await page.locator('ul[role="list"] li').count();

      // The test name claims "refused CLIENT-side", so prove it: watch for a
      // mintMcpApiKey operation on the wire. Without this the test also passes
      // when the client sends the mutation and the server rejects it — which
      // is a materially different (and slower, and noisier) behaviour.
      let mintRequestSent = false;
      page.on('request', request => {
        if (
          request.method() === 'POST' &&
          (request.postData() ?? '').includes('mintMcpApiKey')
        ) {
          mintRequestSent = true;
        }
      });

      await page.getByRole('button', { name: 'Create API key' }).click();
      await page.getByLabel('Name').fill(keyName);
      // Deliberately leave both operation checkboxes unchecked.
      await page.getByRole('button', { name: 'Create key' }).click();

      await expect(
        page.getByText(/choose at least one operation/i)
      ).toBeVisible();
      expect(mintRequestSent).toBe(false);

      // The dialog is still open — the mutation never fired.
      await expect(page.getByRole('dialog')).toBeVisible();

      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByText(keyName, { exact: true })).toHaveCount(0);

      const rowsAfter = await page.locator('ul[role="list"] li').count();
      expect(rowsAfter).toBe(rowsBefore);
    });
  }
);
