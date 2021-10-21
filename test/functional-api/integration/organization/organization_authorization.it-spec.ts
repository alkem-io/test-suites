import '@test/utils/array.matcher';
import {
  createOrganization,
  deleteOrganization,
  hostNameId,
  organizationName,
} from '../organization/organization.request.params';
import {
  assignUserAsOrganizationOwneration,
  removeUserAsOrganizationOwner,
  userAsOrganizationOwnerVariablesData,
} from '@test/utils/mutations/authorization-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { mutation } from '@test/utils/graphql.request';

let organizationId = '';
let userNameId = 'ecoverse.member@alkem.io';
let userNameIdTwo = 'non.ecoverse@alkem.io';
let credentialsType = 'ORGANIZATION_OWNER';

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
    let res = await assignUserAsOrganizationOwneration(
      userNameId,
      organizationId
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
      `OrgTwoOwnerOne-${uniqueId}`
    );
    let organizationIdTwo = responseOrgTwo.body.data.createOrganization.id;

    // Act
    let resOne = await assignUserAsOrganizationOwneration(
      userNameId,
      organizationId
    );

    let resTwo = await assignUserAsOrganizationOwneration(
      userNameId,
      organizationIdTwo
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
    await assignUserAsOrganizationOwneration(userNameId, organizationId);
    await assignUserAsOrganizationOwneration(userNameIdTwo, organizationId);

    // Act
    let res = await mutation(
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
    await assignUserAsOrganizationOwneration(userNameId, organizationId);

    // Act
    let res = await mutation(
      removeUserAsOrganizationOwner,
      userAsOrganizationOwnerVariablesData(userNameId, organizationId)
    );

    // Assert
    expect(res.body.errors[0].message).toContain(
      `Not allowed to remove last owner for organisaiton: ${hostNameId}`
    );
  });

  test('should not return user credentials for removing user not owner of an organization', async () => {
    // Act
    let res = await mutation(
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
    await assignUserAsOrganizationOwneration(userNameId, organizationId);

    // Act
    let res = await assignUserAsOrganizationOwneration(
      userNameId,
      organizationId
    );

    // Assert
    expect(res.text).toContain(
      `Agent (${userNameId}) already has assigned credential: organization-owner`
    );
  });
});
