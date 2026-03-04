/**
 * This file contains integration tests for managing organization owners within the platform.
 * It includes tests for creating organizations and assigning users as organization owners.
 * The tests cover scenarios such as:
 * - Creating an organization with specific details like name and host name ID.
 * - Assigning a user as the owner of an organization.
 * - Verifying that a user can be assigned as the owner of multiple organizations.
 * - Cleaning up by deleting the created organizations after tests.
 *
 * The tests ensure that the organization owner assignment process works as expected,
 * and that the API responses match the expected values.
 */
import {
  createOrganization,
  deleteOrganization,
} from '../organization/organization.request.params';
import {
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  assignRoleToUser,
  removeRoleFromUser,
} from '@functional-api/roleset/roles-request.params';
import '@utils/array.matcher';

let organizationId = '';
let organizationRoleSetId = '';
const credentialsType = 'ORGANIZATION_OWNER';
let responseData: object;

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'organization-owner',
};
beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
});
beforeEach(async () => {
  const uniqueId = UniqueIDGenerator.getID();
  const organizationName = 'org-auth-org-name' + uniqueId;
  const hostNameId = 'org-auth-org-nameid' + uniqueId;
  const request = await createOrganization(organizationName, hostNameId);
  organizationId = request.data?.createOrganization?.id ?? '';
  organizationRoleSetId = request.data?.createOrganization?.roleSet.id ?? '';

  responseData = {
    resourceID: organizationId,
    type: credentialsType,
  };
});

afterEach(async () => {
  await deleteOrganization(organizationId);
});

describe('Organization Owner', () => {
  test.only('should create organization owner', async () => {
    // Act

    const res = await assignRoleToUser(
      TestUserManager.users.spaceMember.id,
      organizationRoleSetId,
      RoleName.Owner
    );
    console.log('assign role to user response', res.error, res.data);

    // Assert
    expect(res?.data?.assignRoleToUser?.credentials).toContainObject(
      responseData
    );
  });

  test('should add same user as owner of 2 organization', async () => {
    // Arrange
    const orgTwoUniqueId = UniqueIDGenerator.getID();
    const responseOrgTwo = await createOrganization(
      `OrgTwoOwnerOne-${orgTwoUniqueId}`,
      `orgtwoownerone-${orgTwoUniqueId}`
    );
    const org2Data = responseOrgTwo.data?.createOrganization;
    const organizationIdTwo = org2Data?.id ?? '';
    const organizationRoleSetIdTwo = org2Data?.roleSet.id ?? '';

    // Act
    const resOne = await assignRoleToUser(
      TestUserManager.users.spaceMember.id,
      organizationRoleSetId,
      RoleName.Owner
    );

    const resTwo = await assignRoleToUser(
      TestUserManager.users.spaceMember.id,
      organizationRoleSetIdTwo,
      RoleName.Owner
    );

    // Assert
    expect(resOne?.data?.assignRoleToUser?.credentials).toContainObject(
      responseData
    );
    expect(resTwo?.data?.assignRoleToUser?.credentials).toContainObject({
      resourceID: organizationIdTwo,
      type: credentialsType,
    });

    await deleteOrganization(organizationIdTwo);
  });

  test('should remove user owner from organization', async () => {
    // Arrange
    await assignRoleToUser(
      TestUserManager.users.spaceMember.id,
      organizationRoleSetId,
      RoleName.Owner
    );

    await assignRoleToUser(
      TestUserManager.users.nonSpaceMember.id,
      organizationRoleSetId,
      RoleName.Owner
    );

    // Act
    const res = await removeRoleFromUser(
      TestUserManager.users.spaceMember.id,
      organizationRoleSetId,
      RoleName.Owner
    );

    // Assert
    expect(res?.data?.removeRoleFromUser?.credentials).not.toContainObject(
      responseData
    );
  });

  test('should not remove the only owner of an organization', async () => {
    // Arrange
    await assignRoleToUser(
      TestUserManager.users.spaceMember.id,
      organizationRoleSetId,
      RoleName.Owner
    );

    // Act
    const res = await removeRoleFromUser(
      TestUserManager.users.spaceMember.id,
      organizationRoleSetId,
      RoleName.Owner
    );

    // Assert
    expect(res?.error?.errors[0].message).toContain(
      `Min limit of users reached for role 'owner': 1, cannot remove user from role on RoleSet: ${organizationRoleSetId}, type: organization`
    );
  });

  test('should not return user credentials for removing user not owner of an Organization', async () => {
    // Act
    const res = await removeRoleFromUser(
      TestUserManager.users.spaceMember.id,
      organizationRoleSetId,
      RoleName.Owner
    );

    // Assert
    expect(res?.data?.removeRoleFromUser?.credentials).not.toContainObject(
      responseData
    );
  });

  test('should not result in additional credential for assigning same organization owner twice', async () => {
    // Arrange
    const firstAssignmentResponse = await assignRoleToUser(
      TestUserManager.users.spaceMember.id,
      organizationRoleSetId,
      RoleName.Owner
    );
    const credentialsCount =
      firstAssignmentResponse?.data?.assignRoleToUser?.credentials?.length ||
      -999;

    // Act
    const secondAssignmentResponse = await assignRoleToUser(
      TestUserManager.users.spaceMember.id,
      organizationRoleSetId,
      RoleName.Owner
    );
    const updatedCredentialsCount =
      secondAssignmentResponse?.data?.assignRoleToUser?.credentials?.length ||
      -999;

    // Assert
    expect(updatedCredentialsCount).toEqual(credentialsCount);
  });
});
