import '@test/utils/array.matcher';

import {
  createApplication,
  getApplication,
  getApplications,
  getChallengeApplications,
  removeApplication,
} from './application.request.params';
import { getCommunityData } from '../../roles/community/community.request.params';
import { removeHub } from '../../integration/hub/hub.request.params';
import { deleteOrganization } from '../../integration/organization/organization.request.params';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';

import {
  removeUserAsCommunityMember,
  removeUserMemberFromCommunityVariablesData,
} from '@test/utils/mutations/remove-mutation';
import { mutation } from '@test/utils/graphql.request';
import {
  rolesUserQuery,
  rolesUserQueryVariablesData,
} from '@test/utils/queries/roles';
import { eventOnApplication } from '@test/functional-api/integration/lifecycle/innovation-flow.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';

import {
  createChallengeForOrgHub,
  createOrgAndHub,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import {
  assignUserAsCommunityMember,
  assignUserAsCommunityMemberVariablesData,
} from '@test/utils/mutations/assign-mutation';
import { TestUser } from '@test/utils';
import { users } from '@test/utils/queries/users-data';

let applicationId = '';
let challengeApplicationId = '';
let applicationData: any;
const challengeName = `testChallenge ${uniqueId}`;
let getAppData = '';
let userMembeship: any;
let isMember = '';
const organizationName = 'appl-org-name' + uniqueId;
const hostNameId = 'appl-org-nameid' + uniqueId;
const hubName = 'appl-eco-name' + uniqueId;
const hubNameId = 'appl-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndHub(organizationName, hostNameId, hubName, hubNameId);

  await createChallengeForOrgHub(challengeName);
});

afterAll(async () => {
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Application', () => {
  afterEach(async () => {
    await mutation(
      removeUserAsCommunityMember,
      removeUserMemberFromCommunityVariablesData(
        entitiesId.hubCommunityId,
        users.nonHubMemberId
      )
    );
    await mutation(
      removeUserAsCommunityMember,
      removeUserMemberFromCommunityVariablesData(
        entitiesId.challengeCommunityId,
        users.nonHubMemberId
      )
    );
    await removeApplication(applicationId);
  });
  test('should create application', async () => {
    // Act
    applicationData = await createApplication(entitiesId.hubCommunityId);
    applicationId = applicationData.body.data.applyForCommunityMembership.id;
    const getApp = await getApplication(
      entitiesId.hubId,
      applicationId,
      TestUser.NON_HUB_MEMBER
    );

    // Assert
    expect(applicationData.status).toBe(200);
    expect(
      applicationData.body.data.applyForCommunityMembership.lifecycle.state
    ).toEqual('new');
    expect(applicationData.body.data.applyForCommunityMembership).toEqual(
      getApp.body.data.hub.application
    );
  });

  test('should create hub application, when previous was REJECTED and ARCHIVED', async () => {
    // Arrange
    applicationData = await createApplication(entitiesId.hubCommunityId);
    applicationId = applicationData.body.data.applyForCommunityMembership.id;

    // Reject and Archive Hub application
    await eventOnApplication(applicationId, 'REJECT');
    await eventOnApplication(applicationId, 'ARCHIVE');

    // Act
    // Creates application second time
    applicationData = await createApplication(entitiesId.hubCommunityId);
    applicationId = applicationData.body.data.applyForCommunityMembership.id;
    const getApp = await getApplication(
      entitiesId.hubId,
      applicationId,
      TestUser.NON_HUB_MEMBER
    );

    // Assert
    expect(applicationData.status).toBe(200);
    expect(
      applicationData.body.data.applyForCommunityMembership.lifecycle.state
    ).toEqual('new');
    expect(applicationData.body.data.applyForCommunityMembership).toEqual(
      getApp.body.data.hub.application
    );
  });

  test('should throw error for creating the same application twice', async () => {
    // Act
    const applicationDataOne = await createApplication(
      entitiesId.hubCommunityId
    );
    applicationId = applicationDataOne.body.data.applyForCommunityMembership.id;
    const applicationDataTwo = await createApplication(
      entitiesId.hubCommunityId
    );

    // Assert
    expect(applicationDataTwo.text).toContain(
      `An open application (ID: ${applicationId}) already exists for user ${users.nonHubMemberId} on Community: ${hubName}.`
    );
  });

  test('should throw error for quering not existing application', async () => {
    // Act
    const appId = '8bf7752d-59bf-404a-97c8-e906d8377c37';
    const getApp = await getApplication(entitiesId.hubId, appId);

    // Assert
    expect(getApp.status).toBe(200);
    expect(getApp.text).toContain(
      `Application with ID ${appId} can not be found!`
    );
  });

  test('should remove application', async () => {
    // Arrange
    applicationData = await createApplication(entitiesId.hubCommunityId);
    applicationId = applicationData.body.data.applyForCommunityMembership.id;

    // Act
    const removeApp = await removeApplication(applicationId);
    const getApp = await getApplication(entitiesId.hubId, applicationId);

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
    applicationData = await createApplication(entitiesId.challengeCommunityId);
    const createAppData = applicationData.body.data.applyForCommunityMembership;
    challengeApplicationId = createAppData.id;

    // Act
    // Approve challenge application
    const event = await eventOnApplication(challengeApplicationId, 'APPROVE');

    // Assert
    expect(event.status).toBe(200);
    expect(event.text).toContain('Error');
  });
});

