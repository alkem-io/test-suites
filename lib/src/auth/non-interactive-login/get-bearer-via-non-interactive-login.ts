import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import axios, { AxiosError } from 'axios';
import { testConfiguration } from '../../config/test.configuration';

/**
 * Non-interactive credential→bearer flow that bypasses Hydra entirely.
 * Used by test harnesses and other clients that cannot perform the
 * browser-based OIDC code flow.
 *
 * Hits `POST {server}/api/auth/non-interactive-login` on the alkemio-server.
 * That endpoint exists only when the server is started with
 * `ENABLE_NON_INTERACTIVE_LOGIN=true` AND a strong
 * `NON_INTERACTIVE_LOGIN_SIGNING_KEY` AND `NODE_ENV !== 'production'`. The
 * server validates `{email, password}` against Kratos (real password check),
 * then mints an HS256 JWT carrying
 * `{iss:"alkemio-non-interactive-login", non_interactive_login:true, alkemio_actor_id:<uuid>}`.
 *
 * Returned tokens are cached at `.auth-cache/<sha256(email)>.json` (mode 0600)
 * and reused until 5 minutes before expiry. The server-mint default TTL is
 * 4 hours; tests typically finish well inside that window.
 */
const TOKEN_REFRESH_SKEW_SECONDS = 5 * 60; // re-mint when ≤5 min left

interface CachedNonInteractiveLoginToken {
  api_token: string;
  expires_at: number; // unix seconds
  obtained_at: number;
  server: string; // invalidate cache if pointed at a different server
}

const cacheDir = (): string =>
  process.env.NON_INTERACTIVE_LOGIN_CACHE_DIR ??
  process.env.OIDC_TEST_CACHE_DIR ??
  join(process.cwd(), '.auth-cache');

const cachePath = (email: string): string =>
  join(
    cacheDir(),
    `${createHash('sha256').update(email.toLowerCase()).digest('hex')}.json`
  );

const readCache = (email: string, server: string): CachedNonInteractiveLoginToken | null => {
  const path = cachePath(email);
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as CachedNonInteractiveLoginToken;
    if (parsed.server !== server) return null;
    const now = Math.floor(Date.now() / 1000);
    if (parsed.expires_at <= now + TOKEN_REFRESH_SKEW_SECONDS) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeCache = (email: string, token: CachedNonInteractiveLoginToken): void => {
  const path = cachePath(email);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(token, null, 2), { mode: 0o600 });
};

/**
 * Drop the cached bearer for `email` so the next `getBearerViaNonInteractiveLogin`
 * call forces a fresh server mint. Used to recover from
 * Kratos-identity ↔ Alkemio-User actor_id drift, where a cached token still
 * carries an `alkemio_actor_id` that no longer resolves on the server.
 */
export const clearCachedNonInteractiveLoginToken = (email: string): void => {
  const path = cachePath(email);
  if (existsSync(path)) {
    try {
      unlinkSync(path);
    } catch {
      // Best-effort — caller retries either way.
    }
  }
};

export const getBearerViaNonInteractiveLogin = async (
  email: string,
  password: string
): Promise<string> => {
  const server =
    process.env.NON_INTERACTIVE_LOGIN_ENDPOINT ?? testConfiguration.endPoints.server;
  const url = `${server.replace(/\/$/, '')}/api/auth/non-interactive-login`;

  const cached = readCache(email, server);
  if (cached) return cached.api_token;

  let response;
  try {
    response = await axios.post(
      url,
      { email, password },
      {
        headers: { 'content-type': 'application/json' },
        validateStatus: () => true, // handle status ourselves below
        timeout: 10_000,
      }
    );
  } catch (e) {
    const err = e as AxiosError;
    throw new Error(
      `non-interactive-login network error against ${url}: ${err.message}`
    );
  }

  const errCode =
    typeof response.data === 'object' &&
    response.data &&
    typeof (response.data as { message?: unknown }).message === 'string'
      ? (response.data as { message: string }).message
      : '';

  if (response.status === 404) {
    throw new Error(
      `non-interactive-login endpoint missing at ${url}. Is ENABLE_NON_INTERACTIVE_LOGIN=true on the server?`
    );
  }
  if (response.status === 401) {
    throw new Error(
      `non-interactive-login rejected credentials for ${email} (401 ${errCode || 'invalid_credentials'})`
    );
  }
  if (response.status === 422) {
    throw new Error(
      `non-interactive-login: identity for ${email} has no alkemio_actor_id (422 ${errCode}). Run user registration first.`
    );
  }
  if (response.status === 503) {
    throw new Error(
      `non-interactive-login: server reports Kratos unavailable (503 ${errCode}). Retry shortly.`
    );
  }
  // Server returns 201 from NestJS @Post by default; treat 200 and 201 as success.
  if (response.status !== 200 && response.status !== 201) {
    throw new Error(
      `non-interactive-login unexpected status ${response.status} from ${url}: ${JSON.stringify(response.data)}`
    );
  }

  const data = response.data as {
    api_token?: string;
    expires_at?: number;
    token_type?: string;
  };
  if (!data?.api_token || typeof data.expires_at !== 'number') {
    throw new Error(
      `non-interactive-login: malformed response from ${url}: ${JSON.stringify(data)}`
    );
  }

  writeCache(email, {
    api_token: data.api_token,
    expires_at: data.expires_at,
    obtained_at: Math.floor(Date.now() / 1000),
    server,
  });

  return data.api_token;
};
