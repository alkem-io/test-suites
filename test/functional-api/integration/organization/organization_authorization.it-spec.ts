import '@test/utils/array.matcher';
import {
  createOrganization,
  deleteOrganization,
} from '../organization/organization.request.params';
import {
  assignUserAsOrganizationOwner,
  removeUserAsOrganizationOwner,
  userAsOrganizationOwnerVariablesData,
} from '@test/utils/mutations/authorization-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { mutation } from '@test/utils/graphql.request';

let organizationId = '';
const userNameId = 'hub.member@alkem.io';
const userNameIdTwo = 'non.hub@alkem.io';
const credentialsType = 'ORGANIZATION_OWNER';
const organizationName = 'org-auth-org-name' + uniqueId;
const hostNameId = 'org-auth-org-nameid' + uniqueId;

let responseData: object;

beforeEach(async () => {
  const responseOrg = await createOrganization(organizationName, hostNameId);
  organizationId = responseOrg.body.data.createOrganization.id;

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

    const res = await mutation(
      assignUserAsOrganizationOwner,
      userAsOrganizationOwnerVariablesData(userNameId, organizationId)
    );

    // Assert
    expect(
      res.body.data.assignUserAsOrganizationOwner.agent.credentials
    ).toContainObject(responseData);
  });

  test('should add same user as owner of 2 organization', async () => {
    // Arrange
    const responseOrgTwo = await createOrganization(
      `OrgTwoOwnerOne-${uniqueId}`,
      `orgtwoownerone-${uniqueId}`
    );
    const organizationIdTwo = responseOrgTwo.body.data.createOrganization.id;

    // Act
    const resOne = await mutation(
      assignUserAsOrganizationOwner,
      userAsOrganizationOwnerVariablesData(userNameId, organizationId)
    );

    const resTwo = await mutation(
      assignUserAsOrganizationOwner,
      userAsOrganizationOwnerVariablesData(userNameId, organizationIdTwo)
    );

    // Assert
    expect(
      resOne.body.data.assignUserAsOrganizationOwner.agent.credentials
    ).toContainObject(responseData);
    expect(
      resTwo.body.data.assignUserAsOrganizationOwner.agent.credentials
    ).toContainObject({
      resourceID: organizationIdTwo,
      type: credentialsType,
    });

    await deleteOrganization(organizationIdTwo);
  });

  test('should remove user owner from organization', async () => {
    // Arrange
    await mutation(
      assignUserAsOrganizationOwner,
      userAsOrganizationOwnerVariablesData(userNameId, organizationId)
    );
    await mutation(
      assignUserAsOrganizationOwner,
      userAsOrganizationOwnerVariablesData(userNameIdTwo, organizationId)
    );

    // Act
    const res = await mutation(
      removeUserAsOrganizationOwner,
      userAsOrganizationOwnerVariablesData(userNameId, organizationId)
    );

    // Assert
    expect(
      res.body.data.removeUserAsOrganizationOwner.agent.credentials
    ).not.toContainObject(responseData);
  });

  test('should not remove the only owner of an organization', async () => {
    // Arrange
    await mutation(
      assignUserAsOrganizationOwner,
      userAsOrganizationOwnerVariablesData(userNameId, organizationId)
    );

    // Act
    const res = await mutation(
      removeUserAsOrganizationOwner,
      userAsOrganizationOwnerVariablesData(userNameId, organizationId)
    );

    // Assert
    expect(res.body.errors[0].message).toContain(
      `Not allowed to remove last owner for organisaiton: ${organizationName}`
    );
  });

  test('should not return user credentials for removing user not owner of an organization', async () => {
    // Act
    const res = await mutation(
      removeUserAsOrganizationOwner,
      userAsOrganizationOwnerVariablesData(userNameId, organizationId)
    );

    // Assert
    expect(
      res.body.data.removeUserAsOrganizationOwner.agent.credentials
    ).not.toContainObject(responseData);
  });

  test('should throw error for assigning same organization owner twice', async () => {
    // Arrange
    await mutation(
      assignUserAsOrganizationOwner,
      userAsOrganizationOwnerVariablesData(userNameId, organizationId)
    );

    // Act
    const res = await mutation(
      assignUserAsOrganizationOwner,
      userAsOrganizationOwnerVariablesData(userNameId, organizationId)
    );

    // Assert
    expect(res.text).toContain(
      `Agent (${userNameId}) already has assigned credential: organization-owner`
    );
  });
});
