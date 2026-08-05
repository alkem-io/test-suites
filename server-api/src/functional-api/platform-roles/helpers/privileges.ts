import { expect } from 'vitest';
import axios from 'axios';
import { TestUser } from '@alkemio/tests-lib';
import { testConfiguration } from '@alkemio/tests-lib/config/test.configuration';
import { graphqlRequestAuth } from '@alkemio/tests-lib/utils/graphql.request';

/**
 * workspace#027-platform-role-redesign — the BOTH-POLICIES privilege reader.
 *
 * The defect class this feature keeps producing is reading ONE policy and
 * concluding the user has nothing: the platform ENTITY policy
 * (`platform.authorization`) and the platform ROLE SET policy
 * (`platform.roleSet.authorization`) are different policies with different
 * rules, and the assignment/holder-read privileges live only on the second.
 * Every reader here therefore returns both, in one document, from one request
 * — so no consumer can accidentally look at half the answer.
 *
 * `reportedForToken` is the primitive this tree did not have.
 * `graphqlRequestAuth` resolves its token through `TestUserManager` and so
 * accepts only a `TestUser` enum member; a subject minted mid-test (see
 * `./disposable-subject`) has a real token but no enum member, and therefore
 * could never read its OWN privileges. That is why group B was previously
 * asserted from the GRANTER's holder list instead of from the subject.
 */

const PRIVILEGES_QUERY = {
  operationName: 'PlatformPrivilegeContract',
  query: `query PlatformPrivilegeContract {
    platform {
      authorization { myPrivileges }
      roleSet { myRoles authorization { myPrivileges } }
    }
  }`,
  variables: {},
};

export type Reported = {
  platform: string[];
  roleSet: string[];
  myRoles: string[];
};

type PlatformPayload = {
  authorization?: { myPrivileges?: string[] };
  roleSet?: {
    myRoles?: string[];
    authorization?: { myPrivileges?: string[] };
  };
};

const toReported = (platform: PlatformPayload): Reported => ({
  platform: platform.authorization?.myPrivileges ?? [],
  roleSet: platform.roleSet?.authorization?.myPrivileges ?? [],
  myRoles: platform.roleSet?.myRoles ?? [],
});

/** Reads both policies as one of the seeded `TestUser` fixtures. */
export const reportedForUser = async (user: TestUser): Promise<Reported> => {
  const response = await graphqlRequestAuth(PRIVILEGES_QUERY, user);
  const platform = response.body?.data?.platform;

  if (!platform) {
    // Loud, not silent: a null platform here means the fixture user could not
    // authenticate or the query was rejected outright, and every assertion
    // downstream would otherwise report "missing privilege" for a cause that
    // has nothing to do with privileges.
    throw new Error(
      `privileges: no platform payload for ${user} — ` +
        `errors: ${JSON.stringify(response.body?.errors ?? response.body).slice(0, 400)}`
    );
  }

  return toReported(platform);
};

/**
 * Reads both policies as WHOEVER holds `token` — the read-as-the-subject path.
 *
 * axios (already a server-api dependency) rather than supertest, which is a
 * `lib` dependency this package does not declare, and rather than the
 * generated client, which throws on any GraphQL error instead of returning
 * one. `validateStatus` is disabled so a 401/403 arrives as a payload to
 * report rather than a rejected promise with no body.
 */
export const reportedForToken = async (token: string): Promise<Reported> => {
  const response = await axios.post(
    testConfiguration.endPoints.graphql.private,
    { ...PRIVILEGES_QUERY },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      validateStatus: () => true,
    }
  );
  const platform = response.data?.data?.platform as PlatformPayload | undefined;

  if (!platform) {
    // The token itself is never interpolated into the message — it is a live
    // credential for the duration of the run.
    throw new Error(
      'privileges: no platform payload for the supplied token — ' +
        `errors: ${JSON.stringify(response.data?.errors ?? response.data).slice(0, 400)}`
    );
  }

  return toReported(platform);
};

const sortedUnique = (values: readonly string[]): string[] =>
  [...new Set(values)].sort();

const added = (before: readonly string[], after: readonly string[]): string[] =>
  sortedUnique(after.filter(value => !before.includes(value)));

/**
 * The handover's group B shape: what a grant ADDED and what a revoke REMOVED,
 * on each policy independently. Steady-state membership (`toContain`) cannot
 * see an over-broad role that also reports something extra; a delta can.
 */
export const privilegeDelta = (
  before: Reported,
  after: Reported
): {
  platformAdded: string[];
  platformRemoved: string[];
  roleSetAdded: string[];
  roleSetRemoved: string[];
  rolesAdded: string[];
  rolesRemoved: string[];
} => ({
  platformAdded: added(before.platform, after.platform),
  platformRemoved: added(after.platform, before.platform),
  roleSetAdded: added(before.roleSet, after.roleSet),
  roleSetRemoved: added(after.roleSet, before.roleSet),
  rolesAdded: added(before.myRoles, after.myRoles),
  rolesRemoved: added(after.myRoles, before.myRoles),
});

/**
 * B6, the highest-value case in the handover: after a revoke the FULL set on
 * BOTH policies must be byte-identical to the pre-grant baseline.
 *
 * Set equality, per policy, never `toContain` — the failure mode being pinned
 * is a cascaded privilege LEFT BEHIND by a revoke, which every containment
 * assertion in this tree passes cleanly.
 */
export const expectSamePrivilegeSets = (
  before: Reported,
  after: Reported,
  message: string
): void => {
  expect(
    sortedUnique(after.platform),
    `${message} — the PLATFORM policy did not return to its baseline`
  ).toEqual(sortedUnique(before.platform));

  expect(
    sortedUnique(after.roleSet),
    `${message} — the ROLE SET policy did not return to its baseline`
  ).toEqual(sortedUnique(before.roleSet));
};
