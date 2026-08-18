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

import { APIResponse, Browser, BrowserContext, Page } from '@playwright/test';
import axios from 'axios';
import {
  getUserToken,
  registerInKratosOrFail,
  testConfiguration,
  UniqueIDGenerator,
  verifyInKratosOrFail,
} from '@alkemio/tests-lib';
import { loginViaCrd } from '../helpers/login.helper';

export const baseUrl = (
  process.env.ALKEMIO_BASE_URL || 'http://localhost:3000'
).replace(/\/$/, '');

export const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';

/**
 * Cookie-borne GraphQL origin. Deliberately NOT `ALKEMIO_SERVER` /
 * `testConfiguration.endPoints.graphql.private` — that points at the
 * non-interactive bearer path, which carries no cookie semantics and never
 * consults the revocation marker. Bearer mutations (the admin deletion below)
 * use that endpoint; every cookie assertion uses this one.
 */
export const privateGraphqlUrl = `${baseUrl}/api/private/graphql`;

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
 * `POST /api/private/graphql` from the context's own session.
 *
 * `failOnStatusCode: false` is load-bearing: the assertion under test is the
 * *status*, and a throwing probe would turn the feature's core behaviour into
 * a harness error rather than an expectation.
 */
export const probePrivateGraphql = async (
  context: BrowserContext,
  query: string
): Promise<ProbeResult> =>
  toProbeResult(
    await context.request.post(privateGraphqlUrl, {
      data: { query },
      headers: { 'Content-Type': 'application/json' },
      failOnStatusCode: false,
    })
  );

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
  const response = await axios.post(
    testConfiguration.endPoints.graphql.private,
    { query: '{ me { user { id } } }' },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      validateStatus: () => true,
    }
  );
  const userId = response.data?.data?.me?.user?.id;
  if (!userId) {
    throw new Error(
      `Unable to resolve the Alkemio user id for '${email}' (HTTP ${
        response.status
      }): ${JSON.stringify(response.data)}`
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

const DELETE_USER_MUTATION = `
  mutation deleteUser($deleteData: DeleteUserInput!) {
    deleteUser(deleteData: $deleteData) {
      id
    }
  }`;

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
  const response = await axios.post(
    testConfiguration.endPoints.graphql.private,
    {
      query: DELETE_USER_MUTATION,
      variables: {
        deleteData: { ID: userId, deleteIdentity: options.deleteIdentity },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      validateStatus: () => true,
      transformResponse: [data => data],
    }
  );
  const text = typeof response.data === 'string' ? response.data : '';
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    body = undefined;
  }
  return { status: response.status, text, body };
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
