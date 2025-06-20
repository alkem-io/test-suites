/**
 * This test suite verifies the user account authorization and license privileges
 * for different scenarios including no licenses, VC campaign licenses, and Beta tester licenses.
 *
 * The tests cover the following scenarios:
 *
 * - No licenses assigned to the user.
 * - VC campaign licenses assigned to the user.
 * - User with VC campaign licenses assigned and created Space, VC, and Innovation Pack.
 * - Beta tester licenses assigned to the user.
 * - User with Beta tester licenses assigned and created Space, VC, and Innovation Pack.
 *
 * Each test performs the following steps:
 *
 * 1. Arrange: Set up the initial state by assigning or removing platform roles.
 * 2. Act: Execute the `getMyEntitlementsQuery` to fetch the user's entitlements.
 * 3. Assert: Verify the response data against the expected entitlements, authorizations, subscriptions, and spaces.
 *
 * The cleanup steps ensure that any created resources (spaces, virtual contributors, innovation packs) are deleted
 * and the platform roles are removed after the tests are executed.
 */
import {
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import {
  accountNoLicenses,
  accountVCCampaignLicenses,
  accountVCCampaignLicenses1SpaceVCPack,
} from './entitlements-data';
import { getMyEntitlementsQuery } from './entitlements-request.params';
import {
  createSpaceAndGetData,
  deleteSpace,
} from '@functional-api/journey/space/space.request.params';
import {
  createVirtualContributorOnAccountSpaceBased,
  deleteVirtualContributorOnAccount,
} from '@functional-api/contributor-management/virtual-contributor/vc.request.params';
import {
  createInnovationPack,
  deleteInnovationPack,
} from '@functional-api/innovation-pack/innovation_pack.request.params';
import { UniqueIDGenerator } from '@alkemio/tests-lib';

const uniqueId = UniqueIDGenerator.getID();
import {
  assignPlatformRole,
  removePlatformRole,
} from '@functional-api/platform/authorization-platform-mutation';
import { RoleName } from '@alkemio/tests-lib/dist/core/generated/alkemio-schema';

let spaceId = '';
const spaceName = `space-name-${uniqueId}`;
const vcName = `vcname1-${uniqueId}`;
let vcId = '';
let innovationPackId = '';
const packName = `packname-${uniqueId}`;

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'user-entitlements',
};

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
});

