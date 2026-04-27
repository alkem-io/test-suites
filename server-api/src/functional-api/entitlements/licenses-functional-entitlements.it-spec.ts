/**
 * This file contains functional tests for verifying the entitlements and licenses
 * assigned to users and spaces within the platform. The tests cover scenarios such as:
 * - Assigning and revoking platform roles to/from TestUserManager.users.
 * - Creating and deleting spaces.
 * - Assigning and revoking license plans to/from spaces and accounts.
 * - Verifying the entitlements and licenses through API queries.
 *
 * The tests ensure that the platform correctly handles the assignment and revocation
 * of roles and licenses, and that the entitlements data returned by the API matches
 * the expected values.
 */

import {
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { getMyEntitlementsQuery } from './entitlements-request.params';
import {
  createSpaceBasicData,
  deleteSpace,
} from '@functional-api/journey/space/space.request.params';
import {
  revokeLicensePlanFromSpace,
  getLicensePlanByName,
  assignLicensePlanToSpace,
} from '../license/license.params.request';
import {
  accountVCCampaignLicenses1SpacePlus,
  accountVCCampaignLicenses1SpaceVCPack,
} from './entitlements-data';
import { UniqueIDGenerator } from '@alkemio/tests-lib';
import {
  assignPlatformRole,
  removePlatformRole,
} from '@functional-api/platform/authorization-platform-mutation';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
const uniqueId = UniqueIDGenerator.getID();

let spaceId = '';
const spaceName = `space-name-${uniqueId}`;

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'license-functional-entitlements',
};

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
  await assignPlatformRole(
    TestUserManager.users.nonSpaceMember.id,
    RoleName.PlatformVcCampaign
  );
});

afterAll(async () => {
  await removePlatformRole(
    TestUserManager.users.nonSpaceMember.id,
    RoleName.PlatformVcCampaign
  );
  await deleteSpace(spaceId, TestUser.GLOBAL_ADMIN);
});

/** @testCase TC-0501 */
describe('Functional tests - licenses updates', () => {
  describe('Space licenses', () => {
    test('Add License Plus to space', async () => {
      // Arrange

      const getLicensePlanSpacePlus =
        await getLicensePlanByName('SPACE_LICENSE_PLUS');
      const licensePlanIdSpacePlus = getLicensePlanSpacePlus[0].id;

      const createSpace = await createSpaceBasicData(
        spaceName,
        spaceName,
        TestUserManager.users.nonSpaceMember.accountId,
        true,
        TestUser.NON_SPACE_MEMBER
      );
      spaceId = createSpace.data?.createSpace.id ?? '';
      const responseBeforePlus = await getMyEntitlementsQuery(
        TestUser.NON_SPACE_MEMBER
      );

      // Act
      await assignLicensePlanToSpace(spaceId, licensePlanIdSpacePlus);
      const responseAfterPlus = await getMyEntitlementsQuery(
        TestUser.NON_SPACE_MEMBER
      );

      await revokeLicensePlanFromSpace(
        spaceId,
        licensePlanIdSpacePlus,
        TestUser.GLOBAL_ADMIN
      );
      const responseAfterRevokePlus = await getMyEntitlementsQuery(
        TestUser.NON_SPACE_MEMBER
      );

      // Assert
      expect(
        responseBeforePlus.data?.me.user?.account?.spaces[0].license
          .entitlements
      ).toEqual(
        expect.arrayContaining(
          accountVCCampaignLicenses1SpaceVCPack.spaces[0].license.entitlements
        )
      );

      expect(
        responseAfterPlus.data?.me.user?.account?.spaces[0].license.entitlements
      ).toEqual(
        expect.arrayContaining(
          accountVCCampaignLicenses1SpacePlus.spaces[0].license.entitlements
        )
      );

      expect(
        responseAfterRevokePlus.data?.me.user?.account?.spaces[0].license
          .entitlements
      ).toEqual(
        expect.arrayContaining(
          accountVCCampaignLicenses1SpaceVCPack.spaces[0].license.entitlements
        )
      );
    });
  });
});
