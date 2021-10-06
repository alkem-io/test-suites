import { getUsers } from '../user.request.params';
import '@test/utils/array.matcher';

import {
  createApplicationMutation,
  getApplication,
  getApplications,
  removeApplicationMutation,
} from './application.request.params';
import { getCommunityData } from '../../integration/community/community.request.params';
import {
  createTestEcoverse,
  ecoverseName,
  ecoverseNameId,
  removeEcoverseMutation,
} from '../../integration/ecoverse/ecoverse.request.params';
import {
  createOrganizationMutation,
  organizationName,
  hostNameId,
  deleteOrganizationMutation,
} from '../../integration/organization/organization.request.params';
import {
  challengeNameId,
  createChallengeMutation,
  removeChallangeMutation,
} from '@test/functional-api/integration/challenge/challenge.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { eventOnApplicationMutation } from '@test/functional-api/integration/lifecycle/lifecycle.request.params';
import {
  removeUserFromCommunityMut,
  removeUserFromCommunityVariablesData,
} from '@test/utils/mutations/remove-mutation';
import { executeMutation } from '@test/utils/graphql.request';
import {
  membershipUserQuery,
  membershipUserQueryVariablesData,
} from '@test/utils/queries/membership';

let applicationId = '';
let challengeApplicationId = '';
let applicationData: any;
let userId = '';
let userEmail = '';
let ecoverseCommunityId = '';
let ecoverseId = '';
let organizationId = '';
let challengeName = `testChallenge ${uniqueId}`;
let challengeId = '';
let challengeCommunityId = '';
let getAppData = '';
let userMembeship: any;
let isMember = '';

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
  ecoverseCommunityId = responseEco.body.data.createEcoverse.community.id;

  const responseCreateChallenge = await createChallengeMutation(
    challengeName,
    uniqueId,
    ecoverseId
  );
  challengeId = responseCreateChallenge.body.data.createChallenge.id;
  challengeCommunityId =
    responseCreateChallenge.body.data.createChallenge.community.id;
});

afterAll(async () => {
  await removeChallangeMutation(challengeId);
  await removeEcoverseMutation(ecoverseId);
  await deleteOrganizationMutation(organizationId);
});

beforeEach(async () => {
  let users = await getUsers();
  let usersArray = users.body.data.users;
  function usersData(entity: { email: string }) {
    return entity.email === 'non.ecoverse@alkem.io';
  }
  userId = usersArray.find(usersData).id;
  userEmail = usersArray.find(usersData).email;
});

afterEach(async () => {
  await executeMutation(
    removeUserFromCommunityMut,
    removeUserFromCommunityVariablesData(ecoverseCommunityId, userId)
  );
  await executeMutation(
    removeUserFromCommunityMut,
    removeUserFromCommunityVariablesData(challengeCommunityId, userId)
  );
  await removeApplicationMutation(challengeApplicationId);
  await removeApplicationMutation(applicationId);
});

