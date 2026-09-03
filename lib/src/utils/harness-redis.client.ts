import Redis from 'ioredis';
import { testConfiguration } from '../config/test.configuration';
import { assertLoopbackInternal } from '../config/loopback-guard';
import { LogManager } from "../scenario/LogManager";

/**
 * Direct Redis access to the server's BFF session store, used only by the
 * self-account-deletion session-freshness it-specs (054-delete-own-account)
 * to fabricate and age `alkemio_session` records deterministically.
 *
 * Mirrors `server/src/core/auth/oidc/session-store.redis.ts`'s
 * `SESSION_KEY_PREFIX` and `AlkemioSessionPayload` shape. Duplicated
 * deliberately rather than imported: the harness has no dependency on the
 * server's source tree, and this key format is pinned by contract
 * (`specs/054-delete-own-account/contracts/deleteuser-self-branch.md` §2),
 * not by a shared import.
 */
export const BFF_SESSION_KEY_PREFIX = 'alkemio:sid:';

let redisClient: Redis | undefined;

const getHarnessRedisClient = (): Redis => {
  if (!redisClient) {
    const { host, port } = testConfiguration.redis;
    assertLoopbackInternal('Harness Redis (REDIS_HOST)', { host });
    redisClient = new Redis({
      host,
      port,
      // Fail fast rather than hang the whole run if the compose Redis port
      // hasn't been resolved onto the env vars yet (see config comment).
      maxRetriesPerRequest: 3,
      connectTimeout: 2_000,
    });
    // Without a listener an emitted `error` (connection loss, retry
    // exhaustion) is an unhandled EventEmitter error that kills the worker;
    // with one, the awaited command rejects and only that test fails.
    redisClient.on('error', error => {
      LogManager.getLogger().error(
        `[harness-redis] client error: ${String(error)}`
      );
    });
  }
  return redisClient;
};

/**
 * The `express-session` cookie sub-object every stored session (real or
 * fabricated) MUST carry. `Store.prototype.createSession`
 * (`express-session/session/store.js`) dereferences `sess.cookie.expires`
 * and `sess.cookie.originalMaxAge` on EVERY request that presents this
 * session's cookie — BEFORE any Passport strategy runs — so a payload
 * written without one throws `TypeError: Cannot read properties of
 * undefined (reading 'expires')` inside the session middleware itself and
 * 500s the request. `server/src/core/auth/oidc/session-store.redis.ts`
 * documents the identical failure mode for its own tombstone fallback and
 * carries this same shape; mirrored here for the same reason mint-bff-
 * session.ts mirrors the rest of `AlkemioSessionPayload` — the harness has
 * no dependency on the server's source tree.
 */
export type BffSessionCookie = {
  originalMaxAge: number;
  /** ISO-8601 — `express-session` re-hydrates this into a `Date` on read. */
  expires: string;
  httpOnly: boolean;
  path: string;
};

export type BffSessionPayload = {
  cookie: BffSessionCookie;
  access_token: string;
  id_token: string;
  refresh_token: string;
  expires_at: number;
  absolute_expires_at: number;
  sub: string;
  alkemio_actor_id?: string | null;
  refresh_failure_count: number;
  refresh_failure_streak_started_at: number | null;
  last_refreshed_at?: number | null;
  last_extended_at?: number | null;
  created_at: number;
  client_id: string;
  request_context_cache?: { display_name?: string; email?: string } | null;
  terminated_at?: number | null;
  terminated_reason?: string | null;
};

const sessionKey = (sessionId: string): string =>
  BFF_SESSION_KEY_PREFIX + sessionId;

export const readBffSession = async (
  sessionId: string
): Promise<BffSessionPayload | null> => {
  const raw = await getHarnessRedisClient().get(sessionKey(sessionId));
  return raw === null ? null : (JSON.parse(raw) as BffSessionPayload);
};

export const writeBffSession = async (
  sessionId: string,
  payload: BffSessionPayload,
  ttlSeconds: number
): Promise<void> => {
  await getHarnessRedisClient().set(
    sessionKey(sessionId),
    JSON.stringify(payload),
    'EX',
    Math.max(1, Math.floor(ttlSeconds))
  );
};

