import { randomUUID } from 'node:crypto';
import { expect } from 'vitest';
import { seedPlatformRoleUsers } from '@alkemio/tests-lib';
import {
  rawRequest,
  type RawResult,
} from '@functional-api/platform-roles/_support/raw-request';
import { NEUTRAL_ERROR_CODE } from '@functional-api/error-response/error-response.constants';

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
 *   4. assert the same lookups return no record and only the generic
 *      FORBIDDEN_POLICY code (`expectPoliciesGone` / `expectLookupGone`).
 *
 * Why step 2 is mandatory: a missing record and a refused read reach the
 * caller with the same FORBIDDEN_POLICY code and sentence, so that answer
 * alone proves nothing. Step 2 shows the same token reads the record while it
 * exists; the generic answer to the same lookup after the delete then means it
 * is gone, not refused. The token is the Platform Operations Admin because
 * `lookup.authorizationPolicy` requires PLATFORM_OPERATIONS_ADMIN.
 *
 * The code is asserted EXACTLY: any other code, or a lookup that still
 * returns the record, is a survivor. "Has an error" would let it pass.
 */

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
  | 'space'
  | 'room'
  | 'template'
  | 'user';

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

/** What a "gone" check may print: the error codes, or that the lookup resolved. */
const codesOf = (r: RawResult<LookupData>): string =>
  r.errors.length > 0
    ? r.errors.map(e => e.extensions?.code ?? '(no code)').join(', ')
    : 'resolved';

const resolves = (
  r: RawResult<LookupData>,
  field: LookupField,
  id: string
): boolean => r.errors.length === 0 && r.data?.lookup?.[field]?.id === id;

/**
 * No record, and at least one error, every one with the generic
 * FORBIDDEN_POLICY code. Any other code fails; "any error" is never accepted.
 */
const isGone = (r: RawResult<LookupData>, field: LookupField): boolean =>
  !r.data?.lookup?.[field] &&
  r.errors.length > 0 &&
  r.errors.every(e => e.extensions?.code === NEUTRAL_ERROR_CODE);

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
 * Every captured policy is gone (`isGone`). Collects all survivors, by label
 * and code, into one assertion so a single red names every survivor.
 * `context` goes into the failure message so a red says which owner it was.
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
      survivors.push(`${label}: ${codesOf(r)}`);
    }
  }
  expect(
    survivors,
    `${context}: authorization policies still present after the delete (orphans)`
  ).toEqual([]);
};

/** `lookup.<field>(ID)` is gone (`isGone`). */
export const expectLookupGone = async (
  token: string,
  field: Exclude<LookupField, 'authorizationPolicy'>,
  id: string
) => {
  const r = await lookup(token, field, id);
  expect(
    isGone(r, field),
    `lookup.${field} should answer only ${NEUTRAL_ERROR_CODE} after the delete, got: ${codesOf(r)}`
  ).toBe(true);
};

/**
 * Self-check that a missing id answers the shape this oracle accepts as gone,
 * on the stack under test, for every lookup a case relies on.
 */
export const expectRandomIdIsNotFound = async (
  token: string,
  ...fields: LookupField[]
) => {
  for (const field of fields) {
    const r = await lookup(token, field, randomUUID());
    expect(
      isGone(r, field),
      `the oracle assumes a missing id answers ${NEUTRAL_ERROR_CODE} on lookup.${field}, got: ${codesOf(r)}`
    ).toBe(true);
  }
};

export const expectRandomPolicyIsNotFound = (token: string) =>
  expectRandomIdIsNotFound(token, 'authorizationPolicy');