describe('Application', () => {
  test('should create application', async () => {
    // Act
    applicationData = await createApplicationMutation(
      ecoverseCommunityId,
      userId
    );
    applicationId = applicationData.body.data.createApplication.id;
    const getApp = await getApplication(ecoverseId, applicationId);

    // Assert
    expect(applicationData.status).toBe(200);
    expect(applicationData.body.data.createApplication.lifecycle.state).toEqual(
      'new'
    );
    expect(applicationData.body.data.createApplication).toEqual(
      getApp.body.data.ecoverse.application
    );
  });

  test('should create ecoverse application, when previous was REJECTED and ARCHIVED', async () => {
    // Arrange
    applicationData = await createApplicationMutation(
      ecoverseCommunityId,
      userId
    );
    applicationId = applicationData.body.data.createApplication.id;

    // Reject and Archive Ecoverse application
    await eventOnApplicationMutation(applicationId, 'REJECT');
    await eventOnApplicationMutation(applicationId, 'ARCHIVE');

    // Act
    // Creates application second time
    applicationData = await createApplicationMutation(
      ecoverseCommunityId,
      userId
    );
    applicationId = applicationData.body.data.createApplication.id;
    const getApp = await getApplication(ecoverseId, applicationId);

    // Assert
    expect(applicationData.status).toBe(200);
    expect(applicationData.body.data.createApplication.lifecycle.state).toEqual(
      'new'
    );
    expect(applicationData.body.data.createApplication).toEqual(
      getApp.body.data.ecoverse.application
    );
  });

  test('should throw error for creating the same application twice', async () => {
    // Act
    let applicationDataOne = await createApplicationMutation(
      ecoverseCommunityId,
      userId
    );
    applicationId = applicationDataOne.body.data.createApplication.id;
    let applicationDataTwo = await createApplicationMutation(
      ecoverseCommunityId,
      userId
    );

    // Assert
    expect(applicationDataTwo.text).toContain(
      `An application (ID: ${applicationId}) already exists for user ${userEmail} on Community: ${ecoverseName} that is not finalized.`
    );
  });

  test('should throw error for quering not existing application', async () => {
    // Act
    let appId = '8bf7752d-59bf-404a-97c8-e906d8377c37';
    const getApp = await getApplication(ecoverseId, appId);

    // Assert
    expect(getApp.status).toBe(200);
    expect(getApp.text).toContain(
      `Application with ID ${appId} can not be found!`
    );
  });

  test('should remove application', async () => {
    // Arrange
    applicationData = await createApplicationMutation(
      ecoverseCommunityId,
      userId
    );
    applicationId = applicationData.body.data.createApplication.id;

    // Act
    let removeApp = await removeApplicationMutation(applicationId);
    const getApp = await getApplication(ecoverseId, applicationId);

    // Assert
    expect(removeApp.status).toBe(200);
    expect(getApp.text).toContain(
      `Application with ID ${applicationId} can not be found!`
    );
  });

    // Bug - user challenge application can be approved, when he/she is not member of the parent community
  // https://app.zenhub.com/workspaces/alkemio-5ecb98b262ebd9f4aec4194c/issues/alkem-io/client-web/1148
  test.only('should throw error for APPROVING challenge application, when user is not ecoverse member', async () => {
    // Arrange
    // Create challenge application
    applicationData = await createApplicationMutation(
      challengeCommunityId,
      userId
    );
    let createAppData = applicationData.body.data.createApplication;
    challengeApplicationId = createAppData.id;

    // // Reject and Archive Ecoverse application
    // await eventOnApplicationMutation(applicationId, 'REJECT');
    // await eventOnApplicationMutation(applicationId, 'ARCHIVE');

    // const getApp = await getApplications(ecoverseId);
    // getAppData =
    //   getApp.body.data.ecoverse.challenges[0].community.applications[0];

    // Act
    // Approve challenge application
    let event = await eventOnApplicationMutation(
      challengeApplicationId,
      'APPROVE'
    );

    // Assert
    expect(event.status).toBe(200);
    expect(event.text).toContain('Error');
  });

});

