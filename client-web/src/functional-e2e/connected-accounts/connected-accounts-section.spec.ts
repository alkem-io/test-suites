// spec: workspace#051-cleverbase-account-linking — Connected Accounts section
// Cases: CA-01 (G1-section-renders-true-state), CA-02 (G6-password-passkey-rows-route),
//        CA-05 (R6-password-error-stays-in-password-card + G1).
//
// Live dev stack — no Kratos or GraphQL mocking in this file. Persona:
// qa.user@alkem.io (credential-mutated by no client-web spec; its harness
// password is NEVER changed here — CA-05 submits a value Kratos rejects).
// CA-05 additionally requires a PRIVILEGED-fresh Kratos session (see the
// privilegedTest instance below), so it lives in its own describe block.
// All URLs are resolved at runtime from the persona's own profile URL, never
// from a hardcoded /user/<slug> path.

import { expect } from '@playwright/test';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';
import {
  COPY,
  PROVIDERS,
  confirmNewPasswordField,
  connectButton,
  credentialRow,
  newPasswordField,
  passkeyCard,
  passwordCard,
  passwordCardError,
  passwordSaveButton,
  providerRow,
  resolveOwnSecurityUrl,
  sectionCard,
} from './connected-accounts.pages';

const test = createPersonaTest('qa.user@alkem.io');

// CA-05 submits a password change — a Kratos PRIVILEGED operation, honoured
// only while `now - authenticated_at < privileged_session_max_age` (15m in
// dev-orchestration's 01-base-kratos-values.yml). A cached persona session
// that is live but authenticated >15m ago makes the submit redirect to a
// re-authentication screen instead of returning the node-level validation
// error this test asserts on. So CA-05 uses a session proven (via whoami's
// authenticated_at) to be at most 10 minutes old — re-minted by the fixture
// otherwise — leaving ample margin over the test's own 60s budget.
const privilegedTest = createPersonaTest('qa.user@alkem.io', {
  maxSessionAgeSeconds: 600,
});

test.describe('Connected Accounts — section renders true state (owner, password-only)', () => {
  test('CA-01: three provider rows Not connected + Connect, read-only credential rows, no identity leakage', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const securityUrl = await resolveOwnSecurityUrl(page);
    await page.goto(securityUrl);

    await expect(page.getByRole('heading', { name: COPY.sectionTitle, exact: true })).toBeVisible({
      timeout: 15_000,
    });
    // The neighbouring cards render too (h4 CardTitles): Change Password and
    // the passkey card — whose title is 'Security', not 'Passkeys'.
    await expect(
      passwordCard(page).getByRole('heading', { name: 'Change password', exact: true })
    ).toBeVisible();
    await expect(passkeyCard(page).getByRole('heading', { name: 'Security', exact: true })).toBeVisible();

    // Every configured provider: 'Not connected' (exact — never /connected/i,
    // which also matches 'Connected') plus an enabled Connect button.
    for (const provider of PROVIDERS) {
      const row = providerRow(page, provider);
      await expect(row.getByText(COPY.notConnected, { exact: true })).toBeVisible();
      await expect(connectButton(page, provider)).toBeVisible();
    }

    // Password credential row: read-only state + an <a> to the password card.
    const passwordRow = credentialRow(page, 'Password');
    await expect(passwordRow.getByText('Password', { exact: true })).toBeVisible();
    await expect(passwordRow.getByText('Set', { exact: true })).toBeVisible();
    await expect(passwordRow.getByRole('link', { name: 'Change password', exact: true })).toBeVisible();

    // Passkey credential row: read-only state + an <a> to the passkeys card.
    const passkeyRow = credentialRow(page, 'Passkey');
    await expect(passkeyRow.getByText('Passkey', { exact: true })).toBeVisible();
    await expect(passkeyRow.getByRole('link', { name: 'Manage passkeys', exact: true })).toBeVisible();

    // Credential rows offer NO inline mutation — they render only a link.
    await expect(passwordRow.getByRole('button')).toHaveCount(0);
    await expect(passkeyRow.getByRole('button')).toHaveCount(0);

    // PII guard: no e-mail address / username surfaces in any row.
    await expect(sectionCard(page).getByRole('listitem').filter({ hasText: '@' })).toHaveCount(0);
  });

  test('CA-02: credential rows route via in-page anchors to the password/passkey cards, no inline mutation', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const securityUrl = await resolveOwnSecurityUrl(page);
    await page.goto(securityUrl);
    await expect(page.getByRole('heading', { name: COPY.sectionTitle, exact: true })).toBeVisible({
      timeout: 15_000,
    });

    // 'Change password' routes to the #password anchor — the URL stays under
    // /settings/security (an in-page anchor scroll, not a navigation): the
    // answer the acceptance walk asks for.
    await credentialRow(page, 'Password').getByRole('link', { name: 'Change password', exact: true }).click();
    await expect(page).toHaveURL(/\/settings\/security#password$/);
    await expect(
      passwordCard(page).getByRole('heading', { name: 'Change password', exact: true })
    ).toBeVisible();

    // 'Manage passkeys' routes to the #passkeys anchor. The passkey card's
    // heading is 'Security' (user.security.title), not 'Passkeys'.
    await credentialRow(page, 'Passkey').getByRole('link', { name: 'Manage passkeys', exact: true }).click();
    await expect(page).toHaveURL(/\/settings\/security#passkeys$/);
    await expect(passkeyCard(page).getByRole('heading', { name: 'Security', exact: true })).toBeVisible();

    // Neither credential row carries any button — no inline add/change/remove.
    await expect(credentialRow(page, 'Password').getByRole('button')).toHaveCount(0);
    await expect(credentialRow(page, 'Passkey').getByRole('button')).toHaveCount(0);
  });
});

