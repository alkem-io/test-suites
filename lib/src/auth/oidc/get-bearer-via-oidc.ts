import { createHash, randomBytes } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { testConfiguration } from '../../config/test.configuration';
import { ensureHydraTestClient } from './ensure-hydra-client';

const base64url = (buf: Buffer): string =>
  buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const sha256 = (input: string): Buffer =>
  createHash('sha256').update(input).digest();

const MAX_REDIRECT_HOPS = 12;
const ACCESS_TOKEN_SKEW_SECONDS = 30;

interface CachedTokens {
  client_id: string;
  identity_id?: string;
  alkemio_actor_id?: string;
  access_token: string;
  refresh_token?: string;
  access_expires_at: number;
  obtained_at: number;
}

const cacheDir = (): string =>
  process.env.OIDC_TEST_CACHE_DIR ?? join(process.cwd(), '.auth-cache');

const cachePath = (email: string): string =>
  join(cacheDir(), `${sha256(email).toString('hex')}.json`);

const readCache = (email: string): CachedTokens | undefined => {
  const path = cachePath(email);
  if (!existsSync(path)) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as CachedTokens;
    if (parsed.client_id !== testConfiguration.endPoints.oidc.clientId) {
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
};

const writeCache = (email: string, tokens: CachedTokens): void => {
  const path = cachePath(email);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(tokens, null, 2), { mode: 0o600 });
};

const decodeJwtExp = (jwt: string): number => {
  const parts = jwt.split('.');
  if (parts.length < 2) {
    throw new Error('Hydra access_token is not a JWT (no exp claim)');
  }
  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
  const json = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  if (typeof json.exp !== 'number') {
    throw new Error('Hydra access_token JWT missing numeric exp');
  }
  return json.exp;
};

const isFreshEnough = (tokens: CachedTokens): boolean => {
  const now = Math.floor(Date.now() / 1000);
  return tokens.access_expires_at > now + ACCESS_TOKEN_SKEW_SECONDS;
};

interface KratosIdentity {
  id: string;
  metadata_public?: {
    alkemio_actor_id?: string;
    alkemio_user_id?: string;
  };
}

interface ResolvedPersona {
  identityId: string;
  alkemioActorId?: string;
}

const lookupKratosPersona = async (email: string): Promise<ResolvedPersona> => {
  const base = testConfiguration.endPoints.oidc.kratosAdmin.replace(/\/$/, '');
  const url = `${base}/identities?credentials_identifier=${encodeURIComponent(email)}`;
  try {
    const res = await axios.get<KratosIdentity[]>(url, {
      timeout: 30000,
      validateStatus: (s) => s >= 200 && s < 300,
    });
    const identities = res.data;
    if (!Array.isArray(identities) || identities.length === 0) {
      throw new Error(
        `No Kratos identity found for ${email} (admin URL: ${base})`
      );
    }
    if (identities.length > 1) {
      throw new Error(
        `Ambiguous Kratos identity lookup: ${identities.length} matches for ${email}`
      );
    }
    return {
      identityId: identities[0].id,
      alkemioActorId: identities[0].metadata_public?.alkemio_actor_id,
    };
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('No Kratos')) throw err;
    if (err instanceof Error && err.message.startsWith('Ambiguous')) throw err;
    const ax = err as AxiosError<{ error?: { message?: string } }>;
    throw new Error(
      `Kratos admin identity lookup failed (${ax.response?.status ?? 'no-status'}): ` +
        `${ax.response?.data?.error?.message ?? ax.message}`
    );
  }
};

const buildAuthorizeUrl = (
  state: string,
  nonce: string,
  codeChallenge: string
): string => {
  const { hydraPublic, clientId, redirectUri, scopes, audience } =
    testConfiguration.endPoints.oidc;
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  if (audience) {
    params.set('audience', audience);
  }
  return `${hydraPublic.replace(/\/$/, '')}/oauth2/auth?${params.toString()}`;
};

