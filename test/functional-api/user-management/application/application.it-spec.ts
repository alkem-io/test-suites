import { getUsers } from '../user.request.params';
import '@test/utils/array.matcher';

import {
  createApplication,
  getApplication,
  getApplications,
  removeApplication,
} from './application.request.params';
import { getCommunityData } from '../../integration/community/community.request.params';
import {
  createTestHub,
  removeHub,
} from '../../integration/hub/hub.request.params';
import {
  createOrganization,
  deleteOrganization,
} from '../../integration/organization/organization.request.params';
import {
  challengeNameId,
  createChallengeMutation,
  removeChallenge,
} from '@test/functional-api/integration/challenge/challenge.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';

import {
  removeUserFromCommunity,
  removeUserFromCommunityVariablesData,
} from '@test/utils/mutations/remove-mutation';
import { mutation } from '@test/utils/graphql.request';
import {
  membershipUserQuery,
  membershipUserQueryVariablesData,
} from '@test/utils/queries/membership';
import { eventOnApplication } from '@test/functional-api/integration/lifecycle/lifecycle.request.params';

let applicationId = '';
let challengeApplicationId = '';
let applicationData: any;
let userId = '';
let userEmail = '';
let hubCommunityId = '';
let hubId = '';
let organizationId = '';
let challengeName = `testChallenge ${uniqueId}`;
let challengeId = '';
let challengeCommunityId = '';
let getAppData = '';
let userMembeship: any;
let isMember = '';
let organizationName = 'appl-org-name' + uniqueId;
let hostNameId = 'appl-org-nameid' + uniqueId;
let hubName = 'appl-eco-name' + uniqueId;
let hubNameId = 'appl-eco-nameid' + uniqueId;

beforeAll(async () => {
  const responseOrg = await createOrganization(organizationName, hostNameId);
  organizationId = responseOrg.body.data.createOrganization.id;
  let responseEco = await createTestHub(hubName, hubNameId, organizationId);
  hubId = responseEco.body.data.createHub.id;
  hubCommunityId = responseEco.body.data.createHub.community.id;

  const responseCreateChallenge = await createChallengeMutation(
    challengeName,
    uniqueId,
    hubId
  );
  challengeId = responseCreateChallenge.body.data.createChallenge.id;
  challengeCommunityId =
    responseCreateChallenge.body.data.createChallenge.community.id;
});

afterAll(async () => {
  await removeChallenge(challengeId);
  await removeHub(hubId);
  await deleteOrganization(organizationId);
});

beforeEach(async () => {
  let users = await getUsers();
  let usersArray = users.body.data.users;
  function usersData(entity: { email: string }) {
    return entity.email === 'non.hub@alkem.io';
  }
  userId = usersArray.find(usersData).id;
  userEmail = usersArray.find(usersData).email;
});

afterEach(async () => {
  await mutation(
    removeUserFromCommunity,
    removeUserFromCommunityVariablesData(hubCommunityId, userId)
  );
  await mutation(
    removeUserFromCommunity,
    removeUserFromCommunityVariablesData(challengeCommunityId, userId)
  );
  await removeApplication(challengeApplicationId);
  await removeApplication(applicationId);
});

describe('Application', () => {
  test('should create application', async () => {
    // Act
    applicationData = await createApplication(hubCommunityId, userId);
    applicationId = applicationData.body.data.createApplication.id;
    const getApp = await getApplication(hubId, applicationId);

    // Assert
    expect(applicationData.status).toBe(200);
    expect(applicationData.body.data.createApplication.lifecycle.state).toEqual(
      'new'
    );
    expect(applicationData.body.data.createApplication).toEqual(
      getApp.body.data.hub.application
    );
  });

  test('should create hub application, when previous was REJECTED and ARCHIVED', async () => {
    // Arrange
    applicationData = await createApplication(hubCommunityId, userId);
    applicationId = applicationData.body.data.createApplication.id;

    // Reject and Archive Hub application
    await eventOnApplication(applicationId, 'REJECT');
    await eventOnApplication(applicationId, 'ARCHIVE');

    // Act
    // Creates application second time
    applicationData = await createApplication(hubCommunityId, userId);
    applicationId = applicationData.body.data.createApplication.id;
    const getApp = await getApplication(hubId, applicationId);

    // Assert
    expect(applicationData.status).toBe(200);
    expect(applicationData.body.data.createApplication.lifecycle.state).toEqual(
      'new'
    );
    expect(applicationData.body.data.createApplication).toEqual(
      getApp.body.data.hub.application
    );
  });

  test('should throw error for creating the same application twice', async () => {
    // Act
    let applicationDataOne = await createApplication(hubCommunityId, userId);
    applicationId = applicationDataOne.body.data.createApplication.id;
    let applicationDataTwo = await createApplication(hubCommunityId, userId);

    // Assert
    expect(applicationDataTwo.text).toContain(
      `An application (ID: ${applicationId}) already exists for user ${userEmail} on Community: ${hubName} that is not finalized.`
    );
  });

  test('should throw error for quering not existing application', async () => {
    // Act
    let appId = '8bf7752d-59bf-404a-97c8-e906d8377c37';
    const getApp = await getApplication(hubId, appId);

    // Assert
    expect(getApp.status).toBe(200);
    expect(getApp.text).toContain(
      `Application with ID ${appId} can not be found!`
    );
  });

  test('should remove application', async () => {
    // Arrange
    applicationData = await createApplication(hubCommunityId, userId);
    applicationId = applicationData.body.data.createApplication.id;

    // Act
    let removeApp = await removeApplication(applicationId);
    const getApp = await getApplication(hubId, applicationId);

    // Assert
    expect(removeApp.status).toBe(200);
    expect(getApp.text).toContain(
      `Application with ID ${applicationId} can not be found!`
    );
  });

  // Bug - user challenge application can be approved, when he/she is not member of the parent community
  // https://app.zenhub.com/workspaces/alkemio-5ecb98b262ebd9f4aec4194c/issues/alkem-io/client-web/1148
  test.skip('should throw error for APPROVING challenge application, when user is not hub member', async () => {
    // Arrange
    // Create challenge application
    applicationData = await createApplication(challengeCommunityId, userId);
    let createAppData = applicationData.body.data.createApplication;
    challengeApplicationId = createAppData.id;

    // Act
    // Approve challenge application
    let event = await eventOnApplication(challengeApplicationId, 'APPROVE');

    // Assert
    expect(event.status).toBe(200);
    expect(event.text).toContain('Error');
  });
});

