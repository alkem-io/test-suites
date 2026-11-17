// plan: client-web/src/functional-e2e/session-revocation/session-revocation-test-plan.md
//       (scenarios from docs/qa/6315-session-revocation-test-plan.md, Stream B)
//
// Helpers for the session-revocation walks: what happens to a signed-in
// browser session when its account is deleted.
//
// W2 Tier 0 item 2 (docs/qa/server-rebuild/client-net-audit/README.md § 4):
// every oracle here is a GraphQL outcome read through `@alkemio/tests-lib`, or
// what the user sees in the browser. Nothing depends on a Kratos `error_code`,
// on the session cookie's name or wire format, on the anonymous actor's id, or
// on the BFF's `id-token-hint` route (which the client resolves on the identity
// subdomain, not the app origin).
//
// The credential under test is the browser context's cookie jar, snapshotted
// as a lib actor (`sessionActor`). A snapshot taken before the deletion and
// replayed afterwards is the "stale session" — whatever the server names its
// cookies. The lib sends it on its own HTTP client, so a probe never changes
// the browser's jar; only the browser's own requests do.

import type { Browser, BrowserContext, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import {
  deleteUserRaw,
  getUserToken,
  readMyUser,
  readMyUserRaw,
  registerInKratosOrFail,
  testConfiguration,
  UniqueIDGenerator,
  verifyInKratosOrFail,
  type GraphqlActor,
} from '@alkemio/tests-lib';
import { loginViaCrd } from '../helpers/login.helper';
import { sessionActor } from '../helpers/lib-actor.helper';

export const baseUrl = (
  process.env.ALKEMIO_BASE_URL || 'http://localhost:3000'
).replace(/\/$/, '');

export const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';

const ADMIN_EMAIL = process.env.AUTH_TEST_HARNESS_EMAIL || 'admin@alkem.io';

/**
 * Substrings that must never appear on the wire once a session is revoked
 * (FR-021 / SC-006, response slice). Generic token names only: an absence
 * check on a server-internal key name would pass vacuously once it is renamed.
 */
export const TOKEN_MATERIAL_MARKERS = [
  'id_token',
  'access_token',
  'refresh_token',
];

// --------------------------------------------------------------------------
// The credential and what the server makes of it
// --------------------------------------------------------------------------

/**
 * The browser context's credential as it is NOW, as a lib actor. Taken before
 * a deletion and replayed after it, it is the stale session.
 */
export const credentialOf = (context: BrowserContext): Promise<GraphqlActor> =>
  sessionActor(context);

export interface WhoAmI {
  status: number;
  /** The user the server attached to this credential, or null for none. */
  userId: string | null;
  /** The GraphQL errors, if any. */
  errors: { message?: string; extensions?: { code?: string } }[];
  /** Whether `me` resolved at all. */
  meResolved: boolean;
  /** The serialised body, for leak scans. */
  raw: string;
}

/**
 * `me { id user { id } }` on the session GraphQL endpoint, as `actor`. Never
 * throws on a non-2xx: the status is part of what is asserted.
 */
export const whoAmI = async (actor: GraphqlActor): Promise<WhoAmI> => {
  const response = await readMyUserRaw(actor);
  const body = response.body as
    | {
        data?: { me?: { id: string; user: { id: string } | null } | null };
        errors?: WhoAmI['errors'];
      }
    | undefined;
  return {
    status: response.status,
    userId: body?.data?.me?.user?.id ?? null,
    errors: body?.errors ?? [],
    meResolved: Boolean(body?.data?.me),
    raw: response.raw,
  };
};

/** The credential is accepted and resolves to exactly this user. */
export const expectResolvesTo = (who: WhoAmI, userId: string, what: string) => {
  expect(who.status, `${what}: HTTP status`).toBe(200);
  expect(who.errors, `${what}: GraphQL errors`).toEqual([]);
  expect(who.userId, `${what}: the user behind the session`).toBe(userId);
};

/**
 * The credential is REFUSED: an HTTP 401 with a GraphQL error and nothing
 * resolved. This is the server#6315 property — an ended session is loudly
 * refused, never silently served as an anonymous visitor (which is what a
 * `destroy()`-instead-of-tombstone regression produces).
 */
export const expectRefused = (who: WhoAmI, what: string) => {
  expect(who.status, `${what}: must not be a silent 200`).not.toBe(200);
  expect(who.status, `${what}: HTTP status`).toBe(401);
  expect(who.errors.length, `${what}: GraphQL errors`).toBeGreaterThan(0);
  expect(who.meResolved, `${what}: \`me\` must not resolve`).toBe(false);
  expect(who.userId, `${what}: no user`).toBeNull();
};

/**
 * Whatever the server does with this credential, it is not this user and not
 * a server error: refused (401), or an anonymous visitor (200, no user).
 */
export const expectNotTheUser = (who: WhoAmI, userId: string, what: string) => {
  expect(who.status, `${what}: no server error`).toBeLessThan(500);
  expect([200, 401], `${what}: HTTP status`).toContain(who.status);
  expect(who.userId, `${what}: must not resolve to the user`).not.toBe(userId);
  if (who.status === 200) {
    expect(who.errors, `${what}: anonymous read has no errors`).toEqual([]);
    expect(who.userId, `${what}: anonymous`).toBeNull();
  }
};

// --------------------------------------------------------------------------
// Disposable subjects — these walks delete their subject, so a shared
// persona is never acceptable.
// --------------------------------------------------------------------------

export interface DisposableUser {
  email: string;
  firstName: string;
  lastName: string;
  /** Alkemio user id (the `deleteUser` mutation's `ID`), not the Kratos sub. */
  userId: string;
}

/**
 * A verified, disposable Kratos identity (public registration + its own
 * verification mail, read by recipient) and the Alkemio user it maps to.
 * Minting the subject's own bearer and reading `me { user { id } }` both
 * creates that user and yields its id.
 */
export const provisionDisposableUser = async (
  label = 'srb'
): Promise<DisposableUser> => {
  const uniqueId = UniqueIDGenerator.getID();
  const email = `test+${label}-${uniqueId}@alkem.io`;
  const firstName = `Srb${uniqueId}`;
  const lastName = 'Revocation';

  const { verificationFlowId } = await registerInKratosOrFail(
    firstName,
    lastName,
    email
  );
  await verifyInKratosOrFail(email, verificationFlowId);

  const userId = await currentUserIdOf(email);
  if (!userId) {
    throw new Error(`No Alkemio user appeared for '${email}' after sign-up`);
  }
  return { email, firstName, lastName, userId };
};

/** The Alkemio user an email signs in as right now, or null when none. */
const currentUserIdOf = async (email: string): Promise<string | null> => {
  const token = await getUserToken(email);
  const response = await readMyUser({ bearerToken: token });
  if (response.error) {
    throw new Error(
      `readMyUser for '${email}' failed: ${JSON.stringify(response.error.errors)}`
    );
  }
  return response.data?.me?.user?.id ?? null;
};

// --------------------------------------------------------------------------
// Deletion
// --------------------------------------------------------------------------

let adminTokenPromise: Promise<string> | undefined;

const getAdminToken = (): Promise<string> => {
  if (!adminTokenPromise) {
    adminTokenPromise = getUserToken(ADMIN_EMAIL);
  }
  return adminTokenPromise;
};

export interface DeleteUserResult {
  status: number;
  text: string;
  body: any;
}

/**
 * Delete a user as the platform admin, over the bearer path, with
 * `deleteIdentity` under the caller's control. Out-of-band admin traffic: it
 * must not touch the subject's browser session, which is what is measured.
 * SRB-E2 signs the same email in again afterwards, so the cascade keeps the
 * identity (`deleteIdentity: false`); every other walk removes it.
 */
export const deleteUserAsGlobalAdmin = async (
  userId: string,
  options: { deleteIdentity: boolean }
): Promise<DeleteUserResult> => {
  const token = await getAdminToken();
  const response = await deleteUserRaw(userId, options.deleteIdentity, {
    bearerToken: token,
  });
  return { status: response.status, text: response.raw, body: response.body };
};

/**
 * Teardown: delete the user (with its sign-in identity) unless a walk already
 * did. "Already gone" (`ENTITY_NOT_FOUND`) is the expected outcome after a
 * green walk; anything else fails the hook, because a leaked user is a leaked
 * fixture on a shared environment.
 */
export const deleteUserIfPresent = async (userId?: string): Promise<void> => {
  if (!userId) return;
  const deletion = await deleteUserAsGlobalAdmin(userId, {
    deleteIdentity: true,
  });
  const errors: { extensions?: { code?: string } }[] =
    deletion.body?.errors ?? [];
  if (errors.length === 0 && deletion.status === 200) return;
  if (errors.every(e => e.extensions?.code === 'ENTITY_NOT_FOUND')) return;
  throw new Error(
    `teardown: deleting user ${userId} failed (HTTP ${deletion.status}): ${deletion.text}`
  );
};

/**
 * Teardown for a subject whose Alkemio user was deleted with its identity
 * KEPT and then signed in again (SRB-E2): remove whatever user that email
 * signs in as now, together with the identity. Without the Kratos admin API
 * this is the only way to remove the identity; if no user can be resolved,
 * say so — the identity is left behind.
 */
export const deleteEverythingFor = async (
  subject?: DisposableUser
): Promise<void> => {
  if (!subject) return;
  let userId: string | null;
  try {
    userId = await currentUserIdOf(subject.email);
  } catch (error) {
    throw new Error(
      `teardown: the Kratos identity of a disposable subject may be left behind — it no longer signs in (${(error as Error).message})`
    );
  }
  if (!userId) {
    throw new Error(
      'teardown: the Kratos identity of a disposable subject is left behind — it signs in as no user'
    );
  }
  await deleteUserIfPresent(userId);
};

// --------------------------------------------------------------------------
// Browser sessions
// --------------------------------------------------------------------------

export interface LoggedInSession {
  context: BrowserContext;
  page: Page;
}

/** The banner control only a signed-in visitor gets. */
export const notificationsButton = (page: Page) =>
  page
    .getByRole('banner')
    .getByRole('button', { name: 'Notifications', exact: true });

export const logInHeaderLink = (page: Page) =>
  page.getByRole('link', { name: 'Log in', exact: true });

/**
 * Sign an email in through the real SPA form in its OWN browser context, so
 * each call is a distinct server session (SRB-E1 needs three). Never the
 * persona storage-state cache: it is keyed by email and these subjects get
 * deleted. Waits for the signed-in banner, not for a URL.
 */
export const openLoggedInSession = async (
  browser: Browser,
  email: string
): Promise<LoggedInSession> => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginViaCrd(page, email, password, baseUrl);
  await expect(notificationsButton(page)).toBeVisible();
  return { context, page };
};

/** Close every context. Leaked contexts hold live sessions. */
export const closeSessions = async (
  ...sessions: (LoggedInSession | undefined)[]
): Promise<void> => {
  for (const session of sessions) {
    await session?.context.close();
  }
};

/**
 * The cookies that carry a signed-in session on the server
 * origin: the HttpOnly cookies a signed-in context holds there. Derived, not
 * hard-coded, so SRB-N2 forges whatever the server under test actually uses.
 */
export const sessionCookies = async (
  context: BrowserContext
): Promise<{ name: string; value: string }[]> =>
  (await context.cookies(testConfiguration.endPoints.server)).filter(
    cookie => cookie.httpOnly
  );
