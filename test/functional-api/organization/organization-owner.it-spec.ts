import '@test/utils/array.matcher';
import {
  createOrganizationCodegen,
  deleteOrganizationCodegen,
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
  const responseOrg = await createOrganizationCodegen(
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
  await deleteOrganizationCodegen(organizationId);
});

describe('Organization Owner', () => {
  test('should create organization owner', async () => {
    // Act

    const res = await assignUserAsOrganizationOwnerCodegen(
      users.spaceMemberEmail,
      organizationId
    );

    // Assert
    expect(
      res?.data?.assignUserAsOrganizationOwner?.agent?.credentials
    ).toContainObject(responseData);
  });

  test('should add same user as owner of 2 organization', async () => {
    // Arrange
    const responseOrgTwo = await createOrganizationCodegen(
      `OrgTwoOwnerOne-${uniqueId}`,
      `orgtwoownerone-${uniqueId}`
    );
    const organizationIdTwo = responseOrgTwo.data?.createOrganization?.id ?? '';

    // Act
    const resOne = await assignUserAsOrganizationOwnerCodegen(
      users.spaceMemberEmail,
      organizationId
    );

    const resTwo = await assignUserAsOrganizationOwnerCodegen(
      users.spaceMemberEmail,
      organizationIdTwo
    );

    // Assert
    expect(
      resOne?.data?.assignUserAsOrganizationOwner?.agent?.credentials
    ).toContainObject(responseData);
    expect(
      resTwo?.data?.assignUserAsOrganizationOwner?.agent?.credentials
    ).toContainObject({
      resourceID: organizationIdTwo,
      type: credentialsType,
    });

    await deleteOrganizationCodegen(organizationIdTwo);
  });

  test('should remove user owner from organization', async () => {
    // Arrange
    await assignUserAsOrganizationOwnerCodegen(
      users.spaceMemberEmail,
      organizationId
    );

    await assignUserAsOrganizationOwnerCodegen(
      users.nonSpaceMemberEmail,
      organizationId
    );

    // Act
    const res = await removeUserAsOrganizationOwnerCodegen(
      users.spaceMemberEmail,
      organizationId
    );

    // Assert
    expect(
      res?.data?.removeUserAsOrganizationOwner?.agent?.credentials
    ).not.toContainObject(responseData);
  });

  test('should not remove the only owner of an organization', async () => {
    // Arrange
    await assignUserAsOrganizationOwnerCodegen(
      users.spaceMemberEmail,
      organizationId
    );

    // Act
    const res = await removeUserAsOrganizationOwnerCodegen(
      users.spaceMemberEmail,
      organizationId
    );

    // Assert
    expect(res?.error?.errors[0].message).toContain(
      `Not allowed to remove last owner for organisaiton: ${hostNameId}`
    );
  });

  test('should not return user credentials for removing user not owner of an organization', async () => {
    // Act
    const res = await removeUserAsOrganizationOwnerCodegen(
      users.spaceMemberEmail,
      organizationId
    );

    // Assert
    expect(
      res?.data?.removeUserAsOrganizationOwner?.agent?.credentials
    ).not.toContainObject(responseData);
  });

  test('should throw error for assigning same organization owner twice', async () => {
    // Arrange
    await assignUserAsOrganizationOwnerCodegen(
      users.spaceMemberEmail,
      organizationId
    );

    // Act
    const res = await assignUserAsOrganizationOwnerCodegen(
      users.spaceMemberEmail,
      organizationId
    );
    // Assert
    expect(res?.error?.errors[0].message).toEqual(
      `Agent (${users.spaceMemberEmail}) already has assigned credential: organization-owner`
    );
  });
});