describe('Application-flows', () => {
  beforeEach(async () => {
    applicationData = await createApplication(hubCommunityId, userId);
    applicationId = applicationData.body.data.createApplication.id;
  });

  test('should create application on challenge', async () => {
    // Act
    // Create challenge application
    applicationData = await createApplication(challengeCommunityId, userId);

    let createAppData = applicationData.body.data.createApplication;
    challengeApplicationId = createAppData.id;
    const getApp = await getApplications(hubId);
    let getAppData =
      getApp.body.data.hub.challenges[0].community.applications[0];

    // Assert
    expect(applicationData.status).toBe(200);
    expect(createAppData.lifecycle.state).toEqual('new');
    expect(createAppData).toEqual(getAppData);
  });

  test('should return correct membershipUser applications', async () => {
    // Act
    // Create challenge application
    applicationData = await createApplication(challengeCommunityId, userId);
    let createAppData = applicationData.body.data.createApplication;
    challengeApplicationId = createAppData.id;

    let userAppsData = await mutation(
      membershipUserQuery,
      membershipUserQueryVariablesData(userId)
    );
    let membershipData = userAppsData.body.data.membershipUser.applications;

    let ecoAppOb = {
      id: applicationId,
      state: 'new',
      displayName: hubName,
      communityID: hubCommunityId,
      hubID: hubId,
    };

    let challengeAppOb = {
      id: challengeApplicationId,
      state: 'new',
      displayName: challengeName,
      communityID: challengeCommunityId,
      hubID: hubId,
      challengeID: challengeId,
    };

    // Assert
    expect(membershipData).toContainObject(ecoAppOb);
    expect(membershipData).toContainObject(challengeAppOb);
  });

  test('should return updated membershipUser applications', async () => {
    // Act
    // Create challenge application
    applicationData = await createApplication(challengeCommunityId, userId);
    let createAppData = applicationData.body.data.createApplication;
    challengeApplicationId = createAppData.id;

    // Remove challenge application
    await removeApplication(challengeApplicationId);

    // Update hub application state
    await eventOnApplication(applicationId, 'REJECT');

    let userAppsDataAfter = await mutation(
      membershipUserQuery,
      membershipUserQueryVariablesData(userId)
    );
    let membershipDataAfter =
      userAppsDataAfter.body.data.membershipUser.applications;

    let ecoAppOb = {
      id: applicationId,
      state: 'rejected',
      displayName: hubName,
      communityID: hubCommunityId,
      hubID: hubId,
    };

    let challengeAppOb = {
      id: challengeApplicationId,
      state: 'new',
      displayName: challengeName,
      communityID: challengeCommunityId,
      hubID: hubId,
      challengeID: challengeId,
    };

    // Assert
    expect(membershipDataAfter).toContainObject(ecoAppOb);
    expect(membershipDataAfter).not.toContainObject(challengeAppOb);
  });

  test('should approve challenge application, when hub application is APPROVED', async () => {
    // Arrange
    // Create challenge application
    applicationData = await createApplication(challengeCommunityId, userId);
    let createAppData = applicationData.body.data.createApplication;
    challengeApplicationId = createAppData.id;

    // Reject and Archive Hub application
    await eventOnApplication(applicationId, 'APPROVE');

    const getApp = await getApplications(hubId);
    getAppData = getApp.body.data.hub.challenges[0].community.applications[0];

    // Act
    // Approve challenge application
    let event = await eventOnApplication(challengeApplicationId, 'APPROVE');
    let state = event.body.data.eventOnApplication.lifecycle;

    userMembeship = await getCommunityData(hubId);
    isMember =
      userMembeship.body.data.hub.challenges[0].community.members[0].id;

    // Assert
    expect(event.status).toBe(200);
    expect(state.state).toContain('approved');
    expect(isMember).toEqual(userId);
  });

  test('should be able to remove challenge application, when hub application is removed', async () => {
    // Arrange
    // Create challenge application
    applicationData = await createApplication(challengeCommunityId, userId);
    let createAppData = applicationData.body.data.createApplication;
    challengeApplicationId = createAppData.id;

    // Remove Hub application
    let a = await removeApplication(applicationId);
    // Act
    // Remove challenge application
    let b = await removeApplication(challengeApplicationId);
    userMembeship = await getCommunityData(hubId);
    isMember = userMembeship.body.data.hub.challenges[0].community.members;

    const getApp = await getApplications(hubId);
    getAppData = getApp.body.data.hub.challenges[0].community.applications;

    // Assert
    expect(getAppData).toHaveLength(0);
    expect(isMember).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: userId,
        }),
      ])
    );
  });
});
