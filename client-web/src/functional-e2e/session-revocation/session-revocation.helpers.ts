// plan: docs/qa/6315-session-revocation-test-plan.md (Stream B, §4.2)
//
// Stream B helpers — the OIDC/BFF revocation cascade observed over a REAL
// `alkemio_session` cookie.
//
// Why this module exists at all: `alkemio:subrevoked:<sub>` is read by exactly
// one caller, `CookieSessionStrategy`. That code path is reachable only from a
// cookie-authenticated request, and the only place in this monorepo that holds
// a genuine `alkemio_session` is a Playwright `BrowserContext`. `context.request`
// shares that context's cookie jar, so an API call made through it carries the
// same session the browser holds — which is the whole mechanism these specs
// rest on. Never construct a bare `APIRequestContext`: it has no cookies and
// every assertion below would degrade to "anonymous" and pass vacuously.

import { APIResponse, Browser, BrowserContext, Page, request } from '@playwright/test';
import {
  deleteUserRaw,
  getUserToken,
  readMySessionRaw,
  readMyUser,
  readMyUserRaw,
  registerInKratosOrFail,
  UniqueIDGenerator,
  verifyInKratosOrFail,
  type RawGraphqlResponse,
} from '@alkemio/tests-lib';
import { loginViaCrd } from '../helpers/login.helper';
import { sessionActor } from '../helpers/lib-actor.helper';

export const baseUrl = (
  process.env.ALKEMIO_BASE_URL || 'http://localhost:3000'
).replace(/\/$/, '');

export const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';

/**
 * Cookie-borne GraphQL calls go through a `{ cookieHeader }` lib actor, which
 * the lib sends to the session endpoint (`/api/private/graphql`) — deliberately
 * NOT the non-interactive bearer path, which carries no cookie semantics and
 * never consults the revocation marker. Bearer mutations (the admin deletion
 * below) use the bearer path; every cookie assertion uses the session one.
 */

/** `@Controller('api/auth/oidc')` + `@Get('id-token-hint')`, oidc.controller.ts. */
export const idTokenHintUrl = `${baseUrl}/api/auth/oidc/id-token-hint`;

/** Server default (`OIDC_SESSION_COOKIE_NAME:alkemio_session` in alkemio.yml). */
export const sessionCookieName =
  process.env.OIDC_SESSION_COOKIE_NAME || 'alkemio_session';

const ADMIN_EMAIL = process.env.AUTH_TEST_HARNESS_EMAIL || 'admin@alkem.io';

/**
 * Substrings that must never appear on the wire once a session is revoked.
 * FR-021 / SC-006 (response slice) and GDPR Art. 17 — the PII half of the
 * tombstone rationale, asserted where it is actually observable.
 */
export const TOKEN_MATERIAL_MARKERS = [
  'id_token',
  'access_token',
  'refresh_token',
  'alkemio_session',
  'alkemio:sid:',
  'alkemio:sub:',
  'terminated_at',
];

// --------------------------------------------------------------------------
// Probes — every one of these goes through the browser context's cookie jar.
// --------------------------------------------------------------------------

export interface ProbeResult {
  status: number;
  /** Raw body. Kept so negative assertions can scan the literal wire bytes. */
  text: string;
  /** Parsed body, or `undefined` when the body was not JSON. */
  json: any;
}

const toProbeResult = async (response: APIResponse): Promise<ProbeResult> => {
  const text = await response.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return { status: response.status(), text, json };
};

/** A lib RAW response (status + parsed body + serialised body) as a probe result. */
const rawToProbeResult = <T>(response: RawGraphqlResponse<T>): ProbeResult => ({
  status: response.status,
  text: response.raw,
  json: response.body,
});

/**
 * `GET /api/auth/oidc/id-token-hint` from the context's own session.
 * 200 `{id_token}` while the session lives, 401 `{"error":"unauthenticated"}`
 * once it is torn down or tombstoned.
 */
export const probeIdTokenHint = async (
  context: BrowserContext
): Promise<ProbeResult> =>
  toProbeResult(
    await context.request.get(idTokenHintUrl, { failOnStatusCode: false })
  );

/**
 * The session liveness read (`me { id }`) on the session GraphQL endpoint from
 * the context's own cookie jar, as it is NOW — a jar the server has cleared
 * sends no cookie and is served anonymously.
 *
 * A RAW lib call never throws on a non-2xx, which is load-bearing: the
 * assertion under test is the *status*, and a throwing probe would turn the
 * feature's core behaviour into a harness error rather than an expectation.
 */
export const probePrivateGraphql = async (
  context: BrowserContext
): Promise<ProbeResult> =>
  rawToProbeResult(await readMySessionRaw(await sessionActor(context)));

/**
 * `me { id user { id } }` from the context's own session — `probePrivateGraphql`
 * plus whether a user is still attached to the session.
 */
export const probePrivateGraphqlMyUser = async (
  context: BrowserContext
): Promise<ProbeResult> =>
  rawToProbeResult(await readMyUserRaw(await sessionActor(context)));

/**
 * The session cookie of a context, as a `Cookie` request header value.
 *
 * Why it exists: on the FIRST request a revoked session makes, the server
 * answers 401 AND clears the cookie on that response (AuthInterceptor —
 * otherwise the browser is locked out of `/login`). A Playwright context
 * honours that clear, so every later probe from the same context is
 * cookie-less and legitimately ANONYMOUS. The property #6315 fences —
 * "a stale cookie must never yield an anonymous 200" — can therefore only be
 * asserted by REPLAYING the captured cookie explicitly, which is what the
 * `*WithCookie` probes below do.
 */