/**
 * Rewrites an already-fabricated session's raw JSON via `mutate`, preserving
 * its remaining Redis TTL. This is the primitive behind every US3 negative
 * case (stale / zeroed / missing / unparseable `created_at`, silent-refresh
 * fields advancing without it) — each is just a different `mutate`:
 *
 *   mutateBffSession(id, p => ({ ...p, created_at: staleEpochS }))        // stale
 *   mutateBffSession(id, p => ({ ...p, created_at: 0 }))                  // zeroed
 *   mutateBffSession(id, ({ created_at, ...rest }) => rest)               // missing
 *   mutateBffSession(id, p => ({ ...p, created_at: 'not-a-number' }))     // unparseable
 *
 * Operates on the raw JSON object (not the typed `BffSessionPayload`)
 * specifically so the missing/unparseable cases — which are not valid
 * `BffSessionPayload` values — are representable at all.
 */
export const mutateBffSession = async (
  sessionId: string,
  mutate: (
    payload: Record<string, unknown>
  ) => Record<string, unknown>
): Promise<void> => {
  const client = getHarnessRedisClient();
  const key = sessionKey(sessionId);
  const raw = await client.get(key);
  if (raw === null) {
    throw new Error(
      `mutateBffSession: no BFF session found for sessionId '${sessionId}' — was it minted via mintBffSession first?`
    );
  }
  const ttl = await client.ttl(key);
  const current = JSON.parse(raw) as Record<string, unknown>;
  const updated = mutate(current);
  await client.set(
    key,
    JSON.stringify(updated),
    'EX',
    ttl > 0 ? ttl : 3_600
  );
};

/** Convenience wrapper over `mutateBffSession` for the common case — ages a
 * session to a specific `created_at` (epoch seconds) without touching
 * anything else it carries. */
export const ageBffSessionCreatedAt = async (
  sessionId: string,
  createdAtEpochS: number
): Promise<void> =>
  mutateBffSession(sessionId, payload => ({
    ...payload,
    created_at: createdAtEpochS,
  }));

/**
 * Finds the sessionId of the most-recently-created BFF session belonging to
 * Kratos identity `sub` — the lookup a walk needs to age a REAL, browser-
 * created session (e.g. the US3 re-authentication acceptance walk) without
 * ever reading the browser's own signed cookie. `KEYS` (not `SCAN`) is
 * deliberate: this only ever runs against a small local/CI compose Redis
 * (`assertLoopbackInternal` in `getHarnessRedisClient` already refuses
 * anything else), where a full key scan is instant and the simplicity is
 * worth more than the eviction-safety `SCAN` buys on a production-sized
 * keyspace.
 */
export const findBffSessionIdBySub = async (
  sub: string
): Promise<string> => {
  const client = getHarnessRedisClient();
  const keys = await client.keys(`${BFF_SESSION_KEY_PREFIX}*`);
  let newest: { sessionId: string; createdAt: number } | undefined;

  for (const key of keys) {
    const raw = await client.get(key);
    if (raw === null) continue;
    const payload = JSON.parse(raw) as Partial<BffSessionPayload>;
    if (payload.sub !== sub) continue;
    const createdAt =
      typeof payload.created_at === 'number' ? payload.created_at : 0;
    if (!newest || createdAt > newest.createdAt) {
      newest = { sessionId: key.slice(BFF_SESSION_KEY_PREFIX.length), createdAt };
    }
  }

  if (!newest) {
    throw new Error(
      `findBffSessionIdBySub: no BFF session found in Redis for Kratos sub '${sub}' — was the subject logged in through a real browser session first?`
    );
  }
  return newest.sessionId;
};

export const deleteBffSession = async (sessionId: string): Promise<void> => {
  await getHarnessRedisClient().del(sessionKey(sessionId));
};

/** Closes the pooled Redis connection. Call from a suite's `afterAll` if the
 * suite is the last consumer in its Vitest project run; safe to skip
 * otherwise (the process exits and drops the socket regardless). */
export const closeHarnessRedis = async (): Promise<void> => {
  if (redisClient) {
    redisClient.disconnect();
    redisClient = undefined;
  }
};
