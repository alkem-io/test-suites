import { randomUUID } from 'node:crypto';
import { expect } from 'vitest';
import { seedPlatformRoleUsers } from '@alkemio/tests-lib';
import {
  rawRequest,
  type RawResult,
} from '@functional-api/platform-roles/_support/raw-request';

/**
 * server#6614 / #6637 — the "record is gone" oracle, over GraphQL, no DB.
 *
 * Nearly every entity row owns one `authorization_policy` row. A policy that
 * still resolves after its owner was deleted is the observable form of an
 * orphan. The oracle is therefore:
 *
 *   1. before the delete, capture the owned records' ids,
 *   2. prove with the SAME token that they resolve (`expectPoliciesPresent`),
 *   3. delete the owner,
 *   4. assert the same lookups answer `ENTITY_NOT_FOUND` exactly
 *      (`expectPoliciesGone` / `expectLookupGone`).
 *
 * Why the token is the Platform Operations Admin and why step 2 is mandatory:
 * `lookup.authorizationPolicy` loads the row BEFORE it checks
 * PLATFORM_OPERATIONS_ADMIN, so a token without that privilege gets
 * ENTITY_NOT_FOUND for a missing id and FORBIDDEN for an existing one. A
 * "gone" assertion made with the wrong token would pass vacuously.
 *
 * The code is asserted EXACTLY: `lookup.profile` / `storageBucket` /
 * `document` load before their READ check too, so on a server without the fix
 * an orphan can answer FORBIDDEN instead of data. "Has an error" would let it
 * pass.
 */

export const ENTITY_NOT_FOUND = 'ENTITY_NOT_FOUND';

/** label -> id, as captured before the delete. The label names the leak in a red. */
export type OwnedIds = Record<string, string>;

let operationsAdmin: Promise<string> | undefined;

/** Platform Operations Admin token. Memoised; `seedPlatformRoleUsers` is idempotent. */
export const operationsAdminToken = (): Promise<string> => {
  operationsAdmin ??= seedPlatformRoleUsers()
    .then(seeded => seeded.tokens.PLATFORM_OPERATIONS_ADMIN)
    .catch((e: unknown) => {
      operationsAdmin = undefined;
      throw e;
    });
  return operationsAdmin;
};

/**
 * Names the captured ids. Throws at SETUP when any is empty, so a vacuous
 * capture (a field that came back null) fails loudly instead of turning every
 * later assertion into a no-op.
 */
export const ids = (
  captured: Record<string, string | null | undefined>
): OwnedIds => {
  const missing = Object.entries(captured)
    .filter(([, id]) => typeof id !== 'string' || id.length === 0)
    .map(([label]) => label);
  if (missing.length > 0) {
    throw new Error(
      `owned-records: nothing captured for [${missing.join(', ')}]; the oracle would be vacuous`
    );
  }
  return captured as OwnedIds;
};

type LookupField =
  | 'authorizationPolicy'
  | 'profile'
  | 'storageBucket'
  | 'document'
  | 'license'
  | 'callout'
  | 'space';

type LookupData = { lookup?: Partial<Record<LookupField, { id: string }>> };

const lookup = (
  token: string,
  field: LookupField,
  id: string
): Promise<RawResult<LookupData>> =>
  rawRequest<LookupData>(
    token,
    `query($id: UUID!) { lookup { ${field}(ID: $id) { id } } }`,
    { id }
  );

export const policyLookup = (token: string, id: string) =>
  lookup(token, 'authorizationPolicy', id);

const outcomeOf = (r: RawResult<LookupData>): string =>
  r.errors.length > 0
    ? `error ${r.errors[0].extensions?.code ?? '(no code)'}: ${r.errors[0].message}`
    : `resolved ${JSON.stringify(r.data?.lookup)}`;

const resolves = (
  r: RawResult<LookupData>,
  field: LookupField,
  id: string
): boolean => r.errors.length === 0 && r.data?.lookup?.[field]?.id === id;

/**
 * What "this id does not exist" looks like per lookup. Everything answers
 * ENTITY_NOT_FOUND except `lookup.storageBucket`, which lets TypeORM's own
 * `EntityNotFoundError` through with code UNSPECIFIED (established 2026-10-16,
 * server develop: it is the answer for a random UUID too, so it is the shape
 * of a missing bucket, not of a leak). That one message is accepted for that
 * one field; "any error" is never accepted.
 */
const isNotFoundAnswer = (
  r: RawResult<LookupData>,
  field: LookupField
): boolean => {
  const error = r.errors[0];
  if (!error) return false;
  if (error.extensions?.code === ENTITY_NOT_FOUND) return true;
  return (
    field === 'storageBucket' &&
    error.extensions?.code === 'UNSPECIFIED' &&
    error.message.startsWith(
      'Could not find any entity of type "StorageBucket"'
    )
  );
};

const isGone = (r: RawResult<LookupData>, field: LookupField): boolean =>
  !r.data?.lookup?.[field] && isNotFoundAnswer(r, field);

/**
 * Positive control: every captured policy resolves with the SAME token the
 * negative assertion will use. Collects all failures into one assertion.
 */
export const expectPoliciesPresent = async (token: string, owned: OwnedIds) => {
  const missing: string[] = [];
  for (const [label, id] of Object.entries(owned)) {
    const r = await policyLookup(token, id);
    if (!resolves(r, 'authorizationPolicy', id)) {
      missing.push(`${label} (${id}): ${outcomeOf(r)}`);
    }
  }
  expect(
    missing,
    'authorization policies that should exist before the delete (wrong token, or the capture is stale)'
  ).toEqual([]);
};

/**
 * Every captured policy answers ENTITY_NOT_FOUND. Collects all survivors into
 * one assertion so a single red names the whole leak.
 * `context` goes into the failure message so a red says which owner leaked.
 */
export const expectPoliciesGone = async (
  token: string,
  owned: OwnedIds,
  context = 'owned records'
) => {
  const survivors: string[] = [];
  for (const [label, id] of Object.entries(owned)) {
    const r = await policyLookup(token, id);
    if (!isGone(r, 'authorizationPolicy')) {
      survivors.push(`${label} (${id}): ${outcomeOf(r)}`);
    }
  }
  expect(
    survivors,
    `${context}: authorization policies still present after the delete (orphans)`
  ).toEqual([]);
};

/** `lookup.<field>(ID)` answers ENTITY_NOT_FOUND. */
export const expectLookupGone = async (
  token: string,
  field: Exclude<LookupField, 'authorizationPolicy'>,
  id: string
) => {
  const r = await lookup(token, field, id);
  expect(
    isGone(r, field),
    `lookup.${field}(${id}) should answer ${ENTITY_NOT_FOUND} after the delete, got: ${outcomeOf(r)}`
  ).toBe(true);
};

/**
 * Self-check that a missing id answers the not-found shape this oracle
 * accepts, on the stack under test, for every lookup a case relies on. It
 * proves the shape belongs to "no such record" and not to a leak.
 */
export const expectRandomIdIsNotFound = async (
  token: string,
  ...fields: LookupField[]
) => {
  for (const field of fields) {
    const r = await lookup(token, field, randomUUID());
    expect(
      isGone(r, field),
      `the oracle assumes a missing id answers not-found on lookup.${field}, got: ${outcomeOf(r)}`
    ).toBe(true);
  }
};

export const expectRandomPolicyIsNotFound = (token: string) =>
  expectRandomIdIsNotFound(token, 'authorizationPolicy');
