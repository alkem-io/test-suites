import '@test/utils/array.matcher';
import {
  createOrganization,
  deleteOrganization,
} from '../organization/organization.request.params';
import {
  assignUserAsOrganizationOwnerCodegen,
  removeUserAsOrganizationOwnerCodegen,
} from '@test/utils/mutations/authorization-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { users } from '@test/utils/queries/users-data';

let organizationId = '';
const credentialsType = 'ORGANIZATION_OWNER';
const organizationName = 'org-auth-org-name' + uniqueId;
const hostNameId = 'org-auth-org-nameid' + uniqueId;

// eslint-disable-next-line @typescript-eslint/ban-types
let responseData: object;

beforeEach(async () => {
  const responseOrg = await createOrganization(
    organizationName,
    hostNameId
  );
  organizationId = responseOrg.data?.createOrganization?.id ?? '';

  responseData = {
    resourceID: organizationId,
    type: credentialsType,
  };
});

afterEach(async () => {
  await deleteOrganization(organizationId);
});

describe('Organization Owner', () => {
  test('should create organization owner', async () => {
    // Act

    const res = await assignUserAsOrganizationOwnerCodegen(
      users.spaceMember.email,
      organizationId
    );

    // Assert
    expect(
      res?.data?.assignOrganizationRoleToUser?.agent?.credentials
    ).toContainObject(responseData);
  });

  test('should add same user as owner of 2 organization', async () => {
    // Arrange
    const responseOrgTwo = await createOrganization(
      `OrgTwoOwnerOne-${uniqueId}`,
      `orgtwoownerone-${uniqueId}`
    );
    const organizationIdTwo = responseOrgTwo.data?.createOrganization?.id ?? '';

    // Act
    const resOne = await assignUserAsOrganizationOwnerCodegen(
      users.spaceMember.email,
      organizationId
    );

    const resTwo = await assignUserAsOrganizationOwnerCodegen(
      users.spaceMember.email,
      organizationIdTwo
    );

    // Assert
    expect(
      resOne?.data?.assignOrganizationRoleToUser?.agent?.credentials
    ).toContainObject(responseData);
    expect(
      resTwo?.data?.assignOrganizationRoleToUser?.agent?.credentials
    ).toContainObject({
      resourceID: organizationIdTwo,
      type: credentialsType,
    });

    await deleteOrganization(organizationIdTwo);
  });

  test('should remove user owner from organization', async () => {
    // Arrange
    await assignUserAsOrganizationOwnerCodegen(
      users.spaceMember.email,
      organizationId
    );

    await assignUserAsOrganizationOwnerCodegen(
      users.nonSpaceMember.email,
      organizationId
    );

    // Act
    const res = await removeUserAsOrganizationOwnerCodegen(
      users.spaceMember.email,
      organizationId
    );

    // Assert
    expect(
      res?.data?.removeOrganizationRoleFromUser?.agent?.credentials
    ).not.toContainObject(responseData);
  });

  test('should not remove the only owner of an organization', async () => {
    // Arrange
    await assignUserAsOrganizationOwnerCodegen(
      users.spaceMember.email,
      organizationId
    );

    // Act
    const res = await removeUserAsOrganizationOwnerCodegen(
      users.spaceMember.email,
      organizationId
    );

    // Assert
    expect(res?.error?.errors[0].message).toContain(
      `Not allowed to remove last owner for organisaiton: ${organizationId}`
    );
  });

  test('should not return user credentials for removing user not owner of an organization', async () => {
    // Act
    const res = await removeUserAsOrganizationOwnerCodegen(
      users.spaceMember.email,
      organizationId
    );

    // Assert
    expect(
      res?.data?.removeOrganizationRoleFromUser?.agent?.credentials
    ).not.toContainObject(responseData);
  });

  test('should throw error for assigning same organization owner twice', async () => {
    // Arrange
    await assignUserAsOrganizationOwnerCodegen(
      users.spaceMember.email,
      organizationId
    );

    // Act
    const res = await assignUserAsOrganizationOwnerCodegen(
      users.spaceMember.email,
      organizationId
    );
    // Assert
    expect(res?.error?.errors[0].message).toEqual(
      `Agent (${users.spaceMember.agentId}) already has assigned credential: organization-owner`
    );
  });
});