privilegedTest.describe('Connected Accounts — failed password change (privileged Kratos flow)', () => {
  privilegedTest('CA-05: a failed password change renders its error only inside the Change Password card', async ({
    page,
  }) => {
    privilegedTest.setTimeout(60_000);
    const securityUrl = await resolveOwnSecurityUrl(page);
    await page.goto(securityUrl);
    await expect(page.getByRole('heading', { name: COPY.sectionTitle, exact: true })).toBeVisible({
      timeout: 15_000,
    });

    // 'abc' is below Kratos's minimum length. Fill BOTH fields with the same
    // value so the client-side mismatch guard passes and Kratos is actually
    // hit. The shared harness password is never mutated — Kratos rejects the
    // value, which is the whole point (parallel-safety).
    await newPasswordField(page).fill('abc');
    await confirmNewPasswordField(page).fill('abc');
    await passwordSaveButton(page).click();

    // The native POST round-trips through Kratos (error → /settings?flow= →
    // resume redirect back here). Wait on the resulting UI state: an error
    // ANCHORED INSIDE #password via its rendering mechanism — the field's
    // aria-invalid/error text (node-level) or a role='alert' message
    // (flow-level). Copy-free by design: the exact Kratos wording varies by
    // version, and a /password/i text match would vacuously hit the card's
    // own static labels. The containment, not the wording, is the contract.
    await expect(passwordCardError(page)).toBeVisible({ timeout: 20_000 });

    // Nothing echoed into Connected Accounts…
    await expect(sectionCard(page).getByRole('alert')).toHaveCount(0);
    await expect(sectionCard(page).getByText(/couldn't|failed|error/i)).toHaveCount(0);
    // …nor into the Passkeys card.
    await expect(passkeyCard(page).getByRole('alert')).toHaveCount(0);

    // Provider state unchanged: retry still offered.
    await expect(providerRow(page, 'LinkedIn').getByText(COPY.notConnected, { exact: true })).toBeVisible();
    await expect(connectButton(page, 'LinkedIn')).toBeVisible();
  });
});
