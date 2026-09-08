// 062-organization-user-associates — US4: a user whose email domain matches
// a verified organization with the switch on sees "Join as an associate" and
// joins with one click; the eligibility signal and the join mutation itself
// both re-check domain match, verification and the switch (FR-016), and the
// registration-time auto-join keeps working unchanged (US4-AS5).
//
// A live join call needs a REAL registered, authenticated user whose own
// email domain matches — none of the fixed `TestUser` personas can, since
// they all live at `@alkem.io`. `getUserToken(email)` mints a bearer token
// for any registered email (every test user, fixed or freshly registered,
// shares the harness password), so `callAsEmail` below is the one place this
// file steps outside the `TestUser` enum.
import {
  getGraphqlClient,
  getUserToken,
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { GraphqlReturnWithError } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  OrganizationAssociateEligibilityReason,
  RoleName,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  deleteUser,
  registerVerifiedUser,
} from '@functional-api/contributor-management/user/user.request.params';
import {
  updateOrganization,
  updateOrganizationSettings,
} from '@functional-api/contributor-management/organization/organization.request.params';
import { getErrorCode, usersInRoles } from '../roleset.request.params';

const uniqueId = UniqueIDGenerator.getID();
const verifiedDomain = `example${uniqueId}.io`;
const unverifiedDomain = `unverified${uniqueId}.io`;

let orgVerified: OrganizationWithSpaceModel;
let orgUnverified: OrganizationWithSpaceModel;

const createdUserIds: string[] = [];

beforeAll(async () => {
  orgVerified = await TestScenarioFactory.createBaseScenarioOrganization({
    name: 'org-join-verified',
    organization: { verification: { setVerified: true } },
  });
  await updateOrganization(orgVerified.organization.id, {
    domain: verifiedDomain,
  });
  await updateOrganizationSettings(orgVerified.organization.id, {
    membership: { allowUsersMatchingDomainToJoin: true },
  });

  orgUnverified = await TestScenarioFactory.createBaseScenarioOrganization({
    name: 'org-join-unverified',
  });
  await updateOrganization(orgUnverified.organization.id, {
    domain: unverifiedDomain,
  });
  await updateOrganizationSettings(orgUnverified.organization.id, {
    membership: { allowUsersMatchingDomainToJoin: true },
  });
});

afterAll(async () => {
  for (const id of createdUserIds) {
    await deleteUser(id).catch(() => undefined);
  }
  await TestScenarioFactory.cleanUpBaseScenario(orgVerified);
  await TestScenarioFactory.cleanUpBaseScenario(orgUnverified);
});

/** Registers a real, verified user at `email` and returns their id, tracked
 * for teardown. */
const registerDomainUser = async (label: string, domain: string) => {
  const testId = UniqueIDGenerator.getID();
  const email = `${label}${testId}@${domain}`;
  const id = await registerVerifiedUser(email, `fn${testId}`, `ln${testId}`);
  createdUserIds.push(id);
  return { id, email };
};

const callAsEmail = async <TData>(
  email: string,
  invoke: (
    client: ReturnType<typeof getGraphqlClient>,
    auth: { authorization: string }
  ) => Promise<{ data: TData }>
): Promise<GraphqlReturnWithError<TData>> => {
  const token = await getUserToken(email);
  try {
    const result = await invoke(getGraphqlClient(), {
      authorization: `Bearer ${token}`,
    });
    return { data: result.data };
  } catch (error) {
    const err = error as {
      response?: { errors?: Array<Record<string, unknown>> };
    };
    return {
      error: {
        errors: err.response?.errors ?? [{ message: String(error) }],
      },
    };
  }
};

const eligibilityAsEmail = (organizationId: string, email: string) =>
  callAsEmail(email, (client, auth) =>
    client.GetOrganizationAssociateEligibility({ organizationId }, auth)
  );