const collectSetCookie = (res: AxiosResponse, jar: Map<string, string>) => {
  const raw = res.headers['set-cookie'];
  if (!raw) return;
  for (const line of raw) {
    const [pair] = line.split(';');
    const eq = pair.indexOf('=');
    if (eq <= 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (value === '' || value.toLowerCase() === 'deleted') {
      jar.delete(name);
    } else {
      jar.set(name, value);
    }
  }
};

const cookieHeader = (jar: Map<string, string>): string =>
  Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');

const getFollowingHydraRedirects = async (
  url: string,
  jar: Map<string, string>,
  stopOn: (location: string) => boolean
): Promise<string> => {
  let nextUrl: string | undefined = url;
  for (let hop = 0; hop < MAX_REDIRECT_HOPS; hop++) {
    if (!nextUrl) break;
    if (stopOn(nextUrl)) return nextUrl;

    const res: AxiosResponse = await axios.get(nextUrl, {
      maxRedirects: 0,
      validateStatus: (s) => s >= 200 && s < 400,
      headers: {
        Cookie: cookieHeader(jar),
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    collectSetCookie(res, jar);

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers['location'];
      if (!location) {
        throw new Error(
          `Redirect chain: ${res.status} without Location at ${nextUrl}`
        );
      }
      const resolved = new URL(location, nextUrl).toString();
      const err = new URL(resolved).searchParams.get('error');
      if (err && !stopOn(resolved)) {
        const desc = new URL(resolved).searchParams.get('error_description') ?? '';
        throw new Error(
          `Redirect chain hit OAuth error: ${err}` +
            (desc ? ` — ${desc}` : '') +
            ` (location: ${resolved})`
        );
      }
      nextUrl = resolved;
      continue;
    }

    throw new Error(
      `Redirect chain: unexpected status ${res.status} at ${nextUrl}`
    );
  }

  throw new Error(`Redirect chain exceeded ${MAX_REDIRECT_HOPS} hops`);
};

const extractChallengeId = (url: string, paramName: string): string => {
  const id = new URL(url).searchParams.get(paramName);
  if (!id) {
    throw new Error(`Expected ${paramName} in URL: ${url}`);
  }
  return id;
};

interface HydraRedirectResponse {
  redirect_to: string;
}

const acceptLoginChallenge = async (
  loginChallenge: string,
  subject: string
): Promise<string> => {
  const { hydraAdmin } = testConfiguration.endPoints.oidc;
  const url =
    `${hydraAdmin.replace(/\/$/, '')}/admin/oauth2/auth/requests/login/accept` +
    `?login_challenge=${encodeURIComponent(loginChallenge)}`;
  try {
    const res = await axios.put<HydraRedirectResponse>(
      url,
      { subject, remember: false },
      {
        headers: { 'Content-Type': 'application/json' },
        validateStatus: (s) => s >= 200 && s < 300,
      }
    );
    return res.data.redirect_to;
  } catch (err) {
    const ax = err as AxiosError<{ error?: string; error_description?: string }>;
    throw new Error(
      `Hydra admin login/accept failed (${ax.response?.status ?? 'no-status'}): ` +
        `${ax.response?.data?.error_description ?? ax.message}`
    );
  }
};

const acceptConsentChallenge = async (
  consentChallenge: string,
  alkemioActorId?: string
): Promise<string> => {
  const { hydraAdmin, scopes, audience } = testConfiguration.endPoints.oidc;
  const url =
    `${hydraAdmin.replace(/\/$/, '')}/admin/oauth2/auth/requests/consent/accept` +
    `?consent_challenge=${encodeURIComponent(consentChallenge)}`;
  const claimStamp: Record<string, unknown> = alkemioActorId
    ? { alkemio_actor_id: alkemioActorId }
    : {};
  const body = {
    grant_scope: scopes.split(/\s+/).filter(Boolean),
    grant_access_token_audience: audience ? [audience] : [],
    remember: false,
    session: {
      access_token: { ...claimStamp },
      id_token: { ...claimStamp },
    },
  };
  try {
    const res = await axios.put<HydraRedirectResponse>(url, body, {
      headers: { 'Content-Type': 'application/json' },
      validateStatus: (s) => s >= 200 && s < 300,
    });
    return res.data.redirect_to;
  } catch (err) {
    const ax = err as AxiosError<{ error?: string; error_description?: string }>;
    throw new Error(
      `Hydra admin consent/accept failed (${ax.response?.status ?? 'no-status'}): ` +
        `${ax.response?.data?.error_description ?? ax.message}`
    );
  }
};

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

const postToken = async (body: URLSearchParams): Promise<TokenResponse> => {
  const { hydraPublic } = testConfiguration.endPoints.oidc;
  const tokenUrl = `${hydraPublic.replace(/\/$/, '')}/oauth2/token`;
  try {
    const res = await axios.post<TokenResponse>(tokenUrl, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      validateStatus: (s) => s >= 200 && s < 300,
    });
    if (!res.data?.access_token) {
      throw new Error('Hydra /oauth2/token: missing access_token in response');
    }
    return res.data;
  } catch (err) {
    const ax = err as AxiosError<{ error?: string; error_description?: string }>;
    const code = ax.response?.data?.error ?? ax.code ?? 'unknown';
    const desc = ax.response?.data?.error_description ?? ax.message;
    const synthetic = new Error(`Hydra /oauth2/token failed (${code}): ${desc}`);
    (synthetic as Error & { oauthError?: string }).oauthError = code;
    throw synthetic;
  }
};

const exchangeCodeForToken = (
  code: string,
  codeVerifier: string
): Promise<TokenResponse> => {
  const { clientId, redirectUri } = testConfiguration.endPoints.oidc;
  return postToken(
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: codeVerifier,
    })
  );
};

