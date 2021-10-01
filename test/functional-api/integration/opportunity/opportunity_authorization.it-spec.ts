import '@test/utils/array.matcher';
import {
  createOrganizationMutation,
  deleteOrganizationMutation,
  hostNameId,
  organizationName,
} from '../organization/organization.request.params';
import {
  assignUserAsOpportunityAdminMut,
  assignUserAsOrganizationOwnerMutation,
  executeAuthorization,
  removeUserAsOpportunityMut,
  userAsOpportunityAdminVariablesData,
} from '@test/utils/mutations/authorization-mutation';
import {
  createChallengeMutation,
  removeChallangeMutation,
} from '../challenge/challenge.request.params';
import {
  createTestEcoverse,
  ecoverseName,
  removeEcoverseMutation,
} from '../ecoverse/ecoverse.request.params';

import {
  createOpportunityMutation,
  removeOpportunityMutation,
} from './opportunity.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';

let userNameId = 'ecoverse.member@alkem.io';
let userNameIdTwo = 'non.ecoverse@alkem.io';
let credentialsType = 'OPPORTUNITY_ADMIN';
let opportunityName = 'testOp';
let opportunityNameId = `op${uniqueId}`;
let ecoverseNameId = `eco${uniqueId}`;
let opportunityId = '';
let challengeName = '';
let challengeId = '';
let ecoverseId = '';
let organizationId = '';
let responseData: object;

beforeAll(async () => {
  const responseOrg = await createOrganizationMutation(
    organizationName,
    hostNameId
  );
  organizationId = responseOrg.body.data.createOrganization.id;
  let responseEco = await createTestEcoverse(
    ecoverseName,
    ecoverseNameId,
    organizationId
  );
  ecoverseId = responseEco.body.data.createEcoverse.id;

  challengeName = `testChallenge ${uniqueId}`;
  const responseCreateChallenge = await createChallengeMutation(
    challengeName,
    uniqueId,
    ecoverseId
  );
  challengeId = responseCreateChallenge.body.data.createChallenge.id;
});

beforeEach(async () => {
  const responseCreateOpportunityOnChallenge = await createOpportunityMutation(
    challengeId,
    opportunityName,
    opportunityNameId
  );

  opportunityId =
    responseCreateOpportunityOnChallenge.body.data.createOpportunity.id;

  responseData = {
    resourceID: opportunityId,
    type: credentialsType,
  };
});

afterAll(async () => {
  await removeChallangeMutation(challengeId);
  await removeEcoverseMutation(ecoverseId);
  await deleteOrganizationMutation(organizationId);
});

afterEach(async () => {
  await removeOpportunityMutation(opportunityId);
});

describe('Opportunity Admin', () => {
  test('should create opportunity admin', async () => {
    // Act
    let res = await executeAuthorization(
      assignUserAsOpportunityAdminMut,
      userAsOpportunityAdminVariablesData(userNameId, opportunityId)
    );

    // Assert
    expect(
      res.body.data.assignUserAsOpportunityAdmin.agent.credentials
    ).toContainObject(responseData);
  });

  test('should add same user as admin of 2 opportunities', async () => {
    // Arrange
    const responseOppTwo = await createOpportunityMutation(
      challengeId,
      'opportunityName2',
      'opportunityNameId2'
    );
    let opportunityIdTwo = responseOppTwo.body.data.createOpportunity.id;

    // Act
    let resOne = await executeAuthorization(
      assignUserAsOpportunityAdminMut,
      userAsOpportunityAdminVariablesData(userNameId, opportunityId)
    );

    let resTwo = await executeAuthorization(
      assignUserAsOpportunityAdminMut,
      userAsOpportunityAdminVariablesData(userNameId, opportunityIdTwo)
    );

    // Assert
    expect(
      resOne.body.data.assignUserAsOpportunityAdmin.agent.credentials
    ).toContainObject(responseData);
    expect(
      resTwo.body.data.assignUserAsOpportunityAdmin.agent.credentials
    ).toContainObject({
      resourceID: opportunityIdTwo,
      type: credentialsType,
    });

    await deleteOrganizationMutation(opportunityIdTwo);
  });

  test('should be able one opportunity admin to remove another admin from opportunity', async () => {
    // Arrange
    await executeAuthorization(
      assignUserAsOpportunityAdminMut,
      userAsOpportunityAdminVariablesData(userNameId, opportunityId)
    );
    await executeAuthorization(
      assignUserAsOpportunityAdminMut,
      userAsOpportunityAdminVariablesData(userNameIdTwo, opportunityId)
    );

    // Act
    let res = await executeAuthorization(
      removeUserAsOpportunityMut,
      userAsOpportunityAdminVariablesData(userNameId, opportunityId),
      TestUser.ECOVERSE_MEMBER
    );

    // Assert
    expect(
      res.body.data.removeUserAsOpportunityAdmin.agent.credentials
    ).not.toContainObject(responseData);
  });

  test('should remove the only admin of an opportunity', async () => {
    // Arrange
    await executeAuthorization(
      assignUserAsOpportunityAdminMut,
      userAsOpportunityAdminVariablesData(userNameIdTwo, opportunityId)
    );

    // Act
    let res = await executeAuthorization(
      removeUserAsOpportunityMut,
      userAsOpportunityAdminVariablesData(userNameId, opportunityId)
    );

    // Assert
    expect(
      res.body.data.removeUserAsOpportunityAdmin.agent.credentials
    ).not.toContainObject(responseData);
  });

  test('should not return user credentials for removing user not admin of an opportunity', async () => {
    // Act
    let res = await executeAuthorization(
      removeUserAsOpportunityMut,
      userAsOpportunityAdminVariablesData(userNameId, opportunityId)
    );

    // Assert
    expect(
      res.body.data.removeUserAsOpportunityAdmin.agent.credentials
    ).not.toContainObject(responseData);
  });

  // ToDo - confirm behavior
  test.skip('should throw error for assigning same opportunity admin twice', async () => {
    // Arrange
    await executeAuthorization(
      assignUserAsOpportunityAdminMut,
      userAsOpportunityAdminVariablesData(userNameId, opportunityId)
    );
    await assignUserAsOrganizationOwnerMutation(userNameId, opportunityId);

    // Act
    let res = await executeAuthorization(
      assignUserAsOpportunityAdminMut,
      userAsOpportunityAdminVariablesData(userNameIdTwo, opportunityId)
    );

    // Assert
    expect(res.text).toContain(
      `Agent (${userNameId}) already has assigned credential: opportunity-admin`
    );
  });
});