export const captureSessionCookie = async (
  context: BrowserContext
): Promise<string> => {
  const cookie = (await context.cookies()).find(
    c => c.name === sessionCookieName
  );
  if (!cookie) {
    throw new Error(
      `captureSessionCookie: no '${sessionCookieName}' cookie in the context`
    );
  }
  return `${cookie.name}=${cookie.value}`;
};

/**
 * The replayed cookie is a live credential until the revocation lands. It is
 * only ever sent to `baseUrl`, which must be HTTPS unless it is a loopback
 * host (the local stack), and the probes never follow redirects — so the
 * cookie cannot be forwarded to a destination the test did not name.
 */
const assertSecureProbeOrigin = (): void => {
  const { protocol, hostname } = new URL(baseUrl);
  const loopback = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname);
  if (protocol !== 'https:' && !loopback) {
    throw new Error(
      `Refusing to replay a session cookie over ${protocol} to ${hostname}: ALKEMIO_BASE_URL must be https:// or loopback`
    );
  }
};

const probeWithCookie = async (
  cookieHeader: string,
  send: (ctx: Awaited<ReturnType<typeof request.newContext>>) => Promise<APIResponse>
): Promise<ProbeResult> => {
  assertSecureProbeOrigin();
  const ctx = await request.newContext({
    extraHTTPHeaders: { cookie: cookieHeader },
  });
  try {
    return await toProbeResult(await send(ctx));
  } finally {
    await ctx.dispose();
  }
};

/** `GET id-token-hint` replaying a captured (possibly stale) session cookie. */
export const probeIdTokenHintWithCookie = (
  cookieHeader: string
): Promise<ProbeResult> =>
  probeWithCookie(cookieHeader, ctx =>
    ctx.get(idTokenHintUrl, { failOnStatusCode: false, maxRedirects: 0 })
  );

/** The session liveness read (`me { id }`) replaying a captured (possibly stale) session cookie. */
export const probePrivateGraphqlWithCookie = async (
  cookieHeader: string
): Promise<ProbeResult> => {
  assertSecureProbeOrigin();
  return rawToProbeResult(await readMySessionRaw({ cookieHeader }));
};

// --------------------------------------------------------------------------
// Disposable subjects — these specs delete their subject, so a shared persona
// is never acceptable. Deleting `space.member@alkem.io` would poison every
// other suite in the monorepo.
// --------------------------------------------------------------------------

export interface DisposableUser {
  email: string;
  firstName: string;
  lastName: string;
  /** Alkemio user id (the `deleteUser` mutation's `ID`), not the Kratos sub. */
  userId: string;
}

/**
 * Provision a verified, disposable Kratos identity and resolve the Alkemio
 * user row it maps to.
 *
 * The Alkemio user is created server-side on first authentication, so minting
 * the subject's own non-interactive bearer and reading `me { user { id } }`
 * both triggers that creation and yields the id the deletion needs.
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

  const userId = await resolveAlkemioUserId(email);
  return { email, firstName, lastName, userId };
};

const resolveAlkemioUserId = async (email: string): Promise<string> => {
  const token = await getUserToken(email);
  const response = await readMyUser({ bearerToken: token });
  const userId = response.data?.me?.user?.id;
  if (!userId) {
    throw new Error(
      `Unable to resolve the Alkemio user id for '${email}': ${JSON.stringify(
        response.error?.errors ?? response.data
      )}`
    );
  }
  return userId;
};

// --------------------------------------------------------------------------
// Deletion — this stream's own `deleteUser`, deliberately not the shared one.
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
 * Delete a user as global admin, with `deleteIdentity` under the caller's
 * control.
 *
 * The shared `deleteUser` helper
 * (`server-api/.../user.request.params.ts`) hardcodes `deleteIdentity: true`,
 * which destroys the Kratos identity as a side effect. SRB-E2 re-logs the same
 * email in after the revocation, so it needs the identity to survive — with
 * the shared helper that scenario would fail at the login form for a reason
 * that has nothing to do with the behaviour under test. The shared helper is
 * read-only for this stream, so the variant lives here.
 *
 * Sent over the non-interactive bearer path on purpose: the deletion is
 * out-of-band admin traffic and must not disturb the subject's cookie session,
 * which is the thing being measured.
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
 * Best-effort teardown. Already-deleted is the expected outcome for most
 * subjects here, so nothing is thrown — a cleanup failure must not mask the
 * verdict of the test that just ran.
 */
export const deleteUserQuietly = async (userId?: string): Promise<void> => {
  if (!userId) return;
  try {
    await deleteUserAsGlobalAdmin(userId, { deleteIdentity: true });
  } catch {
    // Subject already gone, or the admin token could not be minted during
    // teardown. Either way there is nothing useful left to do.
  }
};

// --------------------------------------------------------------------------
// Browser sessions
// --------------------------------------------------------------------------

export interface LoggedInSession {
  context: BrowserContext;
  page: Page;
}

/**
 * Log an email in through the real SPA form in its OWN browser context, so the
 * OIDC callback mints a genuine `alkemio_session` and indexes it under the
 * subject.
 *
 * Explicitly NOT `createPersonaTest` / `ensurePersonaState`: that cache is
 * keyed by email and shared across the whole run, and these subjects get
 * deleted. Each call here is a distinct sid, which is also what SRB-E1 needs.
 */
export const openLoggedInSession = async (
  browser: Browser,
  email: string
): Promise<LoggedInSession> => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginViaCrd(page, email, password, baseUrl);
  return { context, page };
};

/**
 * Close every context, tolerating failures. Leaked contexts hold live sessions
 * and confuse the next run, so this runs unconditionally in `afterAll`.
 */
export const closeSessions = async (
  ...sessions: (LoggedInSession | undefined)[]
): Promise<void> => {
  for (const session of sessions) {
    await session?.context.close().catch(() => {});
  }
};