describe('Application-flows', () => {
  beforeAll(async () => {
    await mutation(
      assignUserAsCommunityMember,
      assignUserAsCommunityMemberVariablesData(
        entitiesId.hubCommunityId,
        users.nonHubMemberEmail
      )
    );
  });

  afterEach(async () => {
    await mutation(
      removeUserAsCommunityMember,
      removeUserMemberFromCommunityVariablesData(
        entitiesId.challengeCommunityId,
        users.nonHubMemberId
      )
    );
    await removeApplication(challengeApplicationId);
    await removeApplication(applicationId);
  });

  test('should create application on challenge', async () => {
    // Act
    // Create challenge application
    applicationData = await createApplication(entitiesId.challengeCommunityId);

    const createAppData = applicationData.body.data.applyForCommunityMembership;
    challengeApplicationId = createAppData.id;
    const getApp = await getChallengeApplications(
      entitiesId.hubId,
      entitiesId.challengeId,
      TestUser.NON_HUB_MEMBER
    );
    const getAppData = getApp.body.data.hub.challenge.community.applications[0];

    // Assert
    expect(applicationData.status).toBe(200);
    expect(createAppData.lifecycle.state).toEqual('new');
    expect(createAppData).toEqual(getAppData);
  });

  test('should return correct membershipUser applications', async () => {
    // Act
    // Create challenge application
    applicationData = await createApplication(entitiesId.challengeCommunityId);
    const createAppData = applicationData.body.data.applyForCommunityMembership;
    challengeApplicationId = createAppData.id;

    const userAppsData = await mutation(
      rolesUserQuery,
      rolesUserQueryVariablesData(users.nonHubMemberId)
    );

    const membershipData = userAppsData.body.data.rolesUser.applications;

    const challengeAppOb = [
      {
        id: challengeApplicationId,
        state: 'new',
        displayName: challengeName,
        communityID: entitiesId.challengeCommunityId,
        hubID: entitiesId.hubId,
        challengeID: entitiesId.challengeId,
        opportunityID: null,
      },
    ];

    // Assert
    expect(membershipData).toEqual(challengeAppOb);
  });

  test('should return updated membershipUser applications', async () => {
    // Act
    // Create challenge application
    applicationData = await createApplication(entitiesId.challengeCommunityId);
    const createAppData = applicationData.body.data.applyForCommunityMembership;
    challengeApplicationId = createAppData.id;

    // Remove challenge application
    await removeApplication(challengeApplicationId);

    // Update hub application state
    await eventOnApplication(applicationId, 'REJECT');

    const userAppsDataAfter = await mutation(
      rolesUserQuery,
      rolesUserQueryVariablesData(users.nonHubMemberId)
    );
    const membershipDataAfter =
      userAppsDataAfter.body.data.rolesUser.applications;

    const challengeAppOb = {
      id: challengeApplicationId,
      state: 'new',
      displayName: challengeName,
      communityID: entitiesId.challengeCommunityId,
      hubID: entitiesId.hubId,
      challengeID: entitiesId.challengeId,
    };

    // Assert
    expect(membershipDataAfter).not.toContainObject(challengeAppOb);
  });

  test('should approve challenge application, when hub application is APPROVED', async () => {
    // Arrange
    // Create challenge application
    applicationData = await createApplication(entitiesId.challengeCommunityId);
    const createAppData = applicationData.body.data.applyForCommunityMembership;
    challengeApplicationId = createAppData.id;

    // Reject and Archive Hub application
    await eventOnApplication(applicationId, 'APPROVE');

    const getApp = await getApplications(entitiesId.hubId);
    getAppData = getApp.body.data.hub.challenges[0].community.applications[0];

    // Act
    // Approve challenge application
    const event = await eventOnApplication(challengeApplicationId, 'APPROVE');
    const state = event.body.data.eventOnApplication.lifecycle;

    userMembeship = await getCommunityData(entitiesId.hubId);
    isMember =
      userMembeship.body.data.hub.challenges[0].community.memberUsers[0].id;

    // Assert
    expect(event.status).toBe(200);
    expect(state.state).toContain('approved');
    expect(isMember).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: users.nonHubMemberId,
        }),
      ])
    );
  });

  test('should be able to remove challenge application, when hub application is removed', async () => {
    // Arrange
    // Create challenge application
    applicationData = await createApplication(entitiesId.challengeCommunityId);
    const createAppData = applicationData.body.data.applyForCommunityMembership;
    challengeApplicationId = createAppData.id;

    // Remove Hub application
    await removeApplication(applicationId);
    // Act
    // Remove challenge application
    await removeApplication(challengeApplicationId);
    userMembeship = await getCommunityData(entitiesId.hubId);
    isMember = userMembeship.body.data.hub.challenges[0].community.memberUsers;

    const getApp = await getApplications(entitiesId.hubId);
    getAppData = getApp.body.data.hub.challenges[0].community.applications;

    // Assert
    expect(getAppData).toHaveLength(0);
    expect(isMember).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: users.nonHubMemberId,
        }),
      ])
    );
  });
});
