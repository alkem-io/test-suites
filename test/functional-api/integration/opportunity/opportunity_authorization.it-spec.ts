import '@test/utils/array.matcher';
import {
  createOrganization,
  deleteOrganization,
} from '../organization/organization.request.params';
import {
  assignUserAsOpportunityAdmin,
  removeUserAsOpportunityAdmin,
  userAsOpportunityAdminVariablesData,
} from '@test/utils/mutations/authorization-mutation';
import {
  createChallengeMutation,
  removeChallenge,
} from '../challenge/challenge.request.params';
import { createTestHub, removeHub } from '../hub/hub.request.params';
import {
  createOpportunity,
  removeOpportunity,
} from './opportunity.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import { mutation } from '@test/utils/graphql.request';

const userNameId = 'hub.member@alkem.io';
const userNameIdTwo = 'non.hub@alkem.io';
const credentialsType = 'OPPORTUNITY_ADMIN';
const opportunityName = `op-dname${uniqueId}`;
const opportunityNameId = `op-nameid${uniqueId}`;
let opportunityId = '';
let challengeName = '';
let challengeId = '';
let hubId = '';
let organizationId = '';
let responseData: {
  resourceID: string;
  type: string;
};
const organizationName = 'opp-auth-org-name' + uniqueId;
const hostNameId = 'opp-auth-org-nameid' + uniqueId;
const hubName = 'opp-auth-eco-name' + uniqueId;
const hubNameId = 'opp-auth-eco-nameid' + uniqueId;

beforeAll(async () => {
  const responseOrg = await createOrganization(organizationName, hostNameId);
  organizationId = responseOrg.body.data.createOrganization.id;
  const responseEco = await createTestHub(hubName, hubNameId, organizationId);
  hubId = responseEco.body.data.createHub.id;

  challengeName = `opp-auth-nam-ch-${uniqueId}`;
  const responseCreateChallenge = await createChallengeMutation(
    challengeName,
    `opp-auth-namid-ch-${uniqueId}`,
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

afterEach(async () => {
  await removeOpportunity(opportunityId);
});

afterAll(async () => {
  await removeChallenge(challengeId);
  await removeHub(hubId);
  await deleteOrganization(organizationId);
});

describe('Opportunity Admin', () => {
  test('should create opportunity admin', async () => {
    // Act
    const res = await mutation(
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
      'opp-dname-2',
      'opp-nameid-2'
    );
    const opportunityIdTwo = responseOppTwo.body.data.createOpportunity.id;

    // Act
    const resOne = await mutation(
      assignUserAsOpportunityAdmin,
      userAsOpportunityAdminVariablesData(userNameId, opportunityId)
    );

    const resTwo = await mutation(
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

    await removeOpportunity(opportunityIdTwo);
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
    const res = await mutation(
      removeUserAsOpportunityAdmin,
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
    const res = await mutation(
      removeUserAsOpportunityAdmin,
      userAsOpportunityAdminVariablesData(userNameId, opportunityId)
    );

    // Assert
    expect(
      res.body.data.removeUserAsOpportunityAdmin.agent.credentials
    ).not.toContainObject(responseData);
  });

  test('should not return user credentials for removing user not admin of an opportunity', async () => {
    // Act
    const res = await mutation(
      removeUserAsOpportunityAdmin,
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
    const res = await mutation(
      assignUserAsOpportunityAdmin,
      userAsOpportunityAdminVariablesData(userNameIdTwo, opportunityId)
    );

    // Assert
    expect(res.text).toContain(
      `Agent (${userNameId}) already has assigned credential: opportunity-admin`
    );
  });
});
