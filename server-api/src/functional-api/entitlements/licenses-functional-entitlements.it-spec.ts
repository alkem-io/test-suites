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
  createSpaceBasicDataOrFail,
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
    RoleName.FeatureVcCampaign
  );
});

afterAll(async () => {
  await removePlatformRole(
    TestUserManager.users.nonSpaceMember.id,
    RoleName.FeatureVcCampaign
  );
  await deleteSpace(spaceId, TestUser.GLOBAL_ADMIN);
});

describe('Functional tests - licenses updates', () => {
  describe('Space licenses', () => {
    test('Add License Plus to space', async () => {
      // Arrange

      const getLicensePlanSpacePlus =
        await getLicensePlanByName('SPACE_LICENSE_PLUS');
      const licensePlanIdSpacePlus = getLicensePlanSpacePlus[0].id;

      // Resilient to the retry-after-commit race (see createSpaceBasicDataOrFail):
      // a masked '' id here used to leave the space behind and assign the plan
      // to nothing.
      spaceId = await createSpaceBasicDataOrFail(
        spaceName,
        spaceName,
        TestUserManager.users.nonSpaceMember.accountId,
        true,
        TestUser.NON_SPACE_MEMBER
      );
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

      // Assert — pick the space this test created, never `spaces[0]`: the
      // account keeps any space an earlier run failed to delete, and the
      // order is not the creation order.
      const entitlementsOf = (response: typeof responseBeforePlus) =>
        response.data?.me.user?.account?.spaces.find(s => s.id === spaceId)
          ?.license.entitlements;

      expect(entitlementsOf(responseBeforePlus)).toEqual(
        expect.arrayContaining(
          accountVCCampaignLicenses1SpaceVCPack.spaces[0].license.entitlements
        )
      );

      expect(entitlementsOf(responseAfterPlus)).toEqual(
        expect.arrayContaining(
          accountVCCampaignLicenses1SpacePlus.spaces[0].license.entitlements
        )
      );

      expect(entitlementsOf(responseAfterRevokePlus)).toEqual(
        expect.arrayContaining(
          accountVCCampaignLicenses1SpaceVCPack.spaces[0].license.entitlements
        )
      );
    });
  });
});
