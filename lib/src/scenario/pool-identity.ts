import { TestUser } from '../common/enums/test.user';

/**
 * Single source of truth for deriving a shared-pool identity's real email
 * from its role (`TestUser`) and worker slot. Worker-index 0 keeps the
 * original unsuffixed address (`${user}@alkem.io`) — the identity every
 * pre-existing fixture, hardcoded literal, and `NIGHTLY_MAX_WORKERS=1` run
 * already expects. Worker-index N>0 gets `${user}+wN@alkem.io` (RFC 5322
 * plus-addressing — verified against this stack's Kratos identity schema
 * and the server's non-interactive-login + nameID-uniquification path
 * before relying on it), so every worker's pool is a real,
 * independently-provisioned set of Kratos identities, not an alias over
 * worker-0's.
 *
 * Shared between `TestUserManager` (mints + resolves) and the provisioning
 * paths (`provision-test-identities.ts`, `register-test-user.ts`) so the
 * identifier scheme can never drift between "what gets created in
 * Kratos/Alkemio" and "what a worker looks up" — the exact drift class the
 * `TestUser`-as-single-source-of-truth discipline elsewhere in this package
 * already guards against.
 */
export const POOL_IDENTITY_DOMAIN = 'alkem.io';

export const buildPoolIdentifierEmail = (
  user: TestUser,
  workerIndex = 0
): string =>
  workerIndex === 0
    ? `${user}@${POOL_IDENTITY_DOMAIN}`
    : `${user}+w${workerIndex}@${POOL_IDENTITY_DOMAIN}`;
