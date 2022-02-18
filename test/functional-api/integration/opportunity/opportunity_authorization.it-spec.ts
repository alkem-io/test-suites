import '@test/utils/array.matcher';
import {
  createOrganization,
  deleteOrganization,
  hostNameId,
  organizationName,
} from '../organization/organization.request.params';
import {
  assignUserAsOpportunityAdmin,
  assignUserAsOrganizationOwner,
  removeUserAsOpportunity,
  userAsOpportunityAdminVariablesData,
} from '@test/utils/mutations/authorization-mutation';
import {
  createChallengeMutation,
  removeChallenge,
} from '../challenge/challenge.request.params';
import {
  createTestEcoverse,
  hubName,
  removeEcoverse,
} from '../hub/hub.request.params';

import {
  createOpportunity,
  removeOpportunity,
} from './opportunity.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import { mutation } from '@test/utils/graphql.request';

let userNameId = 'hub.member@alkem.io';
let userNameIdTwo = 'non.hub@alkem.io';
let credentialsType = 'OPPORTUNITY_ADMIN';
let opportunityName = 'testOp';
let opportunityNameId = `op${uniqueId}`;
let hubNameId = `eco${uniqueId}`;
let opportunityId = '';
let challengeName = '';
let challengeId = '';
let hubId = '';
let organizationId = '';
let responseData: object;

beforeAll(async () => {
  const responseOrg = await createOrganization(organizationName, hostNameId);
  organizationId = responseOrg.body.data.createOrganization.id;
  let responseEco = await createTestEcoverse(
    hubName,
    hubNameId,
    organizationId
  );
  hubId = responseEco.body.data.createEcoverse.id;

  challengeName = `testChallenge ${uniqueId}`;
  const responseCreateChallenge = await createChallengeMutation(
    challengeName,
    uniqueId,
    hubId
  );
  challengeId = responseCreateChallenge.body.data.createChallenge.id;
});

beforeEach(async () => {
  const responseCreateOpportunityOnChallenge = await createOpportunity(
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
  await removeChallenge(challengeId);
  await removeEcoverse(hubId);
  await deleteOrganization(organizationId);
});

afterEach(async () => {
  await removeOpportunity(opportunityId);
});

describe('Opportunity Admin', () => {
  test('should create opportunity admin', async () => {
    // Act
    let res = await mutation(
      assignUserAsOpportunityAdmin,
      userAsOpportunityAdminVariablesData(userNameId, opportunityId)
    );

    // Assert
    expect(
      res.body.data.assignUserAsOpportunityAdmin.agent.credentials
    ).toContainObject(responseData);
  });

  test('should add same user as admin of 2 opportunities', async () => {
    // Arrange
    const responseOppTwo = await createOpportunity(
      challengeId,
      'opportunityName2',
      'opportunityNameId2'
    );
    let opportunityIdTwo = responseOppTwo.body.data.createOpportunity.id;

    // Act
    let resOne = await mutation(
      assignUserAsOpportunityAdmin,
      userAsOpportunityAdminVariablesData(userNameId, opportunityId)
    );

    let resTwo = await mutation(
      assignUserAsOpportunityAdmin,
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

    await deleteOrganization(opportunityIdTwo);
  });

  test('should be able one opportunity admin to remove another admin from opportunity', async () => {
    // Arrange
    await mutation(
      assignUserAsOpportunityAdmin,
      userAsOpportunityAdminVariablesData(userNameId, opportunityId)
    );
    await mutation(
      assignUserAsOpportunityAdmin,
      userAsOpportunityAdminVariablesData(userNameIdTwo, opportunityId)
    );

    // Act
    let res = await mutation(
      removeUserAsOpportunity,
      userAsOpportunityAdminVariablesData(userNameId, opportunityId),
      TestUser.HUB_MEMBER
    );

    // Assert
    expect(
      res.body.data.removeUserAsOpportunityAdmin.agent.credentials
    ).not.toContainObject(responseData);
  });

  test('should remove the only admin of an opportunity', async () => {
    // Arrange
    await mutation(
      assignUserAsOpportunityAdmin,
      userAsOpportunityAdminVariablesData(userNameIdTwo, opportunityId)
    );

    // Act
    let res = await mutation(
      removeUserAsOpportunity,
      userAsOpportunityAdminVariablesData(userNameId, opportunityId)
    );

    // Assert
    expect(
      res.body.data.removeUserAsOpportunityAdmin.agent.credentials
    ).not.toContainObject(responseData);
  });

  test('should not return user credentials for removing user not admin of an opportunity', async () => {
    // Act
    let res = await mutation(
      removeUserAsOpportunity,
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
    await mutation(
      assignUserAsOpportunityAdmin,
      userAsOpportunityAdminVariablesData(userNameId, opportunityId)
    );

    // Act
    let res = await mutation(
      assignUserAsOpportunityAdmin,
      userAsOpportunityAdminVariablesData(userNameIdTwo, opportunityId)
    );

    // Assert
    expect(res.text).toContain(
      `Agent (${userNameId}) already has assigned credential: opportunity-admin`
    );
  });
});
