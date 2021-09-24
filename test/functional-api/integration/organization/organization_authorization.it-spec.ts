import '@test/utils/array.matcher';
import {
  createOrganizationMutation,
  deleteOrganizationMutation,
  hostNameId,
  organizationName,
} from '../organization/organization.request.params';
import {
  assignUserAsOrganizationOwnerMutation,
  executeAuthorization,
  removeUserAsOrganizationOwnerMut,
  userAsOrganizationOwnerVariablesData,
} from '@test/utils/mutations/authorization-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';

let organizationId = '';
let userNameId = 'ecoverse.member@alkem.io';
let userNameIdTwo = 'non.ecoverse@alkem.io';
let credentialsType = 'ORGANIZATION_OWNER';

let responseData: object;

beforeEach(async () => {
  const responseOrg = await createOrganizationMutation(
    organizationName,
    hostNameId
  );
  organizationId = responseOrg.body.data.createOrganization.id;

  responseData = {
    resourceID: organizationId,
    type: credentialsType,
  };
});

afterEach(async () => {
  await deleteOrganizationMutation(organizationId);
});

describe('Organization Owner', () => {
  test('should create organization owner', async () => {
    // Act
    let res = await assignUserAsOrganizationOwnerMutation(
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
    const responseOrgTwo = await createOrganizationMutation(
      `OrgTwoOwnerOne-${uniqueId}`,
      `OrgTwoOwnerOne-${uniqueId}`
    );
    let organizationIdTwo = responseOrgTwo.body.data.createOrganization.id;

    // Act
    let resOne = await assignUserAsOrganizationOwnerMutation(
      userNameId,
      organizationId
    );

    let resTwo = await assignUserAsOrganizationOwnerMutation(
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

    await deleteOrganizationMutation(organizationIdTwo);
  });

  test('should remove user owner from organization', async () => {
    // Arrange
    await assignUserAsOrganizationOwnerMutation(userNameId, organizationId);
    await assignUserAsOrganizationOwnerMutation(userNameIdTwo, organizationId);

    // Act
    let res = await executeAuthorization(
      removeUserAsOrganizationOwnerMut,
      userAsOrganizationOwnerVariablesData(userNameId, organizationId)
    );

    // Assert
    expect(
      res.body.data.removeUserAsOrganizationOwner.agent.credentials
    ).not.toContainObject(responseData);
  });

  test('should not remove the only owner of an organization', async () => {
    // Arrange
    await assignUserAsOrganizationOwnerMutation(userNameId, organizationId);

    // Act
    let res = await executeAuthorization(
      removeUserAsOrganizationOwnerMut,
      userAsOrganizationOwnerVariablesData(userNameId, organizationId)
    );

    // Assert
    expect(res.body.errors[0].message).toContain(
      `Not allowed to remove last owner for organisaiton: ${hostNameId}`
    );
  });

  test('should not return user credentials for removing user not owner of an organization', async () => {
    // Act
    let res = await executeAuthorization(
      removeUserAsOrganizationOwnerMut,
      userAsOrganizationOwnerVariablesData(userNameId, organizationId)
    );

    // Assert
    expect(
      res.body.data.removeUserAsOrganizationOwner.agent.credentials
    ).not.toContainObject(responseData);
  });

  test('should throw error for assigning same organization owner twice', async () => {
    // Arrange
    await assignUserAsOrganizationOwnerMutation(userNameId, organizationId);

    // Act
    let res = await assignUserAsOrganizationOwnerMutation(
      userNameId,
      organizationId
    );

    // Assert
    expect(res.text).toContain(
      `Agent (${userNameId}) already has assigned credential: organization-owner`
    );
  });
});
