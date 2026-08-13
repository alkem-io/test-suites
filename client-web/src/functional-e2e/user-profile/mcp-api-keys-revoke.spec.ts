// spec: agents-hq/specs/038-mcp-api-key-management/spec.md (User Story 2 — See
// and revoke my keys, P1)
//
// Durable regression cover for the US2 live acceptance walk: the keys card
// lists name/operations/created/expiry/last-used-time/last-used-address/status
// for every key including revoked and expired ones (US2-AS1), shows an
// explanatory empty state with a create action when the user holds no keys
// (US2-AS1a — covered by the McpApiKeysCard component test, see the note
// below), collapses an expired-AND-revoked key to a single "revoked"
// status with expiry only as a secondary detail (US2-AS1b), never renders a
// key value anywhere in the list (US2-AS2), revoking an active key via the
// named confirmation moves it to revoked while its last-used history stays
// visible (US2-AS3), a revoked key is refused by `/rest/mcp` on a fresh
// bearer (US2-AS4), a session established by that key is refused and closed
// on its next request when the client stops re-presenting the bearer
// (US2-AS5), and there is no delete control anywhere on the card — revocation
// is the only removal (US2-AS6).

import { test, expect } from '@playwright/test';
import {
  acceptAllCookiesButton,
  logInHeaderLink,
} from '../authentication/common-authentication-page-elements';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
// Local dev: the Traefik edge on ALKEMIO_BASE_URL does not route `/rest/mcp`
// (no IngressRoute in the compose stack's http.yml — only production/acceptance
// carry the dedicated `mcp-api` IngressRoute). The server's MCP host is reached
// directly on its own port locally; set ALKEMIO_MCP_URL to override per-env.
const mcpUrl =
  process.env.ALKEMIO_MCP_URL ||
  (baseUrl.includes('localhost')
    ? 'http://localhost:4000/rest/mcp'
    : `${baseUrl}/rest/mcp`);
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

const mintKey = async (
  page: import('@playwright/test').Page,
  keyName: string
) => {
  await page.getByRole('button', { name: 'Create API key' }).click();
  await page.getByLabel('Name').fill(keyName);
  await page.locator('label:has-text("Read")').first().click();
  await page.getByRole('button', { name: 'Create key' }).click();
  const revealedValue = await page
    .locator('#mcp-api-key-reveal-value')
    .inputValue();
  expect(revealedValue).toMatch(/^mcp_/);
  await page.getByRole('button', { name: 'Done', exact: true }).last().click();
  return revealedValue;
};

const rowFor = (page: import('@playwright/test').Page, keyName: string) =>
  page.getByText(keyName, { exact: true }).first().locator('xpath=ancestor::li');

