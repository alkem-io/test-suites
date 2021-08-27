import '@test/utils/array.matcher';
import {
  createOrganisationMutation,
  deleteOrganisationMutation,
  hostNameId,
  organisationName,
} from '../organisation/organisation.request.params';
import {
  assignUserAsOrganisationOwnerMutation,
  executeOrganisationAuthorization,
  removeUserAsOrganisationOwnerMut,
  userAsOrganisationOwnerVariablesData,
} from '@test/utils/mutations/authorization-mutation';

let organisationId = '';
let userNameId = 'ecoverse.member@alkem.io';
let userNameIdTwo = 'non.ecoverse@alkem.io';
let credentialsType = 'OrganisationOwner';

let responseData: object;

beforeEach(async () => {
  const responseOrg = await createOrganisationMutation(
    organisationName,
    hostNameId
  );
  organisationId = responseOrg.body.data.createOrganisation.id;

  responseData = {
    resourceID: organisationId,
    type: credentialsType,
  };
});

afterEach(async () => {
  await deleteOrganisationMutation(organisationId);
});

describe('Organisation Owner', () => {
  test('should create organisation owner', async () => {
    // Act
    let res = await assignUserAsOrganisationOwnerMutation(
      userNameId,
      organisationId
    );

    // Assert
    expect(
      res.body.data.assignUserAsOrganisationOwner.agent.credentials
    ).toContainObject(responseData);
  });

  test('should add same user as owner of 2 organisation', async () => {
    // Arrange
    const responseOrgTwo = await createOrganisationMutation(
      'OrgTwoOwnerOne',
      'OrgTwoOwnerOne'
    );
    let organisationIdTwo = responseOrgTwo.body.data.createOrganisation.id;

    // Act
    let resOne = await assignUserAsOrganisationOwnerMutation(
      userNameId,
      organisationId
    );

    let resTwo = await assignUserAsOrganisationOwnerMutation(
      userNameId,
      organisationIdTwo
    );

    // Assert
    expect(
      resOne.body.data.assignUserAsOrganisationOwner.agent.credentials
    ).toContainObject(responseData);
    expect(
      resTwo.body.data.assignUserAsOrganisationOwner.agent.credentials
    ).toContainObject({
      resourceID: organisationIdTwo,
      type: credentialsType,
    });

    await deleteOrganisationMutation(organisationIdTwo);
  });

  test('should remove user owner from organisation', async () => {
    // Arrange
    await assignUserAsOrganisationOwnerMutation(userNameId, organisationId);
    await assignUserAsOrganisationOwnerMutation(userNameIdTwo, organisationId);

    // Act
    let res = await executeOrganisationAuthorization(
      removeUserAsOrganisationOwnerMut,
      userAsOrganisationOwnerVariablesData(userNameId, organisationId)
    );

    // Assert
    expect(
      res.body.data.removeUserAsOrganisationOwner.agent.credentials
    ).not.toContainObject(responseData);
  });

  test('should not remove the only owner of an organisation', async () => {
    // Arrange
    await assignUserAsOrganisationOwnerMutation(userNameId, organisationId);

    // Act
    let res = await executeOrganisationAuthorization(
      removeUserAsOrganisationOwnerMut,
      userAsOrganisationOwnerVariablesData(userNameId, organisationId)
    );

    // Assert
    expect(res.text).toContain(
      `Not allowed to remove last owner for organisaiton: ${hostNameId}`
    );
  });

  test('should not return user credentials for removing user not owner of an organisation', async () => {
    // Act
    let res = await executeOrganisationAuthorization(
      removeUserAsOrganisationOwnerMut,
      userAsOrganisationOwnerVariablesData(userNameId, organisationId)
    );

    // Assert
    expect(
      res.body.data.removeUserAsOrganisationOwner.agent.credentials
    ).not.toContainObject(responseData);
  });

  test('should throw error for assigning same organisation owner twice', async () => {
    // Arrange
    await assignUserAsOrganisationOwnerMutation(userNameId, organisationId);

    // Act
    let res = await assignUserAsOrganisationOwnerMutation(
      userNameId,
      organisationId
    );

    // Assert
    expect(res.text).toContain(
      `Agent (${userNameId}) already has assigned credential: organisation-owner`
    );
  });
});
