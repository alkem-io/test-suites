import axios, { AxiosError } from 'axios';
import { LogManager } from '../LogManager';
import { testConfiguration } from '../../config/test.configuration';

/**
 * Acquires a bearer token for a test user via the server's non-interactive
 * login endpoint.
 *
 * Post-OIDC (alkemio-server `feat/003-alkemio-oidc-idp`) the API validates
 * bearers as signed JWTs — either Hydra-issued RS256 tokens or the server's
 * own HS256 `non-interactive-login` token. The legacy `@alkemio/client-lib`
 * Kratos-session token is neither, so it fails JWS verification with
 * `ERR_JWS_INVALID`. This endpoint mints the HS256 token the harness needs.
 *
 * `POST {server}/api/auth/non-interactive-login`
 *   body: { email, password }
 *   201:  { api_token, expires_at, token_type: 'Bearer' }
 *   400 invalid_request · 401 invalid_credentials · 404 (feature disabled)
 *   422 actor_id_missing · 503 kratos_unavailable
 *
 * The feature must be enabled server-side (`ENABLE_NON_INTERACTIVE_LOGIN=true`
 * + `NON_INTERACTIVE_LOGIN_SIGNING_KEY`, non-production NODE_ENV); otherwise
 * every call returns 404.
 */
const NON_INTERACTIVE_LOGIN_PATH = '/api/auth/non-interactive-login';

type NonInteractiveLoginResponse = {
  api_token: string;
  expires_at: number;
  token_type: 'Bearer';
};

/**
 * Distinguishes WHY a token is being minted, so the mint-count evidence line
 * below can be attributed to its source instead of lumping every caller of
 * `getUserToken` into one undifferentiated count. The nightly's mint-count
 * invariant — the shared `pool` mints exactly once per run, regardless of
 * worker count — is about the shared-user pool mint specifically; `prereq`
 * (the env-prerequisite probe) and `ad-hoc` (per-scenario
 * registration/refresh calls) mint on their own, independent cadence and
 * must not be folded into that count. The pool's SIZE is not part of the
 * invariant and is free to change — CI derives its expected count from the
 * `[auth] pool size: N` line `populateUserModelMap` prints, not from a
 * number written into this file or the workflow.
 */
export type TokenMintSource = 'pool' | 'prereq' | 'ad-hoc';

export const getUserToken = async (
  userEmail: string,
  source: TokenMintSource = 'ad-hoc'
): Promise<string> => {
  const server = testConfiguration.endPoints.server;

  if (!server) {
    throw new Error('server url not provided');
  }

  const url = `${server.replace(/\/$/, '')}${NON_INTERACTIVE_LOGIN_PATH}`;

  try {
    const response = await axios.post<NonInteractiveLoginResponse>(
      url,
      {
        email: userEmail,
        password: testConfiguration.identities.admin.password,
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const apiToken = response.data?.api_token;
    if (!apiToken) {
      throw new Error(
        `non-interactive-login returned no api_token for ${userEmail}`
      );
    }
    // Deterministic, console-guaranteed (not LogManager, whose console
    // transport defaults to error-only) evidence line. The nightly's
    // mint-count assertion counts only the `(pool)`-tagged lines — the
    // shared-pool users minted once by `populateUserModelMap` — against the
    // pool's own declared size (`[auth] pool size: N`), and must match
    // exactly regardless of worker count. `(prereq)` and `(ad-hoc)` mints
    // are diagnostics, not part of that invariant.
    console.log(`[auth] minted token for ${userEmail} (${source})`);
    return apiToken;
  } catch (e) {
    const message = describeFailure(e, url);
    LogManager.getLogger().error(
      message,
      `>> identifier: ${userEmail}`,
      (e as Error)?.stack
    );
    throw new Error(
      `Unable to retrieve access token for user ${userEmail}: ${message}`
    );
  }
};

// Maps the endpoint's documented status codes to actionable messages so a
// misconfigured server (feature disabled, wrong password) is obvious from the
// log rather than surfacing as a generic auth failure later.
const describeFailure = (e: unknown, url: string): string => {
  if (!axios.isAxiosError(e)) {
    return (e as Error)?.message ?? String(e);
  }
  const err = e as AxiosError<{ message?: string }>;
  const status = err.response?.status;
  switch (status) {
    case 400:
      return 'invalid_request — missing email/password in non-interactive-login call';
    case 401:
      return 'invalid_credentials — Kratos rejected the test-harness credentials (check AUTH_TEST_HARNESS_PASSWORD)';
    case 404:
      return `feature disabled — POST ${url} returned 404. Enable non-interactive-login on the server (ENABLE_NON_INTERACTIVE_LOGIN=true + NON_INTERACTIVE_LOGIN_SIGNING_KEY, non-production NODE_ENV)`;
    case 422:
      return 'actor_id_missing — the Kratos identity has no alkemio_actor_id';
    case 503:
      return 'kratos_unavailable — server could not reach Kratos';
    default:
      return status
        ? `unexpected status ${status} from ${url}: ${err.response?.data?.message ?? err.message}`
        : `network error calling ${url}: ${err.message}`;
  }
};