describe('Get User Account Authorization and License privileges ', () => {
  test('No licenses assigned', async () => {
    // Arrange
    await removePlatformRole(
      TestUserManager.users.nonSpaceMember.id,
      RoleName.PlatformVcCampaign
    );

    // Act
    const response = await getMyEntitlementsQuery(TestUser.NON_SPACE_MEMBER);
    const accountData = response.data?.me.user?.account;

    // Assert
    expect(accountData?.license?.availableEntitlements).toEqual(
      accountNoLicenses.license.availableEntitlements
    );
    expect(accountData?.license?.authorization).toEqual(
      accountNoLicenses.license.authorization
    );
    expect(accountData?.subscriptions).toEqual(accountNoLicenses.subscriptions);
    expect(accountData?.spaces).toEqual(
      expect.arrayContaining(accountNoLicenses.spaces)
    );
    expect(accountData?.spaces).toEqual(
      expect.arrayContaining(accountNoLicenses.spaces)
    );
  });

  test('VC campaign licenses assigned', async () => {
    // Arrange
    await assignPlatformRole(
      TestUserManager.users.nonSpaceMember.id,
      RoleName.PlatformVcCampaign
    );

    // Act
    const response = await getMyEntitlementsQuery(TestUser.NON_SPACE_MEMBER);
    const accountData = response.data?.me.user?.account;

    // Assert
    expect(accountData?.license?.availableEntitlements?.sort()).toEqual(
      accountVCCampaignLicenses.license.availableEntitlements.sort()
    );
    expect(accountData?.license?.authorization).toEqual(
      accountVCCampaignLicenses.license.authorization
    );
    expect(accountData?.subscriptions).toEqual(
      accountVCCampaignLicenses.subscriptions
    );
    expect(accountData?.spaces).toEqual(
      expect.arrayContaining(accountVCCampaignLicenses.spaces)
    );

    await removePlatformRole(
      TestUserManager.users.nonSpaceMember.id,
      RoleName.PlatformVcCampaign
    );
  });
  describe('VC campaign Licenses cleanup', () => {
    afterAll(async () => {
      await deleteSpace(spaceId, TestUser.GLOBAL_ADMIN);
      await deleteVirtualContributorOnAccount(vcId, TestUser.GLOBAL_ADMIN);
      await deleteInnovationPack(innovationPackId, TestUser.GLOBAL_ADMIN);
      await removePlatformRole(
        TestUserManager.users.nonSpaceMember.id,
        RoleName.PlatformVcCampaign
      );
    });
    test('User with VC campaign licenses assigned and created Space, VC and Innovation Pack', async () => {
      // Arrange
      await assignPlatformRole(
        TestUserManager.users.nonSpaceMember.id,
        RoleName.PlatformVcCampaign
      );

      const createSpace = await createSpaceAndGetData(
        spaceName,
        spaceName,
        TestUserManager.users.nonSpaceMember.accountId,
        TestUser.NON_SPACE_MEMBER
      );
      spaceId = createSpace.data?.lookup?.space?.id ?? '';

      const vcData = await createVirtualContributorOnAccountSpaceBased(
        vcName,
        TestUserManager.users.nonSpaceMember.accountId,
        spaceId,
        TestUser.NON_SPACE_MEMBER
      );
      vcId = vcData?.data?.createVirtualContributor?.id ?? '';

      const packData = await createInnovationPack(
        packName,
        packName,
        TestUserManager.users.nonSpaceMember.accountId,
        TestUser.NON_SPACE_MEMBER
      );
      innovationPackId = packData?.data?.createInnovationPack?.id ?? '';

      // Act
      const response = await getMyEntitlementsQuery(TestUser.NON_SPACE_MEMBER);
      const accountData = response.data?.me.user?.account;

      // Assert
      expect(accountData?.license?.availableEntitlements?.sort()).toEqual(
        accountVCCampaignLicenses.license.availableEntitlements.sort()
      );
      expect(accountData?.license?.authorization).toEqual(
        accountVCCampaignLicenses1SpaceVCPack.license.authorization
      );
      expect(accountData?.subscriptions).toEqual(
        accountVCCampaignLicenses1SpaceVCPack.subscriptions
      );
      expect(accountData?.spaces[0].license.authorization).toEqual(
        accountVCCampaignLicenses1SpaceVCPack.spaces[0].license.authorization
      );
      expect(accountData?.spaces[0].license?.entitlements).toEqual(
        expect.arrayContaining(
          accountVCCampaignLicenses1SpaceVCPack.spaces[0].license.entitlements
        )
      );
    });
  });

  test('Beta tester licenses assigned', async () => {
    // Arrange
    await assignPlatformRole(
      TestUserManager.users.nonSpaceMember.id,
      RoleName.PlatformBetaTester
    );

    // Act
    const response = await getMyEntitlementsQuery(TestUser.NON_SPACE_MEMBER);
    const accountData = response.data?.me.user?.account;

    // Assert
    expect(accountData?.license?.availableEntitlements?.sort()).toEqual(
      accountVCCampaignLicenses.license.availableEntitlements.sort()
    );
    expect(accountData?.license?.authorization).toEqual(
      accountVCCampaignLicenses.license.authorization
    );
    expect(accountData?.subscriptions).toEqual(
      accountVCCampaignLicenses.subscriptions
    );
    expect(accountData?.spaces).toEqual(
      expect.arrayContaining(accountVCCampaignLicenses.spaces)
    );
    expect(accountData?.spaces).toEqual(
      expect.arrayContaining(accountVCCampaignLicenses.spaces)
    );

    await removePlatformRole(
      TestUserManager.users.nonSpaceMember.id,
      RoleName.PlatformBetaTester
    );
  });
  describe('BetaTested Licenses cleanup', () => {
    afterAll(async () => {
      await deleteSpace(spaceId, TestUser.GLOBAL_ADMIN);
      await deleteVirtualContributorOnAccount(vcId, TestUser.GLOBAL_ADMIN);
      await deleteInnovationPack(innovationPackId, TestUser.GLOBAL_ADMIN);
      await removePlatformRole(
        TestUserManager.users.nonSpaceMember.id,
        RoleName.PlatformBetaTester
      );
    });
    test('User with Beta tester licenses assigned and created Space, VC and Innovation Pack', async () => {
      // Arrange
      await assignPlatformRole(
        TestUserManager.users.nonSpaceMember.id,
        RoleName.PlatformBetaTester
      );

      const createSpace = await createSpaceAndGetData(
        spaceName,
        spaceName,
        TestUserManager.users.nonSpaceMember.accountId,
        TestUser.NON_SPACE_MEMBER
      );
      spaceId = createSpace.data?.lookup?.space?.id ?? '';

      const vcData = await createVirtualContributorOnAccountSpaceBased(
        vcName,
        TestUserManager.users.nonSpaceMember.accountId,
        spaceId,
        TestUser.NON_SPACE_MEMBER
      );
      vcId = vcData?.data?.createVirtualContributor?.id ?? '';

      const packData = await createInnovationPack(
        packName,
        packName,
        TestUserManager.users.nonSpaceMember.accountId,
        TestUser.NON_SPACE_MEMBER
      );
      innovationPackId = packData?.data?.createInnovationPack?.id ?? '';

      // Act
      const response = await getMyEntitlementsQuery(TestUser.NON_SPACE_MEMBER);
      const accountData = response.data?.me.user?.account;

      // Assert
      expect(accountData?.license?.availableEntitlements?.sort()).toEqual(
        accountVCCampaignLicenses1SpaceVCPack.license.availableEntitlements.sort()
      );
      expect(accountData?.license?.authorization).toEqual(
        accountVCCampaignLicenses1SpaceVCPack.license.authorization
      );
      expect(accountData?.subscriptions).toEqual(
        accountVCCampaignLicenses1SpaceVCPack.subscriptions
      );
      expect(accountData?.spaces[0].license.authorization).toEqual(
        accountVCCampaignLicenses1SpaceVCPack.spaces[0].license.authorization
      );
      expect(accountData?.spaces[0].license?.entitlements).toEqual(
        expect.arrayContaining(
          accountVCCampaignLicenses1SpaceVCPack.spaces[0].license.entitlements
        )
      );
    });
  });
});