const refreshAccessToken = (refreshToken: string): Promise<TokenResponse> => {
  const { clientId } = testConfiguration.endPoints.oidc;
  return postToken(
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
    })
  );
};

const persist = (
  email: string,
  tokens: TokenResponse,
  persona?: ResolvedPersona
): CachedTokens => {
  const cached: CachedTokens = {
    client_id: testConfiguration.endPoints.oidc.clientId,
    identity_id: persona?.identityId,
    alkemio_actor_id: persona?.alkemioActorId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    access_expires_at: decodeJwtExp(tokens.access_token),
    obtained_at: Math.floor(Date.now() / 1000),
  };
  writeCache(email, cached);
  return cached;
};

/**
 * Bootstrap a fresh authorization_code via Hydra Admin API — no UI, no Kratos
 * session juggling. The caller is the test harness, not a browser, so we drive
 * Hydra's login_challenge / consent_challenge handlers directly through their
 * admin endpoints instead of walking through oidc-service's UI handlers.
 *
 * Sequence:
 *   1. GET /oauth2/auth — Hydra 302s to URLS_LOGIN?login_challenge=<id>.
 *   2. PUT /admin/oauth2/auth/requests/login/accept — supply the Kratos
 *      identity ID as `subject`. Hydra returns a redirect_to with login_verifier.
 *   3. GET that redirect — Hydra 302s to URLS_CONSENT?consent_challenge=<id>.
 *   4. PUT /admin/oauth2/auth/requests/consent/accept — grant scopes + audience.
 *      Hydra returns a redirect_to with consent_verifier.
 *   5. GET that redirect — Hydra 302s to <redirect_uri>?code=...&state=...
 *      We catch the code without ever following to the BFF.
 *   6. POST /oauth2/token grant=authorization_code — token-hook fires inside
 *      oidc-service and injects `alkemio_actor_id` from Kratos identity metadata.
 */
