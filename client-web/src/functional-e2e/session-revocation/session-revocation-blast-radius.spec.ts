// plan: docs/qa/6315-session-revocation-test-plan.md (Stream B — SRB-E3,
//       SRB-E4, SRB-N2)
// feature: alkem-io/server#6324 — story server#6315
//
// The three scenarios that are about what revocation must NOT do: it must not
// touch anyone else's session, it must not turn an already-ended session into
// an error, and it must not turn the cookie boundary into an existence oracle.

import { BrowserContext, expect, test } from '@playwright/test';
import {
  logoutMenuItem,
  userMenuAvatar,
} from '../authentication/common-authentication-page-elements';
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
  provisionDisposableUser,
  sessionCookieName,
} from './session-revocation.helpers';

test.describe('Session revocation — blast radius and boundaries (server#6315)', () => {
  // Serial: each scenario provisions and deletes its own disposable subject,
  // and concurrent Kratos registration flows for separate identities still
  // contend on the shared MailSlurper inbox used for email verification.
  test.describe.configure({ mode: 'serial' });

  test('SRB-E3 — blast radius: a second, unrelated user is untouched', async ({
    browser,
  }) => {
    // Two Kratos registrations + two full SPA logins.
    test.setTimeout(300_000);

    let victimSession: LoggedInSession | undefined;
    let bystanderSession: LoggedInSession | undefined;
    let victim: DisposableUser | undefined;
    let bystander: DisposableUser | undefined;

    try {
      victim = await provisionDisposableUser('victim');
      bystander = await provisionDisposableUser('bystander');

      victimSession = await openLoggedInSession(browser, victim.email);
      bystanderSession = await openLoggedInSession(browser, bystander.email);

      // Both sessions are real before the deletion.
      expect((await probeIdTokenHint(victimSession.context)).status).toBe(200);
      expect((await probeIdTokenHint(bystanderSession.context)).status).toBe(
        200
      );

      const deletion = await deleteUserAsGlobalAdmin(victim.userId, {
        deleteIdentity: false,
      });
      expect(deletion.body?.data?.deleteUser?.id).toBe(victim.userId);

      // The victim is gone — asserted on both paths. `id-token-hint` observes
      // the per-session tombstone (its payload's `id_token` is blanked);
      // only the GraphQL gate runs `CookieSessionStrategy`, and therefore only
      // it observes the subject-level revocation marker. Both must refuse.
      expect((await probeIdTokenHint(victimSession.context)).status).toBe(401);
      expect(
        (await probePrivateGraphql(victimSession.context, '{ me { id } }'))
          .status
      ).toBe(401);

      // …and the bystander is not disturbed in any way. FR-005/SC-007: the
      // blast radius is exactly one account. The index is read per-subject, so
      // a keyspace-wide sweep would show up right here.
      const bystanderHint = await probeIdTokenHint(bystanderSession.context);
      expect(bystanderHint.status).toBe(200);
      expect(bystanderHint.json?.id_token).toBeTruthy();

      const bystanderMe = await probePrivateGraphql(
        bystanderSession.context,
        '{ me { user { id } } }'
      );
      expect(bystanderMe.status).toBe(200);
      expect(bystanderMe.json?.errors).toBeUndefined();
      expect(bystanderMe.json?.data?.me?.user?.id).toBe(bystander.userId);
    } finally {
      await closeSessions(victimSession, bystanderSession);
      await deleteUserQuietly(victim?.userId);
      await deleteUserQuietly(bystander?.userId);
    }
  });

  test('SRB-E4 — an already-signed-out session: deletion is still a clean no-op', async ({
    browser,
  }) => {
    test.setTimeout(300_000);

    let session: LoggedInSession | undefined;
    let user: DisposableUser | undefined;

    try {
      user = await provisionDisposableUser('signedout');
      session = await openLoggedInSession(browser, user.email);
      expect((await probeIdTokenHint(session.context)).status).toBe(200);

      await signOutThroughTheApp(session);

      // Precondition for the scenario: the sid really is gone (destroy()'d and
      // pruned from the per-subject index), so the deletion below is walking
      // an index entry that no longer resolves — the `already_absent` branch.
      expect((await probeIdTokenHint(session.context)).status).toBe(401);

      const deletion = await deleteUserAsGlobalAdmin(user.userId, {
        deleteIdentity: false,
      });
      expect(deletion.status).toBe(200);
      expect(deletion.body?.errors).toBeUndefined();
      expect(deletion.body?.data?.deleteUser?.id).toBe(user.userId);

      // Still refused, and — the point of FR-015 — no new failure mode
      // surfaced from the revocation path on a session that had already ended.
      expect((await probeIdTokenHint(session.context)).status).toBe(401);

      // On the GraphQL path both outcomes are legitimate here and the
      // distinction is not under this scenario's control: a fully destroy()'d
      // session leaves no Redis key at all (state (a) → anonymous 200), while
      // a lingering tombstone yields 401. What must never happen is the
      // revocation path turning an idempotent no-op into a server error.
      const me = await probePrivateGraphql(session.context, '{ me { id } }');
      expect(me.status).toBeLessThan(500);
      expect([200, 401]).toContain(me.status);
    } finally {
      await closeSessions(session);
      await deleteUserQuietly(user?.userId);
    }
  });

  test('SRB-N2 — no existence oracle at the cookie boundary', async ({
    browser,
  }) => {
    let noCookieContext: BrowserContext | undefined;
    let fabricatedCookieContext: BrowserContext | undefined;

    try {
      noCookieContext = await browser.newContext();
      fabricatedCookieContext = await browser.newContext();

      // A plausible but never-issued sid. express-session cannot verify it, so
      // the strategy resolves no payload — `cookie-session.strategy.ts:95`
      // (`if (!payload) return null`) deliberately falls through to anonymous
      // rather than 401.
      await fabricatedCookieContext.addCookies([
        {
          name: sessionCookieName,
          value: 's%3A00000000-0000-4000-8000-00000000dead.notavalidsignature',
          url: baseUrl,
        },
      ]);

      const withoutCookie = await probePrivateGraphql(
        noCookieContext,
        '{ me { id } }'
      );
      const withFabricatedCookie = await probePrivateGraphql(
        fabricatedCookieContext,
        '{ me { id } }'
      );

      expect(withoutCookie.status).toBe(200);
      expect(withoutCookie.json?.errors).toBeUndefined();
      expect(withoutCookie.json?.data?.me?.id).toBe('me-');

      // Byte-identical: nothing in the response lets a caller learn whether a
      // given sid ever existed.
      expect(withFabricatedCookie.status).toBe(withoutCookie.status);
      expect(withFabricatedCookie.text).toBe(withoutCookie.text);

      // Read this against SRB-G1's 401. The pair IS the security property:
      // ENDED sessions are loudly refused, UNKNOWN sessions are silently
      // anonymous. Assert both or you have asserted neither.
    } finally {
      await noCookieContext?.close().catch(() => {});
      await fabricatedCookieContext?.close().catch(() => {});
    }
  });
});

/**
 * Sign out through the SPA, falling back to the BFF logout route.
 *
 * The UI affordance is the honest path — it is what a person does — but it
 * depends on the CRD header's avatar menu staying drivable. `GET
 * /api/auth/oidc/logout` (oidc.controller.ts:635) reaches the same idempotent
 * teardown, so a markup change degrades this scenario's setup rather than
 * failing it for an unrelated reason.
 */
const signOutThroughTheApp = async (
  session: LoggedInSession
): Promise<void> => {
  const { page, context } = session;
  try {
    await page.goto(`${baseUrl}/home`);
    await userMenuAvatar(page).click({ timeout: 15_000 });
    await logoutMenuItem(page).click({ timeout: 15_000 });
    await expect(
      page.getByRole('link', { name: 'Log in', exact: true })
    ).toBeVisible({ timeout: 15_000 });
  } catch {
    await context.request.get(`${baseUrl}/api/auth/oidc/logout`, {
      failOnStatusCode: false,
    });
  }
};