describe('Application-flows', () => {
  beforeEach(async () => {
    applicationData = await createApplicationMutation(
      ecoverseCommunityId,
      userId
    );
    applicationId = applicationData.body.data.createApplication.id;
  });

  test('should create application on challenge', async () => {
    // Act
    // Create challenge application
    applicationData = await createApplicationMutation(
      challengeCommunityId,
      userId
    );

    let createAppData = applicationData.body.data.createApplication;
    challengeApplicationId = createAppData.id;
    const getApp = await getApplications(ecoverseId);
    let getAppData =
      getApp.body.data.ecoverse.challenges[0].community.applications[0];

    // Assert
    expect(applicationData.status).toBe(200);
    expect(createAppData.lifecycle.state).toEqual('new');
    expect(createAppData).toEqual(getAppData);
  });

  test('should return correct membershipUser applications', async () => {
    // Act
    // Create challenge application
    applicationData = await createApplicationMutation(
      challengeCommunityId,
      userId
    );
    let createAppData = applicationData.body.data.createApplication;
    challengeApplicationId = createAppData.id;

    let userAppsData = await executeMutation(
      membershipUserQuery,
      membershipUserQueryVariablesData(userId)
    );
    let membershipData = userAppsData.body.data.membershipUser.applications;

    let ecoAppOb = {
      id: applicationId,
      state: 'new',
      displayName: ecoverseName,
      communityID: ecoverseCommunityId,
      ecoverseID: ecoverseId,
    };

    let challengeAppOb = {
      id: challengeApplicationId,
      state: 'new',
      displayName: challengeName,
      communityID: challengeCommunityId,
      ecoverseID: ecoverseId,
      challengeID: challengeId,
    };

    // Assert
    expect(membershipData).toContainObject(ecoAppOb);
    expect(membershipData).toContainObject(challengeAppOb);
  });

  test('should return updated membershipUser applications', async () => {
    // Act
    // Create challenge application
    applicationData = await createApplicationMutation(
      challengeCommunityId,
      userId
    );
    let createAppData = applicationData.body.data.createApplication;
    challengeApplicationId = createAppData.id;

    // Remove challenge application
    await removeApplicationMutation(challengeApplicationId);

    // Update ecoverse application state
    await eventOnApplicationMutation(applicationId, 'REJECT');

    let userAppsDataAfter = await executeMutation(
      membershipUserQuery,
      membershipUserQueryVariablesData(userId)
    );
    let membershipDataAfter =
      userAppsDataAfter.body.data.membershipUser.applications;

    let ecoAppOb = {
      id: applicationId,
      state: 'rejected',
      displayName: ecoverseName,
      communityID: ecoverseCommunityId,
      ecoverseID: ecoverseId,
    };

    let challengeAppOb = {
      id: challengeApplicationId,
      state: 'new',
      displayName: challengeName,
      communityID: challengeCommunityId,
      ecoverseID: ecoverseId,
      challengeID: challengeId,
    };

    // Assert
    expect(membershipDataAfter).toContainObject(ecoAppOb);
    expect(membershipDataAfter).not.toContainObject(challengeAppOb);
  });



  test('should approve challenge application, when ecoverse application is APPROVED', async () => {
    // Arrange
    // Create challenge application
    applicationData = await createApplicationMutation(
      challengeCommunityId,
      userId
    );
    let createAppData = applicationData.body.data.createApplication;
    challengeApplicationId = createAppData.id;

    // Reject and Archive Ecoverse application
    await eventOnApplicationMutation(applicationId, 'APPROVE');

    const getApp = await getApplications(ecoverseId);
    getAppData =
      getApp.body.data.ecoverse.challenges[0].community.applications[0];

    // Act
    // Approve challenge application
    let event = await eventOnApplicationMutation(
      challengeApplicationId,
      'APPROVE'
    );
    let state = event.body.data.eventOnApplication.lifecycle;

    userMembeship = await getCommunityData(ecoverseId);
    isMember =
      userMembeship.body.data.ecoverse.challenges[0].community.members[0].id;

    // Assert
    expect(event.status).toBe(200);
    expect(state.state).toContain('approved');
    expect(isMember).toEqual(userId);
  });

   test('should be able to remove challenge application, when ecoverse application is removed', async () => {
    // Arrange
    // Create challenge application
    applicationData = await createApplicationMutation(
      challengeCommunityId,
      userId
    );
    let createAppData = applicationData.body.data.createApplication;
    challengeApplicationId = createAppData.id;

    // Remove Ecoverse application
    await removeApplicationMutation(applicationId);

    // Act
    // Remove challenge application
    await removeApplicationMutation(challengeApplicationId);

    userMembeship = await getCommunityData(ecoverseId);
    isMember = userMembeship.body.data.ecoverse.challenges[0].community.members;

    const getApp = await getApplications(ecoverseId);
    getAppData = getApp.body.data.ecoverse.challenges[0].community.applications;

    // Assert
    expect(getAppData).toHaveLength(0);
    expect(isMember).toHaveLength(0);
  });
});
