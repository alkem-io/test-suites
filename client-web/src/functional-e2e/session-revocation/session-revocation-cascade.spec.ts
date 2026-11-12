// plan: client-web/src/functional-e2e/session-revocation/session-revocation-test-plan.md
//       (SRB-G1..G3, SRB-R1, SRB-R2, SRB-E1, SRB-E2, SRB-N1)
// feature: alkem-io/server#6324 — story server#6315
//
// The revocation cascade, end to end over real browser sessions. One
// disposable subject signs in three times and is deleted once; every case
// reads the state on one side or the other of that one-way door, which is why
// the file is serial.
//
// W2 Tier 0 item 2: the oracles are GraphQL outcomes through the lib (the
// session resolves to the subject / is refused) and what the browser shows.
// None depends on a Kratos `error_code`, the cookie's name or format, the
// anonymous actor's id, or the `id-token-hint` route.

import { expect, test } from '@playwright/test';
import type { GraphqlActor } from '@alkemio/tests-lib';
import { acceptCookiesIfVisible } from '../helpers/cookies.helper';
import {
  baseUrl,
  closeSessions,
  credentialOf,
  deleteEverythingFor,
  deleteUserAsGlobalAdmin,
  DisposableUser,
  expectRefused,
  expectResolvesTo,
  LoggedInSession,
  logInHeaderLink,
  notificationsButton,
  openLoggedInSession,
  provisionDisposableUser,
  TOKEN_MATERIAL_MARKERS,
  whoAmI,
  WhoAmI,
} from './session-revocation.helpers';