const bootstrapViaAdminApi = async (
  persona: ResolvedPersona
): Promise<TokenResponse> => {
  const { identityId, alkemioActorId } = persona;
  const codeVerifier = base64url(randomBytes(32));
  const codeChallenge = base64url(sha256(codeVerifier));
  const state = base64url(randomBytes(16));
  const nonce = base64url(randomBytes(16));

  const { hydraPublic, redirectUri } = testConfiguration.endPoints.oidc;
  const hydraOauth2Prefix = `${hydraPublic.replace(/\/$/, '')}/oauth2/`;
  const jar = new Map<string, string>();

  const authorizeUrl = buildAuthorizeUrl(state, nonce, codeChallenge);
  const loginRedirect = await getFollowingHydraRedirects(
    authorizeUrl,
    jar,
    (loc) => loc.includes('login_challenge=')
  );
  const loginChallenge = extractChallengeId(loginRedirect, 'login_challenge');
  const afterLogin = await acceptLoginChallenge(loginChallenge, identityId);

  const consentRedirect = await getFollowingHydraRedirects(
    afterLogin,
    jar,
    (loc) => loc.includes('consent_challenge=') || loc.startsWith(redirectUri)
  );

  let codeUrl = consentRedirect;
  if (consentRedirect.includes('consent_challenge=')) {
    const consentChallenge = extractChallengeId(consentRedirect, 'consent_challenge');
    const afterConsent = await acceptConsentChallenge(consentChallenge, alkemioActorId);
    codeUrl = await getFollowingHydraRedirects(
      afterConsent,
      jar,
      (loc) => loc.startsWith(redirectUri) || !loc.startsWith(hydraOauth2Prefix)
    );
  }

  const params = new URL(codeUrl).searchParams;
  const code = params.get('code');
  const returnedState = params.get('state');
  const error = params.get('error');
  if (error) {
    throw new Error(
      `OIDC authorize returned error=${error}` +
        ` description=${params.get('error_description') ?? ''}`
    );
  }
  if (!code) {
    throw new Error(`OIDC authorize: no code in ${codeUrl}`);
  }
  if (returnedState !== state) {
    throw new Error('OIDC authorize: state mismatch (CSRF)');
  }

  return exchangeCodeForToken(code, codeVerifier);
};

/**
 * Headless OIDC bearer acquisition for non-interactive API clients.
 * Tries cache, then refresh_token, then full admin-API bootstrap.
 *
 * Returns the Hydra access JWT; carries `alkemio_actor_id` claim provided
 * `oidc-service` token-hook resolves the Kratos identity (first-party scope
 * `alkemio` granted).
 *
 * The `password` parameter is currently ignored — Hydra Admin API does not
 * require it. Kept in the signature for source-compat with `getUserToken`
 * callers and for a possible future browser-flow fallback.
 */
export const getBearerViaOidc = async (
  email: string,
  _password?: string
): Promise<string> => {
  const cached = readCache(email);
  if (cached && isFreshEnough(cached)) {
    return cached.access_token;
  }

  if (cached?.refresh_token) {
    try {
      const refreshed = await refreshAccessToken(cached.refresh_token);
      const cachedPersona = cached.identity_id
        ? { identityId: cached.identity_id, alkemioActorId: cached.alkemio_actor_id }
        : undefined;
      return persist(email, refreshed, cachedPersona).access_token;
    } catch (err) {
      const oauthError = (err as Error & { oauthError?: string }).oauthError;
      if (oauthError !== 'invalid_grant' && oauthError !== 'invalid_token') {
        throw err;
      }
    }
  }

  await ensureHydraTestClient();

  const persona = await lookupKratosPersona(email);
  if (!persona.alkemioActorId) {
    throw new Error(
      `Kratos identity ${persona.identityId} for ${email} has no ` +
        `metadata_public.alkemio_actor_id — register the user via ` +
        `alkemio-server (or set the field via Kratos admin) before minting a bearer.`
    );
  }
  const fresh = await bootstrapViaAdminApi(persona);
  return persist(email, fresh, persona).access_token;
};
