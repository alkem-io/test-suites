// plan: client-web/src/functional-e2e/session-revocation/session-revocation-test-plan.md
//       (SRB-E3, SRB-E4, SRB-N2)
// feature: alkem-io/server#6324 — story server#6315
//
// What revocation must NOT do: touch anyone else's session, turn an
// already-ended session into an error, or make the session boundary an
// existence oracle.
//
// W2 Tier 0 item 2: GraphQL outcomes through the lib plus what the browser
// shows. The session cookie's name is derived from a real sign-in (SRB-N2),
// never hard-coded, and no anonymous-actor id is asserted.

import { expect, test } from '@playwright/test';
import {
  logoutMenuItem,
  userMenuAvatar,
} from '../authentication/common-authentication-page-elements';
import {
  baseUrl,
  closeSessions,
  credentialOf,
  deleteUserAsGlobalAdmin,
  deleteUserIfPresent,
  DisposableUser,
  expectNotTheUser,
  expectRefused,
  expectResolvesTo,
  LoggedInSession,
  logInHeaderLink,
  notificationsButton,
  openLoggedInSession,
  provisionDisposableUser,
  sessionCookies,
  whoAmI,
} from './session-revocation.helpers';

test.describe('Session revocation — blast radius and boundaries (server#6315)', () => {
  // One fixture for the file; E3 and E4 each delete their own subject.
  test.describe.configure({ mode: 'serial' });

  let victim: DisposableUser | undefined;
  let bystander: DisposableUser | undefined;
  let signedOut: DisposableUser | undefined;
  let victimSession: LoggedInSession | undefined;
  let bystanderSession: LoggedInSession | undefined;
  let signedOutSession: LoggedInSession | undefined;

  test.beforeAll(async ({ browser }) => {
    // Three registrations (verification mail each) + three SPA sign-ins.
    test.setTimeout(300_000);
    victim = await provisionDisposableUser('victim');
    bystander = await provisionDisposableUser('bystander');
    signedOut = await provisionDisposableUser('signedout');
    victimSession = await openLoggedInSession(browser, victim.email);
    bystanderSession = await openLoggedInSession(browser, bystander.email);
    signedOutSession = await openLoggedInSession(browser, signedOut.email);
  });

  test.afterAll(async () => {
    await closeSessions(victimSession, bystanderSession, signedOutSession);
    // No-ops for the two subjects the walks deleted; fails loudly otherwise.
    await deleteUserIfPresent(victim?.userId);
    await deleteUserIfPresent(bystander?.userId);
    await deleteUserIfPresent(signedOut?.userId);
  });

  test('SRB-E3 — blast radius: a second, unrelated user is untouched', async () => {
    const victimCredential = await credentialOf(victimSession!.context);
    const bystanderCredential = await credentialOf(bystanderSession!.context);

    // Both sessions are real before the deletion.
    expectResolvesTo(
      await whoAmI(victimCredential),
      victim!.userId,
      'victim before'
    );
    expectResolvesTo(
      await whoAmI(bystanderCredential),
      bystander!.userId,
      'bystander before'
    );

    const deletion = await deleteUserAsGlobalAdmin(victim!.userId, {
      deleteIdentity: true,
    });
    expect(deletion.body?.errors).toBeUndefined();
    expect(deletion.body?.data?.deleteUser?.id).toBe(victim!.userId);

    // The victim's session is refused…
    expectRefused(await whoAmI(victimCredential), 'victim after');

    // …and the bystander's is exactly as it was: the blast radius is one
    // account. Over the API, and in the bystander's own browser after a
    // reload.
    expectResolvesTo(
      await whoAmI(bystanderCredential),
      bystander!.userId,
      'bystander after'
    );
    await bystanderSession!.page.reload();
    await expect(notificationsButton(bystanderSession!.page)).toBeVisible();
    await expect(logInHeaderLink(bystanderSession!.page)).toHaveCount(0);
  });

  test('SRB-E4 — deleting an already-signed-out user is a clean no-op for that session', async () => {
    const { page, context } = signedOutSession!;
    const liveCredential = await credentialOf(context);
    expectResolvesTo(
      await whoAmI(liveCredential),
      signedOut!.userId,
      'before sign-out'
    );

    // Sign out the way a person does (A3). No fallback: if the menu cannot be
    // driven, the case is red for that reason, not quietly set up another way.
    await page.goto(`${baseUrl}/home`);
    await userMenuAvatar(page).click();
    await logoutMenuItem(page).click();
    await expect(logInHeaderLink(page)).toBeVisible();
    await expect(notificationsButton(page)).toHaveCount(0);

    // The ended session no longer resolves to the user — replayed from before
    // the sign-out, and as the browser holds it now.
    expectNotTheUser(
      await whoAmI(liveCredential),
      signedOut!.userId,
      'ended session'
    );
    expectNotTheUser(
      await whoAmI(await credentialOf(context)),
      signedOut!.userId,
      'browser after sign-out'
    );

    const deletion = await deleteUserAsGlobalAdmin(signedOut!.userId, {
      deleteIdentity: true,
    });
    expect(deletion.status).toBe(200);
    expect(deletion.body?.errors).toBeUndefined();
    expect(deletion.body?.data?.deleteUser?.id).toBe(signedOut!.userId);

    // Revoking an index entry that no longer resolves surfaces no new failure
    // mode: still not the user, and no server error.
    expectNotTheUser(
      await whoAmI(liveCredential),
      signedOut!.userId,
      'ended session after the deletion'
    );
  });

  test('SRB-N2 — no existence oracle at the session boundary', async ({
    browser,
  }) => {
    // The cookies that carry a signed-in session, as the server under test
    // names them. Positive control: exactly these cookies ARE the bystander's
    // session, so forging them is meaningful.
    const cookies = await sessionCookies(bystanderSession!.context);
    expect(
      cookies.length,
      'the signed-in context holds session cookies'
    ).toBeGreaterThan(0);
    const genuine = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    expectResolvesTo(
      await whoAmI({ cookieHeader: genuine }),
      bystander!.userId,
      'the genuine session cookies'
    );

    // The same cookies with never-issued values, and no cookies at all.
    const forged = cookies
      .map(({ name }) => `${name}=forged-${crypto.randomUUID()}`)
      .join('; ');
    const context = await browser.newContext();
    try {
      const withoutCookie = await whoAmI(await credentialOf(context));
      const withForgedCookie = await whoAmI({ cookieHeader: forged });

      expect(withoutCookie.status).toBe(200);
      expect(withoutCookie.errors).toEqual([]);
      expect(withoutCookie.userId).toBeNull();

      // Byte-identical: nothing tells a caller whether a session id ever
      // existed. Read against SRB-G1: ENDED sessions are loudly refused,
      // UNKNOWN ones are silently anonymous. Assert both or neither.
      expect(withForgedCookie.status).toBe(withoutCookie.status);
      expect(withForgedCookie.raw).toBe(withoutCookie.raw);
    } finally {
      await context.close();
    }
  });
});