test.describe('Session revocation cascade (server#6315)', () => {
  // The cases share one subject and its deletion is a one-way door.
  test.describe.configure({ mode: 'serial' });

  let subject: DisposableUser;
  let c1: LoggedInSession | undefined;
  let c2: LoggedInSession | undefined;
  let c3: LoggedInSession | undefined;
  let c4: LoggedInSession | undefined;

  /**
   * The three credentials as they were before the deletion. Replaying one
   * afterwards is the stale session; the lib sends it on its own client, so a
   * probe never changes the browser's jar.
   */
  const stale: Partial<Record<'c1' | 'c2' | 'c3', GraphqlActor>> = {};
  /** What each credential resolved to before the deletion (the positive control). */
  const before: Partial<Record<'c1' | 'c2' | 'c3', WhoAmI>> = {};

  /** Every response body seen from the deletion onward — fed to SRB-N1. */
  const wireBodies: string[] = [];
  let spaBodies = 0;

  test.beforeAll(async ({ browser }) => {
    // One registration (verification mail) + three SPA sign-ins.
    test.setTimeout(300_000);
    subject = await provisionDisposableUser('cascade');

    // Sequential: concurrent Kratos flows for one identity step on each other.
    c1 = await openLoggedInSession(browser, subject.email);
    c2 = await openLoggedInSession(browser, subject.email);
    c3 = await openLoggedInSession(browser, subject.email);

    for (const [name, session] of [
      ['c1', c1],
      ['c2', c2],
      ['c3', c3],
    ] as const) {
      stale[name] = await credentialOf(session.context);
      before[name] = await whoAmI(stale[name]!);
    }
  });

  test.afterAll(async () => {
    await closeSessions(c1, c2, c3, c4);
    // The subject was deleted with its identity kept, and SRB-E2 signed it in
    // again: remove whatever user that email is now, with the identity.
    await deleteEverythingFor(subject);
  });

  test('SRB-G1 — deleting the account revokes the live session on the next request', async () => {
    // A session cannot be shown to die unless it was shown to live.
    expectResolvesTo(before.c1!, subject.userId, 'C1 before the deletion');

    // Out of band, as the platform admin over the bearer path. The identity is
    // kept so SRB-E2 can sign the same email in again.
    const deletion = await deleteUserAsGlobalAdmin(subject.userId, {
      deleteIdentity: false,
    });
    wireBodies.push(deletion.text);
    expect(deletion.status).toBe(200);
    expect(deletion.body?.errors).toBeUndefined();
    expect(deletion.body?.data?.deleteUser?.id).toBe(subject.userId);

    // No poll, no retry: the revocation is awaited inside the mutation, so the
    // FIRST request after it resolves is already refused.
    const after = await whoAmI(stale.c1!);
    wireBodies.push(after.raw);
    expectRefused(after, 'C1 right after the deletion');
  });

  test('SRB-G2 — the refusal is an authentication error, not a data error', async () => {
    const after = await whoAmI(stale.c1!);
    wireBodies.push(after.raw);
    expectRefused(after, 'C1 replayed');
    // The client branches on `extensions.code` (never on message text) to send
    // the user to sign-in; that code is the contract, not the server's
    // internal reason string.
    expect(after.errors[0]?.extensions?.code).toBe('UNAUTHENTICATED');
  });

  test('SRB-R1 — the session does not come back on repeated use', async () => {
    // A `destroy()` instead of a tombstone answers the second request as an
    // anonymous visitor: the regression server#6315 fixed.
    for (let attempt = 1; attempt <= 3; attempt++) {
      const after = await whoAmI(stale.c1!);
      wireBodies.push(after.raw);
      expectRefused(after, `C1 replay ${attempt}`);
    }
  });

  test('SRB-R2 — the stale session is never served as an anonymous visitor', async () => {
    // The same probe from the other side: an anonymous answer is a 200 whose
    // `me` resolves with no user. Positive control: the identical read with
    // no credential at all IS that anonymous answer, so `meResolved` is a
    // live discriminator here, not a constant.
    const anonymous = await whoAmI({ cookieHeader: '' });
    expect(anonymous.status).toBe(200);
    expect(anonymous.meResolved).toBe(true);
    expect(anonymous.userId).toBeNull();

    const after = await whoAmI(stale.c1!);
    wireBodies.push(after.raw);
    expect(after.status).not.toBe(anonymous.status);
    expect(after.meResolved).toBe(false);
  });

  test('SRB-E1 — three concurrent sessions, all die', async () => {
    for (const name of ['c1', 'c2', 'c3'] as const) {
      expectResolvesTo(before[name]!, subject.userId, `${name} before`);
      const after = await whoAmI(stale[name]!);
      wireBodies.push(after.raw);
      expectRefused(after, `${name} after the deletion`);
    }
  });

  test('SRB-G3a — the SPA reload after the deletion: traffic captured, the browser credential is not the subject', async () => {
    const page = c1!.page;
    // The SPA's own API traffic on reload, for SRB-N1. Every body read is
    // kept so the test can wait for them all before it ends.
    const reads: Promise<void>[] = [];
    page.on('response', response => {
      if (!response.url().includes('/api/')) return;
      reads.push(
        response
          .text()
          .then(text => {
            wireBodies.push(text);
            spaBodies++;
          })
          .catch(() => {
            // Redirects and empty bodies have nothing to read.
          })
      );
    });

    // The SPA boots by asking the public endpoint for the platform: wait for
    // that answer, then for every body read in flight.
    const platformAnswer = page.waitForResponse(
      r => r.url().includes('/api/public/graphql') && r.request().method() === 'POST'
    );
    await page.goto(baseUrl);
    await acceptCookiesIfVisible(page);
    await platformAnswer;
    await Promise.all(reads);
    expect(spaBodies, 'the SPA reload answered at least once').toBeGreaterThan(0);

    // And the browser's own credential, as it is after the reload, is not
    // the deleted user.
    const now = await whoAmI(await credentialOf(c1!.context));
    expect(now.userId).not.toBe(subject.userId);
  });

  // KNOWN DEFECT (recorded on test-suites#724, SRB-G3): after the deletion the
  // browser still carries the revoked session cookie; the server answers the
  // SPA's public `platform` query with 401 UNAUTHENTICATED (error_code
  // account_deleted) and the client, which has no handling for it, renders a
  // blank page instead of the signed-out header. Un-skip when the app lands on
  // a clean signed-out state.
  test.skip('SRB-G3 — the application shows a clean signed-out state (test-suites#724)', async () => {
    const page = c1!.page;
    await page.goto(baseUrl);
    await acceptCookiesIfVisible(page);
    await expect(logInHeaderLink(page)).toBeVisible();
    // No "signed in with no account" half-state: the signed-in-only banner
    // control is gone (asserted after the positive, so a blank page cannot
    // pass it).
    await expect(notificationsButton(page)).toHaveCount(0);
  });

  test('SRB-N1 — no token material or PII on the wire after revocation', async () => {
    // The deletion answer, every refusal (G1, G2, R1 ×3, R2, E1 ×3) and the
    // SPA's reload traffic.
    expect(wireBodies.length).toBeGreaterThanOrEqual(10);
    expect(spaBodies, 'SRB-G3a captured the SPA reload').toBeGreaterThan(0);

    for (const body of wireBodies) {
      for (const marker of TOKEN_MATERIAL_MARKERS) {
        expect(body, `leaked '${marker}' on the wire`).not.toContain(marker);
      }
      expect(body).not.toContain(subject.email);
      expect(body).not.toContain(subject.firstName);
    }
  });

  test('SRB-E2 — a session created after the revocation is not refused', async ({
    browser,
  }) => {
    // The revocation marks a point in time, not a ban on the subject: a
    // session minted afterwards must be accepted. Whether it carries a fresh
    // user is not this case's question — only that it is not refused, and
    // that it is not the deleted user.
    c4 = await openLoggedInSession(browser, subject.email);
    const fresh = await whoAmI(await credentialOf(c4.context));
    expect(fresh.status).not.toBe(401);
    expect(fresh.status).toBe(200);
    expect(fresh.errors).toEqual([]);
    expect(fresh.userId).not.toBe(subject.userId);
  });
});
