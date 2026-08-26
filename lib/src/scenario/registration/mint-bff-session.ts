import { sign as signCookieValue } from 'cookie-signature';
import { randomUUID } from 'crypto';
import { testConfiguration } from '../../config/test.configuration';
import { decodeJwtPayloadUnsafe } from '../../utils/decode-jwt-unsafe';
import {
  type BffSessionPayload,
  writeBffSession,
} from '../../utils/harness-redis.client';
import { getUserToken } from './get-user-token';

export type MintedBffSession = {
  sessionId: string;
  /** Ready to send as the raw `Cookie` request header, e.g. via
   * `postGraphqlRaw(query, { cookieHeader })`. */
  cookieHeader: string;
};

/**
 * Fabricates a valid BFF (`alkemio_session`) cookie session directly in
 * Redis, bypassing the Kratos/Hydra OIDC HTTP round trip the harness has no
 * headless way to drive (that dance crosses Kratos, Hydra, and the
 * `oidc-service` login/consent bridge — none of it is reachable as a plain
 * HTTP POST the way Kratos's own native login is).
 *
 * This is deliberate, not a shortcut around the freshness gate under test.
 * `ActorContext.issuedAt` is stamped per-request from the session's
 * `created_at` (`server/src/core/auth/oidc/strategies/cookie-session.strategy.ts`),
 * and the it-specs need DETERMINISTIC control over exactly that value — fresh,
 * 16-minutes-stale, zeroed, missing, unparseable — which a real login can
 * never produce on demand (it only ever mints "fresh right now"). Aging an
 * already-minted session afterwards is `mutateBffSession` /
 * `ageBffSessionCreatedAt` (`utils/harness-redis.client.ts`).
 *
 * The technique: write the flat `AlkemioSessionPayload` shape straight to the
 * `alkemio:sid:<id>` Redis key `session-store.redis.ts`'s `SessionStoreHandle`
 * reads, then hand back a `Cookie` header signed the same way
 * `express-session` signs its own (`'s:' + cookieSignature.sign(sid, secret)`
 * — verified against `express-session@1.19.0`'s `setcookie`/`getcookie`).
 * `CookieSessionStrategy.validate` reads `req.sessionID` (set by the REAL
 * express-session middleware unsigning this same cookie with the same
 * secret) and reads the store directly by that id — it does not care whether
 * the payload was ever written by an actual login.
 *
 * Only works when `testConfiguration.oidc.sessionSigningKey` matches the
 * target stack's `SESSION_SIGNING_KEY` — true for an unmodified local or CI
 * compose stack (both fall back to the same committed `alkemio.yml`
 * placeholder), and deliberately never true for a real deployed environment,
 * which this flow must never be pointed at.
 */
export const mintBffSession = async (
  kratosIdentityId: string,
  alkemioActorId: string,
  options?: { createdAtEpochS?: number }
): Promise<MintedBffSession> => {
  const nowS = Math.floor(Date.now() / 1000);
  const createdAtEpochS = options?.createdAtEpochS ?? nowS;
  const { sessionCookieName, sessionSigningKey, webClientId, idleTtlS, absoluteTtlS } =
    testConfiguration.oidc;

  const sessionId = randomUUID();
  const payload: BffSessionPayload = {
    access_token: `harness-fabricated-access-token-${sessionId}`,
    id_token: `harness-fabricated-id-token-${sessionId}`,
    refresh_token: `harness-fabricated-refresh-token-${sessionId}`,
    expires_at: nowS + 600,
    // Anchored to the REAL current time, deliberately independent of
    // `createdAtEpochS` — the absolute ceiling is a login-time fact, not a
    // property of the freshness window under test. A 16-minutes-stale
    // session for US3 must not also trip the unrelated 30-day ceiling.
    absolute_expires_at: nowS + absoluteTtlS,
    sub: kratosIdentityId,
    alkemio_actor_id: alkemioActorId,
    refresh_failure_count: 0,
    refresh_failure_streak_started_at: null,
    last_refreshed_at: null,
    last_extended_at: null,
    created_at: createdAtEpochS,
    client_id: webClientId,
    request_context_cache: null,
    terminated_at: null,
    terminated_reason: null,
  };

  await writeBffSession(sessionId, payload, idleTtlS);

  const cookieValue = 's:' + signCookieValue(sessionId, sessionSigningKey);
  return {
    sessionId,
    cookieHeader: `${sessionCookieName}=${cookieValue}`,
  };
};

/**
 * Convenience composition for the common it-spec shape: a plain registered
 * user (never a `TestUser` persona — those are covered by the ordinary
 * bearer path) needs a fresh or aged BFF session to call `deleteUser` on
 * themselves. Mints a non-interactive-login token ONLY to read the Kratos
 * identity id off its `sub` claim (`non-interactive-login.service.ts` sets
 * `sub = identity.id`) — the token itself is discarded; the returned session
 * is cookie-based, not bearer-based.
 */
export const mintBffSessionForUser = async (
  email: string,
  alkemioActorId: string,
  options?: { createdAtEpochS?: number }
): Promise<MintedBffSession> => {
  const nonInteractiveToken = await getUserToken(email);
  const kratosIdentityId = decodeJwtPayloadUnsafe(nonInteractiveToken).sub;
  if (typeof kratosIdentityId !== 'string' || kratosIdentityId.length === 0) {
    throw new Error(
      `mintBffSessionForUser: non-interactive-login token for '${email}' carried no 'sub' claim`
    );
  }
  return mintBffSession(kratosIdentityId, alkemioActorId, options);
};