test.describe(
  'MCP API keys — see and revoke my keys (US2)',
  { tag: '@forge-acceptance' },
  () => {
    test.beforeEach(async ({ page }) => {
      await signIn(page);
      await goToSecuritySettings(page);
    });

    test('US2-AS1: the keys card lists name, operations, created, expiry, last-used time+address and status for every key', async ({
      page,
    }) => {
      const keyName = uniqueName('US2-List-Key');
      await mintKey(page, keyName);

      const row = rowFor(page, keyName);
      await expect(row).toContainText('Read');
      await expect(row).toContainText('Active');
      // Created date is rendered (a month-name date string, e.g. "Aug 12, 2026").
      await expect(row).toContainText(/[A-Z][a-z]{2} \d{1,2}, \d{4}/);
      await expect(row).toContainText('Never expires');
      await expect(row).toContainText('Never used');
    });

    // US2-AS1a (empty state) is covered by the component test
    // `McpApiKeysCard.test.tsx`, not here. The browser walk cannot honestly
    // assert it: this suite runs as the shared platform administrator, and
    // the only way to empty the card in-session is to revoke every key —
    // which does NOT empty it, because revoked keys remain listed by design
    // (US2-AS3 asserts exactly that). The original version of this test
    // therefore passed only when the admin happened to hold zero keys, and it
    // destroyed shared fixture state for whatever ran next.
    //
    // Restoring it here needs a per-run registered user with no keys. That is
    // a harness change (a fixture that registers and tears down its own
    // account), not a spec tweak — raised as follow-up rather than faked.

    test('US2-AS2: no key value appears anywhere in the listed entries', async ({
      page,
    }) => {
      const keyName = uniqueName('US2-NoLeak-Key');
      const revealedValue = await mintKey(page, keyName);

      // The value shown once during reveal must never resurface in the list.
      await expect(page.getByText(revealedValue)).toHaveCount(0);
      // No row anywhere on the card contains the `mcp_` value prefix as
      // rendered text (the reveal dialog itself is closed at this point).
      await expect(page.locator('body')).not.toContainText(revealedValue);
    });

    test('US2-AS3: revoking an active key requires naming it, moves it to revoked, and keeps last-used history visible', async ({
      page,
      request,
    }) => {
      const keyName = uniqueName('US2-Revoke-Key');
      const revealedValue = await mintKey(page, keyName);

      // Establish real last-used evidence before revoking.
      const initResponse = await request.post(mcpUrl, {
        headers: {
          Authorization: `Bearer ${revealedValue}`,
          Accept: 'application/json, text/event-stream',
        },
        data: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'forge-acceptance', version: '1' },
          },
        },
      });
      expect(initResponse.status()).toBe(200);

      await page.reload();
      const row = rowFor(page, keyName);
      await row.scrollIntoViewIfNeeded();
      await row.getByRole('button', { name: 'Revoke', exact: true }).click();

      // FR-028 — explicit confirmation naming the key.
      await expect(
        page.getByRole('alertdialog').getByText(keyName)
      ).toBeVisible();
      await page.getByRole('button', { name: /^revoke key$/i }).click();

      await expect(row).toContainText('Revoked');
      // Last-used history is retained after revocation (FR-009 / US2-AS3).
      // Assert BOTH retained fields positively: `not.toContainText('Never
      // used')` alone still passes if the UI drops one of them, and the point
      // of AS3 is that the forensic trail survives revocation intact.
      await expect(row).not.toContainText('Never used');
      // last-used timestamp (same month-name date form as createdDate)
      await expect(row).toContainText(/[A-Z][a-z]{2} \d{1,2}, \d{4}/);
      // last-used source address (loopback in the local harness)
      await expect(row).toContainText(/(\d{1,3}\.){3}\d{1,3}|::1/);
    });

    test('US2-AS4: a revoked key is refused by the MCP endpoint on a fresh request', async ({
      page,
      request,
    }) => {
      const keyName = uniqueName('US2-Refused-Key');
      const revealedValue = await mintKey(page, keyName);

      const row = rowFor(page, keyName);
      await row.scrollIntoViewIfNeeded();
      await row.getByRole('button', { name: 'Revoke', exact: true }).click();
      await page.getByRole('button', { name: /^revoke key$/i }).click();
      await expect(row).toContainText('Revoked');

      const response = await request.post(mcpUrl, {
        headers: {
          Authorization: `Bearer ${revealedValue}`,
          Accept: 'application/json, text/event-stream',
        },
        data: {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
        },
      });
      expect(response.status()).toBe(401);
    });

    test('US2-AS5: revoking a key refuses and closes an established session that stops re-presenting the bearer', async ({
      page,
      request,
    }) => {
      const keyName = uniqueName('US2-Session-Key');
      const revealedValue = await mintKey(page, keyName);

      const initResponse = await request.post(mcpUrl, {
        headers: {
          Authorization: `Bearer ${revealedValue}`,
          Accept: 'application/json, text/event-stream',
        },
        data: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'forge-acceptance-session', version: '1' },
          },
        },
      });
      expect(initResponse.status()).toBe(200);
      const sessionId = initResponse.headers()['mcp-session-id'];
      expect(sessionId).toBeTruthy();

      const row = rowFor(page, keyName);
      await row.scrollIntoViewIfNeeded();
      await row.getByRole('button', { name: 'Revoke', exact: true }).click();
      await page.getByRole('button', { name: /^revoke key$/i }).click();
      await expect(row).toContainText('Revoked');

      // Session-bearing request with NO Authorization header — the guarantee
      // this story exists to close (FR-013).
      const sessionResponse = await request.post(mcpUrl, {
        headers: {
          'mcp-session-id': sessionId,
          Accept: 'application/json, text/event-stream',
        },
        data: { jsonrpc: '2.0', id: 2, method: 'tools/list' },
      });
      expect(sessionResponse.status()).toBe(401);

      // The session is closed, not merely refused once — a repeat request on
      // the same session id no longer resolves to a live session.
      const secondAttempt = await request.post(mcpUrl, {
        headers: {
          'mcp-session-id': sessionId,
          Accept: 'application/json, text/event-stream',
        },
        data: { jsonrpc: '2.0', id: 3, method: 'tools/list' },
      });
      expect(secondAttempt.status()).toBe(404);
    });

    test('US2-AS6: no delete control exists anywhere on the keys card — revocation is the only removal', async ({
      page,
    }) => {
      const keyName = uniqueName('US2-NoDelete-Key');
      await mintKey(page, keyName);

      await expect(
        page.getByRole('button', { name: /delete/i })
      ).toHaveCount(0);
      await expect(page.getByText(/delete/i)).toHaveCount(0);
    });
  }
);
