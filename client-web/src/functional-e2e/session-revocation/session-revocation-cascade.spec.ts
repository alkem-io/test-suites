// plan: docs/qa/6315-session-revocation-test-plan.md (Stream B — SRB-G1..G3,
//       SRB-R1, SRB-R2, SRB-E1, SRB-E2, SRB-N1)
// feature: alkem-io/server#6324 — story server#6315
//
// The revocation cascade, observed end to end over a real `alkemio_session`.
// One disposable subject is logged in three times and then deleted exactly
// once; every scenario in this file reads the state on one side or the other
// of that single one-way door, which is why the file is serial.

import { expect, test } from '@playwright/test';
import { logInHeaderLink } from '../authentication/common-authentication-page-elements';
import { acceptCookiesIfVisible } from '../helpers/cookies.helper';
import {
  baseUrl,
  closeSessions,
  DisposableUser,
  deleteUserAsGlobalAdmin,
  deleteUserQuietly,
  LoggedInSession,
  openLoggedInSession,
  probeIdTokenHint,
  probePrivateGraphql,
  ProbeResult,
  provisionDisposableUser,
  TOKEN_MATERIAL_MARKERS,
} from './session-revocation.helpers';

test.describe('Session revocation cascade over the BFF cookie (server#6315)', () => {
  // Serial: the scenarios share one disposable subject and its deletion is a
  // one-way door. Running them in parallel would race the door.
  test.describe.configure({ mode: 'serial' });

  let subject: DisposableUser;
  let c1: LoggedInSession | undefined;
  let c2: LoggedInSession | undefined;
  let c3: LoggedInSession | undefined;
  let c4: LoggedInSession | undefined;

  /**
   * Pre-deletion `id-token-hint` reads for all three sessions.
   *
   * Captured in `beforeAll` rather than inside the tests because the deletion
   * happens once, in SRB-G1: by the time SRB-E1 runs, "these sessions were
   * alive beforehand" is no longer observable. Asserting the captured values
   * keeps the precondition a real assertion instead of an assumption.
   */
  const preDeletionHints: Record<'c1' | 'c2' | 'c3', ProbeResult | undefined> =
    {
      c1: undefined,
      c2: undefined,
      c3: undefined,
    };

  /** Every response body seen from the deletion onward — fed to SRB-N1. */
  const capturedWireBodies: string[] = [];

  test.beforeAll(async ({ browser }) => {
    // Kratos registration + email verification + three full SPA logins. Far
    // beyond the default 30s hook budget.
    test.setTimeout(300_000);

    subject = await provisionDisposableUser('cascade');

    // Three independent contexts → three distinct sids indexed under one sub
    // (SRB-E1). Sequential logins: concurrent Kratos flows for one identity
    // step on each other.
    c1 = await openLoggedInSession(browser, subject.email);
    c2 = await openLoggedInSession(browser, subject.email);
    c3 = await openLoggedInSession(browser, subject.email);

    preDeletionHints.c1 = await probeIdTokenHint(c1.context);
    preDeletionHints.c2 = await probeIdTokenHint(c2.context);
    preDeletionHints.c3 = await probeIdTokenHint(c3.context);
  });

  test.afterAll(async () => {
    // Unconditional: a leaked context holds a live session.
    await closeSessions(c1, c2, c3, c4);
    // No-op when the subject is already gone (the normal case). The Kratos
    // identity outlives the run by design — the email is unique per run, so it
    // cannot collide, and SRB-E2 needs it alive.
    await deleteUserQuietly(subject?.userId);
  });

  test('SRB-G1 — deleting the account revokes the live BFF session on the next request', async () => {
    // Precondition, asserted: C1 really did hold a session before the
    // deletion. Claiming a session "died" without first proving it lived is
    // the classic vacuous pass.
    expect(preDeletionHints.c1?.status).toBe(200);
    expect(preDeletionHints.c1?.json?.id_token).toBeTruthy();

    // Out of band, as global admin over the bearer path. `deleteIdentity:
    // false` so the Kratos identity survives for SRB-E2.
    const deletion = await deleteUserAsGlobalAdmin(subject.userId, {
      deleteIdentity: false,
    });
    capturedWireBodies.push(deletion.text);
    expect(deletion.status).toBe(200);
    expect(deletion.body?.errors).toBeUndefined();
    expect(deletion.body?.data?.deleteUser?.id).toBe(subject.userId);

    // No polling, no retry, no sleep. SC-002 is not a wall-clock threshold —
    // a threshold would only generate flake. The property FR-026a's
    // awaited-in-line design actually guarantees is stronger and
    // deterministic: the FIRST request after the mutation resolves is already
    // refused.
    const hint = await probeIdTokenHint(c1!.context);
    capturedWireBodies.push(hint.text);
    expect(hint.status).toBe(401);
    expect(hint.text).toBe('{"error":"unauthenticated"}');
  });

  test('SRB-G2 — the GraphQL gate refuses too, with the right code', async () => {
    const result = await probePrivateGraphql(c1!.context, '{ me { id } }');
    capturedWireBodies.push(result.text);

    // Wire-level 401, not just an errors envelope inside an HTTP 200:
    // AuthInterceptor maps CookieSessionInvalidError to AuthenticationException,
    // whose extensions.http.status makes Apollo emit the real status.
    expect(result.status).toBe(401);

    const firstError = result.json?.errors?.[0];
    expect(firstError?.extensions?.code).toBe('UNAUTHENTICATED');
    // The SET, never one literal. The per-session tombstone branch
    // (`account_deleted`) runs before the subject-marker branch
    // (`subject_revoked`), and which one wins depends on whether an in-flight
    // request rewrote the session key — the very race the marker exists to
    // cover. Pinning one value would make this spec flake on the feature's
    // own reason for existing.
    expect(['account_deleted', 'subject_revoked']).toContain(
      firstError?.extensions?.error_code
    );
  });

  test('SRB-R1 — the session must not survive, and must not silently fall through', async () => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const hint = await probeIdTokenHint(c1!.context);
      capturedWireBodies.push(hint.text);

      // The failure mode being fenced is `destroy()` instead of
      // `markTerminated()`: that yields a silent anonymous 200 and reproduces
      // #6315 in a new costume. Assert the rejection explicitly — a non-200 is
      // not enough, and 200 is called out on its own so a regression reads
      // unambiguously in the report.
      expect(
        hint.status,
        `attempt ${attempt} must not be a silent 200`
      ).not.toBe(200);
      expect(hint.status, `attempt ${attempt}`).toBe(401);

      if (attempt < 3) await c1!.page.waitForTimeout(2000);
    }
  });

  test('SRB-R2 — no anonymous 200 on the GraphQL path either', async () => {
    const result = await probePrivateGraphql(c1!.context, '{ me { id } }');
    capturedWireBodies.push(result.text);

    expect(result.status).toBe(401);
    expect(Array.isArray(result.json?.errors)).toBe(true);
    expect(result.json.errors.length).toBeGreaterThan(0);

    // Spelled out rather than implied by the status: a `destroy()`-based
    // implementation returns exactly this, and it is what would make the
    // feature look fixed while being broken.
    expect(result.json?.data?.me?.id).not.toBe('me-');
  });

  test('SRB-E1 — three concurrent sessions, all die', async () => {
    // All three were alive before the single deletion.
    expect(preDeletionHints.c1?.status).toBe(200);
    expect(preDeletionHints.c2?.status).toBe(200);
    expect(preDeletionHints.c3?.status).toBe(200);

    // 100% of that account's sessions, not just the one that happened to be
    // asserted first.
    for (const [name, session] of [
      ['C1', c1!],
      ['C2', c2!],
      ['C3', c3!],
    ] as const) {
      const hint = await probeIdTokenHint(session.context);
      capturedWireBodies.push(hint.text);
      expect(hint.status, `${name} survived the revocation`).toBe(401);
    }
  });

  test('SRB-G3 — the application renders a clean signed-out state', async () => {
    test.setTimeout(60_000);

    const page = c1!.page;
    // Collect the reload's API traffic for SRB-N1 — this is the only scenario
    // that exercises the SPA's own requests rather than direct probes.
    page.on('response', response => {
      if (!response.url().includes('/api/')) return;
      response
        .text()
        .then(text => capturedWireBodies.push(text))
        .catch(() => {
          // Redirects and empty bodies have nothing to read; not a failure.
        });
    });

    await page.goto(baseUrl);
    await acceptCookiesIfVisible(page);

    // Same locator the login helper drives, so a CRD markup change breaks one
    // shared expectation rather than two.
    await expect(logInHeaderLink(page)).toBeVisible({ timeout: 15_000 });

    // And no "signed in with no account" half-state: the authenticated shell's
    // user menu must be gone, not merely empty.
    await expect(
      page.getByRole('menuitem', { name: 'Log out', exact: true })
    ).toHaveCount(0);
  });

  test('SRB-N1 — no token material anywhere on the wire after revocation', async () => {
    // Everything C1 received from the deletion onward: the mutation response,
    // the id-token-hint 401s, the GraphQL 401 envelopes, and the SPA reload's
    // API calls.
    expect(capturedWireBodies.length).toBeGreaterThan(0);

    for (const body of capturedWireBodies) {
      for (const marker of TOKEN_MATERIAL_MARKERS) {
        expect(body, `leaked '${marker}' on the wire`).not.toContain(marker);
      }
      // PII half of the tombstone rationale (GDPR Art. 17), asserted where it
      // is observable.
      expect(body).not.toContain(subject.email);
      expect(body).not.toContain(subject.firstName);
    }
  });

  test('SRB-E2 — a session created after the revocation still works', async ({
    browser,
  }) => {
    // A fresh SPA login is a full Kratos + OIDC round trip.
    test.setTimeout(180_000);

    // The subject marker holds a `revoked_at` TIMESTAMP, not a ban flag: the
    // strategy refuses a session only when `revoked_at >= payload.created_at`.
    // A session minted afterwards is therefore unaffected.
    c4 = await openLoggedInSession(browser, subject.email);
    const hint = await probeIdTokenHint(c4.context);

    // Deliberately NOT an assertion about being "fully signed in". Deletion
    // also runs `clearIdentityActorMetadata`, so the re-minted session can
    // carry `alkemio_actor_id: null` and resolve to no actor. The property
    // under test is narrower and exact: the request is NOT REFUSED.
    expect(hint.status).toBe(200);

    // …and the same over the GraphQL gate, which is the probe that actually
    // reaches the marker. `id-token-hint` reads `req.session` directly and
    // never calls `getSubRevokedAt`; only `CookieSessionStrategy` does. So
    // this line — not the one above — is what proves `revoked_at` is a
    // timestamp compared against `created_at` rather than a permanent ban on
    // the subject.
    const me = await probePrivateGraphql(c4.context, '{ me { id } }');
    expect(me.status).not.toBe(401);
    expect(me.status).toBe(200);
  });
});
