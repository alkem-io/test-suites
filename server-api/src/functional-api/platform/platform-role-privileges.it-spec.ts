/**
 * Platform role → platform privilege propagation (workspace#027-platform-role-redesign,
 * workspace#032-platform-ops-admin-role).
 *
 * Regression coverage for the reported defect: after `assignPlatformRoleToUser`
 * the holder did NOT gain the corresponding privilege on the Platform
 * authorization policy until an `authorizationPolicyResetOnPlatform` was run,
 * and some time later the privilege disappeared again.
 *
 * The suite therefore asserts, WITHOUT ever calling a platform authorization
 * reset (deliberate — a reset here would mask exactly the bug under test):
 *
 *  1. Baseline — a plain registered user has no PLATFORM_OPERATIONS_ADMIN in
 *     `platform.authorization.myPrivileges`; the global admin does.
 *  2. Grant — immediately after assigning the platform role, the privilege IS
 *     present in myPrivileges (no reset, no waiting for a cache TTL).
 *  3. Mutation access — while holding the role, the operational mutation family
 *     passes the authorization gate; without it every one of them is rejected
 *     with `unable to grant 'platform-operations-admin'`.
 *  4. Revoke — the privilege and the mutation access are withdrawn immediately.
 *
 * Raw GraphQL is used throughout rather than the generated client: the
 * generated schema in tests-lib predates the PLATFORM_OPERATIONS_ADMIN role,
 * so the typed operations cannot express it yet.
 */
import {
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { graphqlRequestAuth } from '@alkemio/tests-lib/utils/graphql.request';

const OPS_ROLE = 'PLATFORM_OPERATIONS_ADMIN';
const OPS_PRIVILEGE = 'PLATFORM_OPERATIONS_ADMIN';
/** Wire form of the privilege as it appears in the authorization error text. */
const OPS_PRIVILEGE_DENIED = /unable to grant 'platform-operations-admin'/i;

/** A syntactically valid UUID that does not resolve to any entity. */
const ABSENT_UUID = '00000000-0000-4000-8000-000000000000';

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'platform-role-privileges',
};

let subjectUserId = '';

type GraphqlResponse = {
  body?: {
    data?: unknown;
    errors?: { message?: string }[];
  };
};

const gql = async (
  query: string,
  user?: TestUser,
  variables: Record<string, unknown> | null = null
): Promise<GraphqlResponse> =>
  graphqlRequestAuth({ operationName: null, query, variables }, user);

type PlatformAuthorizationData = {
  platform?: { authorization?: { myPrivileges?: string[] } };
};

const platformMyPrivileges = async (user: TestUser): Promise<string[]> => {
  const response = await gql(
    `query platformAuthorization {
      platform {
        id
        authorization {
          id
          myPrivileges
        }
      }
    }`,
    user
  );
  const data = response.body?.data as PlatformAuthorizationData | undefined;
  return data?.platform?.authorization?.myPrivileges ?? [];
};

const assignOpsRole = async (actorID: string) =>
  gql(
    `mutation assignPlatformRoleToUser {
      assignPlatformRoleToUser(roleData: { actorID: "${actorID}", role: ${OPS_ROLE} }) {
        id
      }
    }`,
    TestUser.GLOBAL_ADMIN
  );

const removeOpsRole = async (actorID: string) =>
  gql(
    `mutation removePlatformRoleFromUser {
      removePlatformRoleFromUser(roleData: { actorID: "${actorID}", role: ${OPS_ROLE} }) {
        id
      }
    }`,
    TestUser.GLOBAL_ADMIN
  );

const errorMessages = (response: GraphqlResponse): string =>
  (response.body?.errors ?? []).map(error => error?.message ?? '').join(' | ');

/**
 * The operational & maintenance mutation family gated on
 * AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN.
 *
 * `sideEffectFree` marks the probes that are safe to actually execute once the
 * gate is passed — they fail afterwards on a not-found argument, which proves
 * the authorization check let them through without doing platform-wide work.
 * The rest are asserted on the deny path only: executing them for real would
 * trigger a full search re-ingest / geo backfill / notification pruning.
 */
const OPS_MUTATIONS: {
  name: string;
  query: string;
  sideEffectFree: boolean;
}[] = [
  {
    name: 'adminUpdateContributorAvatars',
    query: `mutation adminUpdateContributorAvatars {
      adminUpdateContributorAvatars(profileID: "${ABSENT_UUID}") { id }
    }`,
    sideEffectFree: true,
  },
  {
    name: 'adminSearchIngestFromScratch',
    query: `mutation adminSearchIngestFromScratch {
      adminSearchIngestFromScratch
    }`,
    sideEffectFree: false,
  },
  {
    name: 'adminUpdateGeoLocationData',
    query: `mutation adminUpdateGeoLocationData {
      adminUpdateGeoLocationData
    }`,
    sideEffectFree: false,
  },
  {
    name: 'adminInAppNotificationsPrune',
    query: `mutation adminInAppNotificationsPrune {
      adminInAppNotificationsPrune { removedCountOutsideRetentionPeriod }
    }`,
    sideEffectFree: false,
  },
];

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
  subjectUserId = TestUserManager.users.qaUser.id;
});

