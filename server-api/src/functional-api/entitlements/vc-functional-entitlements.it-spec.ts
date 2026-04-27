/**
 * Functional tests for Virtual Contributor (VC) creation and entitlements.
 *
 * This test suite verifies the following scenarios:
 *
 * - Assigning and removing platform roles to/from TestUserManager.users.
 * - Creating and deleting spaces and virtual contributors.
 * - Checking user entitlements and licenses.
 *
 * The tests are organized as follows:
 *
 * - Before all tests, assign the `VcCampaign` platform role to a non-space member user.
 * - After all tests, clean up by deleting any created virtual contributors and spaces, and remove the `VcCampaign` platform role from the user.
 *
 * The tests include:
 *
 * - Creating virtual contributors with different entitlements.
 * - Verifying that the user has the correct entitlements.
 * - Attempting to create a virtual contributor over the license limit and verifying the entitlements.
 *
 */
import { TestUser } from '@alkemio/tests-lib';
import { getMyEntitlementsQuery } from './entitlements-request.params';
import {
  createSpaceBasicData,
  deleteSpace,
} from '@functional-api/journey/space/space.request.params';
import {
  createVirtualContributorOnAccountSpaceBased,
  deleteVirtualContributorOnAccount,
} from '@functional-api/contributor-management/virtual-contributor/vc.request.params';
import { getAccountMainEntities } from '../account/account.params.request';
import { UniqueIDGenerator } from '@alkemio/tests-lib';
import {
  assignPlatformRole,
  removePlatformRole,
} from '@functional-api/platform/authorization-platform-mutation';
import {
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUserManager,
} from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
const uniqueId = UniqueIDGenerator.getID();

const spaceName = `space-name-${uniqueId}`;
const vcName = `vcname1-${uniqueId}`;

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'vc-functional-entitlements',
};

/** @testCase TC-0502 */
describe('Functional tests - VC', () => {
  afterEach(async () => {
    const spaceData = await getAccountMainEntities(
      TestUserManager.users.nonSpaceMember.accountId,
      TestUser.NON_SPACE_MEMBER
    );
    const vcs = spaceData.data?.lookup.account?.virtualContributors;
    for (const vc of vcs || []) {
      const vcId = vc.id;
      await deleteVirtualContributorOnAccount(vcId, TestUser.GLOBAL_ADMIN);
    }

    const spaces = spaceData.data?.lookup.account?.spaces;
    for (const space of spaces || []) {
      const spaceId = space.id;
      await deleteSpace(spaceId, TestUser.GLOBAL_ADMIN);
    }
  });
  describe('VC Campaign user vc creation', () => {
    beforeAll(async () => {
      await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
      await assignPlatformRole(
        TestUserManager.users.nonSpaceMember.id,
        RoleName.PlatformVcCampaign
      );
    });
    const allPrivileges = [
      'ACCOUNT_SPACE_FREE',
      'ACCOUNT_INNOVATION_HUB',
      'ACCOUNT_VIRTUAL_CONTRIBUTOR',
      'ACCOUNT_INNOVATION_PACK',
    ].sort();

    const withoutCreateVs = [
      'ACCOUNT_INNOVATION_HUB',
      'ACCOUNT_INNOVATION_PACK',
      'ACCOUNT_SPACE_FREE',
    ].sort();

    afterAll(async () => {
      await removePlatformRole(
        TestUserManager.users.nonSpaceMember.id,
        RoleName.PlatformVcCampaign
      );
    });

    test.each`
      vcName               | availableEntitlements | error
      ${`vc1-${uniqueId}`} | ${allPrivileges}      | ${undefined}
      ${`vc2-${uniqueId}`} | ${allPrivileges}      | ${undefined}
      ${`vc3-${uniqueId}`} | ${allPrivileges}      | ${undefined}
    `(
      'User: VC campaign has license $availableEntitlements to creates a vc with name: $vcName',
      async ({ vcName, availableEntitlements, error }) => {
        // Arrange
        const response = await getMyEntitlementsQuery(
          TestUser.NON_SPACE_MEMBER
        );

        const createSpace = await createSpaceBasicData(
          vcName,
          vcName,
          TestUserManager.users.nonSpaceMember.accountId,
          true,
          TestUser.NON_SPACE_MEMBER
        );

        const spaceId = createSpace.data?.createSpace.id ?? '';

        // Act
        const createVc = await createVirtualContributorOnAccountSpaceBased(
          vcName,
          TestUserManager.users.nonSpaceMember.accountId,
          spaceId,
          TestUser.NON_SPACE_MEMBER
        );

        // Assert
        expect(
          response?.data?.me.user?.account?.license?.availableEntitlements?.sort()
        ).toEqual(availableEntitlements);
        expect(createVc?.error?.errors?.[0].message).toEqual(error);
      }
    );

    test('Create a vc over the license limit', async () => {
      // Arrange
      const createSpace = await createSpaceBasicData(
        spaceName,
        spaceName,
        TestUserManager.users.nonSpaceMember.accountId,
        true,
        TestUser.NON_SPACE_MEMBER
      );

      const spaceId = createSpace.data?.createSpace.id ?? '';
      // Create maximum allowed VCs first
      const maxVCs = 3;
      for (let i = 0; i < maxVCs; i++) {
        const tempVcName = `temp-vc-${i}-${uniqueId}`;
        await createVirtualContributorOnAccountSpaceBased(
          tempVcName,
          TestUserManager.users.nonSpaceMember.accountId,
          spaceId,
          TestUser.NON_SPACE_MEMBER
        );
      }
      const response = await getMyEntitlementsQuery(TestUser.NON_SPACE_MEMBER);

      // // Act
      const createVc = await createVirtualContributorOnAccountSpaceBased(
        vcName,
        TestUserManager.users.nonSpaceMember.accountId,
        spaceId,
        TestUser.NON_SPACE_MEMBER
      );

      // Assert
      expect(createVc.error?.errors?.[0].message).toContain(
        'Entitlement limit of 3 of type account-virtual-contributor reached'
      );
      expect(
        response?.data?.me.user?.account?.license?.availableEntitlements?.sort()
      ).toEqual(withoutCreateVs);
    });
  });
});