describe('Organization live join door (US4)', () => {
  test('US4-AS1: verified + domain match + switch on → ELIGIBLE_TO_JOIN, and joining makes the viewer an associate', async () => {
    const { id, email } = await registerDomainUser('as1', verifiedDomain);

    const eligibility = await eligibilityAsEmail(
      orgVerified.organization.id,
      email
    );
    expect(eligibility?.data?.organization.myAssociateEligibility.reason).toEqual(
      OrganizationAssociateEligibilityReason.EligibleToJoin
    );
    expect(
      eligibility?.data?.organization.myAssociateEligibility.canJoinDirectly
    ).toEqual(true);

    const join = await callAsEmail(email, (client, auth) =>
      client.joinRoleSet(
        { joinData: { roleSetID: orgVerified.organization.roleSetId } },
        auth
      )
    );
    expect(join?.error).toBeUndefined();

    const roles = await usersInRoles(
      orgVerified.organization.roleSetId,
      [RoleName.Associate],
      TestUser.GLOBAL_ADMIN
    );
    const associateIds = (
      roles?.data?.lookup?.roleSet?.usersInRoles?.[0]?.users ?? []
    ).map((u: { id: string }) => u.id);
    expect(associateIds).toEqual(expect.arrayContaining([id]));
  });

  test('US4-AS6: an existing associate sees no join or apply action (ALREADY_ASSOCIATE)', async () => {
    const { email } = await registerDomainUser('as6', verifiedDomain);
    // Registration-time auto-join already makes them an associate (US4-AS5
    // path); the eligibility signal reflects it immediately.
    const eligibility = await eligibilityAsEmail(
      orgVerified.organization.id,
      email
    );
    expect(eligibility?.data?.organization.myAssociateEligibility.reason).toEqual(
      OrganizationAssociateEligibilityReason.AlreadyAssociate
    );
    expect(
      eligibility?.data?.organization.myAssociateEligibility.canJoinDirectly
    ).toEqual(false);
    expect(
      eligibility?.data?.organization.myAssociateEligibility.canApply
    ).toEqual(false);
  });

  test('US4-AS5: a fresh registration with a matching domain auto-joins (registration path, unchanged)', async () => {
    const { id } = await registerDomainUser('as5', verifiedDomain);
    const roles = await usersInRoles(
      orgVerified.organization.roleSetId,
      [RoleName.Associate],
      TestUser.GLOBAL_ADMIN
    );
    const associateIds = (
      roles?.data?.lookup?.roleSet?.usersInRoles?.[0]?.users ?? []
    ).map((u: { id: string }) => u.id);
    expect(associateIds).toEqual(expect.arrayContaining([id]));
  });

  test('US4-AS2: switch off → ELIGIBLE_TO_APPLY, and a direct join call is refused (ROLESET_JOIN_NOT_ELIGIBLE)', async () => {
    await updateOrganizationSettings(orgVerified.organization.id, {
      membership: { allowUsersMatchingDomainToJoin: false },
    });
    try {
      const { email } = await registerDomainUser('as2', verifiedDomain);
      const eligibility = await eligibilityAsEmail(
        orgVerified.organization.id,
        email
      );
      expect(
        eligibility?.data?.organization.myAssociateEligibility.canJoinDirectly
      ).toEqual(false);
      expect(
        eligibility?.data?.organization.myAssociateEligibility.reason
      ).not.toEqual(OrganizationAssociateEligibilityReason.EligibleToJoin);

      const join = await callAsEmail(email, (client, auth) =>
        client.joinRoleSet(
          { joinData: { roleSetID: orgVerified.organization.roleSetId } },
          auth
        )
      );
      expect(getErrorCode(join)).toEqual('ROLESET_JOIN_NOT_ELIGIBLE');
    } finally {
      await updateOrganizationSettings(orgVerified.organization.id, {
        membership: { allowUsersMatchingDomainToJoin: true },
      });
    }
  });

  test('US4-AS3: an unverified organization with the switch on still refuses a direct join (verification gate)', async () => {
    const { email } = await registerDomainUser('as3', unverifiedDomain);
    const eligibility = await eligibilityAsEmail(
      orgUnverified.organization.id,
      email
    );
    expect(
      eligibility?.data?.organization.myAssociateEligibility.canJoinDirectly
    ).toEqual(false);

    const join = await callAsEmail(email, (client, auth) =>
      client.joinRoleSet(
        { joinData: { roleSetID: orgUnverified.organization.roleSetId } },
        auth
      )
    );
    expect(getErrorCode(join)).toEqual('ROLESET_JOIN_NOT_ELIGIBLE');
  });

  test('US4-AS4: a user whose domain does not match is refused', async () => {
    const { email } = await registerDomainUser(
      'as4',
      `other${uniqueId}.org`
    );
    const eligibility = await eligibilityAsEmail(
      orgVerified.organization.id,
      email
    );
    expect(
      eligibility?.data?.organization.myAssociateEligibility.canJoinDirectly
    ).toEqual(false);

    const join = await callAsEmail(email, (client, auth) =>
      client.joinRoleSet(
        { joinData: { roleSetID: orgVerified.organization.roleSetId } },
        auth
      )
    );
    expect(getErrorCode(join)).toEqual('ROLESET_JOIN_NOT_ELIGIBLE');
  });
});