afterAll(async () => {
  // Leave the platform in the state the suite found it in, whatever failed.
  await removeOpsRole(subjectUserId);
});

describe('Platform role grant → platform privilege (no auth reset)', () => {
  beforeEach(async () => {
    await removeOpsRole(subjectUserId);
  });

  test('global admin holds the operations privilege on the platform policy', async () => {
    const privileges = await platformMyPrivileges(TestUser.GLOBAL_ADMIN);

    expect(privileges).toContain(OPS_PRIVILEGE);
  });

  test('a user without the role does not hold the operations privilege', async () => {
    const privileges = await platformMyPrivileges(TestUser.QA_USER);

    expect(privileges).not.toContain(OPS_PRIVILEGE);
  });

  test('assigning the role grants the privilege immediately — no authorization reset', async () => {
    const before = await platformMyPrivileges(TestUser.QA_USER);
    expect(before).not.toContain(OPS_PRIVILEGE);

    const assign = await assignOpsRole(subjectUserId);
    expect(errorMessages(assign)).toEqual('');

    const after = await platformMyPrivileges(TestUser.QA_USER);

    // No authorizationPolicyResetOnPlatform between the two reads. If this
    // fails, the platform authorization policy in the database is missing the
    // credential rule for the role (regenerated only by a reset), or the grant
    // did not invalidate the actor's cached credentials.
    expect(after).toContain(OPS_PRIVILEGE);
  });

  test('removing the role withdraws the privilege immediately', async () => {
    await assignOpsRole(subjectUserId);
    expect(await platformMyPrivileges(TestUser.QA_USER)).toContain(
      OPS_PRIVILEGE
    );

    const remove = await removeOpsRole(subjectUserId);
    expect(errorMessages(remove)).toEqual('');

    expect(await platformMyPrivileges(TestUser.QA_USER)).not.toContain(
      OPS_PRIVILEGE
    );
  });

  test('grant → revoke → grant stays consistent across cycles', async () => {
    for (let cycle = 0; cycle < 3; cycle++) {
      await assignOpsRole(subjectUserId);
      expect(await platformMyPrivileges(TestUser.QA_USER)).toContain(
        OPS_PRIVILEGE
      );

      await removeOpsRole(subjectUserId);
      expect(await platformMyPrivileges(TestUser.QA_USER)).not.toContain(
        OPS_PRIVILEGE
      );
    }
  });
});

describe('Operational mutation access follows the platform role', () => {
  beforeEach(async () => {
    await removeOpsRole(subjectUserId);
  });

  test.each(OPS_MUTATIONS.map(m => [m.name, m.query]))(
    'without the role, %s is rejected',
    async (_name, query) => {
      const response = await gql(query as string, TestUser.QA_USER);

      expect(errorMessages(response)).toMatch(OPS_PRIVILEGE_DENIED);
    }
  );

  test.each(
    OPS_MUTATIONS.filter(m => m.sideEffectFree).map(m => [m.name, m.query])
  )('with the role, %s passes the authorization gate', async (_name, query) => {
    await assignOpsRole(subjectUserId);

    const response = await gql(query as string, TestUser.QA_USER);

    // The mutation may still fail on its (deliberately absent) argument — what
    // must not happen is an authorization rejection.
    expect(errorMessages(response)).not.toMatch(OPS_PRIVILEGE_DENIED);
  });

  test.each(OPS_MUTATIONS.map(m => [m.name, m.query]))(
    'after the role is revoked, %s is rejected again',
    async (_name, query) => {
      await assignOpsRole(subjectUserId);
      await removeOpsRole(subjectUserId);

      const response = await gql(query as string, TestUser.QA_USER);

      expect(errorMessages(response)).toMatch(OPS_PRIVILEGE_DENIED);
    }
  );

  test('a non-holder cannot assign the platform role to themselves', async () => {
    const response = await gql(
      `mutation assignPlatformRoleToUser {
        assignPlatformRoleToUser(roleData: { actorID: "${subjectUserId}", role: ${OPS_ROLE} }) {
          id
        }
      }`,
      TestUser.QA_USER
    );

    expect(errorMessages(response)).toMatch(/unable to grant/i);
    expect(await platformMyPrivileges(TestUser.QA_USER)).not.toContain(
      OPS_PRIVILEGE
    );
  });
});
