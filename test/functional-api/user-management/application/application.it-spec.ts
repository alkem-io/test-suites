import '@test/utils/array.matcher';

import {
  createApplication,
  getApplication,
  getApplications,
  getChallengeApplications,
  meQuery,
  removeApplication,
} from './application.request.params';
import { getCommunityData } from '../../roles/community/community.request.params';
import { removeSpace } from '../../integration/space/space.request.params';
import { deleteOrganization } from '../../integration/organization/organization.request.params';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';

import { eventOnApplication } from '@test/functional-api/integration/lifecycle/innovation-flow.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';

import {
  createChallengeForOrgSpace,
  createOrgAndSpace,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { TestUser } from '@test/utils';
import { users } from '@test/utils/queries/users-data';
import {
  assignCommunityRoleToUser,
  removeCommunityRoleFromUser,
  RoleType,
} from '@test/functional-api/integration/community/community.request.params';
import {
  ChallengePreferenceType,
  changePreferenceChallenge,
} from '@test/utils/mutations/preferences-mutation';

let applicationId = '';
let challengeApplicationId = '';
let applicationData: any;
const challengeName = `testChallenge ${uniqueId}`;
let getAppData = '';
let userMembeship: any;
let isMember = '';
const organizationName = 'appl-org-name' + uniqueId;
const hostNameId = 'appl-org-nameid' + uniqueId;
const spaceName = 'appl-eco-name' + uniqueId;
const spaceNameId = 'appl-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndSpace(organizationName, hostNameId, spaceName, spaceNameId);

  await createChallengeForOrgSpace(challengeName);
});

afterAll(async () => {
  await removeChallenge(entitiesId.challengeId);
  await removeSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Application', () => {
  afterEach(async () => {
    await removeCommunityRoleFromUser(
      users.nonSpaceMemberId,
      entitiesId.spaceCommunityId,
      RoleType.MEMBER
    );
    await removeCommunityRoleFromUser(
      users.nonSpaceMemberId,
      entitiesId.challengeCommunityId,
      RoleType.MEMBER
    );
    await removeApplication(applicationId);
  });
  test('should create application', async () => {
    // Act
    applicationData = await createApplication(entitiesId.spaceCommunityId);
    applicationId = applicationData.body.data.applyForCommunityMembership.id;
    const getApp = await getApplication(
      entitiesId.spaceId,
      applicationId,
      TestUser.NON_HUB_MEMBER
    );

    // Assert
    expect(applicationData.status).toBe(200);
    expect(
      applicationData.body.data.applyForCommunityMembership.lifecycle.state
    ).toEqual('new');
    expect(applicationData.body.data.applyForCommunityMembership).toEqual(
      getApp.body.data.space.application
    );
  });

  test('should create space application, when previous was REJECTED and ARCHIVED', async () => {
    // Arrange
    applicationData = await createApplication(entitiesId.spaceCommunityId);
    applicationId = applicationData.body.data.applyForCommunityMembership.id;

    // Reject and Archive Space application
    await eventOnApplication(applicationId, 'REJECT');
    await eventOnApplication(applicationId, 'ARCHIVE');

    // Act
    // Creates application second time
    applicationData = await createApplication(entitiesId.spaceCommunityId);
    applicationId = applicationData.body.data.applyForCommunityMembership.id;
    const getApp = await getApplication(
      entitiesId.spaceId,
      applicationId,
      TestUser.NON_HUB_MEMBER
    );

    // Assert
    expect(applicationData.status).toBe(200);
    expect(
      applicationData.body.data.applyForCommunityMembership.lifecycle.state
    ).toEqual('new');
    expect(applicationData.body.data.applyForCommunityMembership).toEqual(
      getApp.body.data.space.application
    );
  });

  test('should throw error for creating the same application twice', async () => {
    // Act
    const applicationDataOne = await createApplication(
      entitiesId.spaceCommunityId
    );
    applicationId = applicationDataOne.body.data.applyForCommunityMembership.id;
    const applicationDataTwo = await createApplication(
      entitiesId.spaceCommunityId
    );

    // Assert
    expect(applicationDataTwo.text).toContain(
      `An open application (ID: ${applicationId}) already exists for user ${users.nonSpaceMemberId} on Community: ${entitiesId.spaceCommunityId}.`
    );
  });

  test('should throw error for quering not existing application', async () => {
    // Act
    const appId = '8bf7752d-59bf-404a-97c8-e906d8377c37';
    const getApp = await getApplication(entitiesId.spaceId, appId);

    // Assert
    expect(getApp.status).toBe(200);
    expect(getApp.text).toContain(
      `Application with ID ${appId} can not be found!`
    );
  });

  test('should remove application', async () => {
    // Arrange
    applicationData = await createApplication(entitiesId.spaceCommunityId);
    applicationId = applicationData.body.data.applyForCommunityMembership.id;

    // Act
    const removeApp = await removeApplication(applicationId);
    const getApp = await getApplication(entitiesId.spaceId, applicationId);

    // Assert
    expect(removeApp.status).toBe(200);
    expect(getApp.text).toContain(
      `Application with ID ${applicationId} can not be found!`
    );
  });

  // Bug - user challenge application can be approved, when he/she is not member of the parent community
  // https://app.zenspace.com/workspaces/alkemio-5ecb98b262ebd9f4aec4194c/issues/alkem-io/client-web/1148
  test.skip('should throw error for APPROVING challenge application, when user is not space member', async () => {
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
    await assignCommunityRoleToUser(
      users.nonSpaceMemberId,
      entitiesId.spaceCommunityId,
      RoleType.MEMBER
    );
  });

  afterEach(async () => {
    await removeCommunityRoleFromUser(
      users.nonSpaceMemberId,
      entitiesId.challengeCommunityId,
      RoleType.MEMBER
    );
    await removeApplication(challengeApplicationId);
    await removeApplication(applicationId);
  });

  test('should create application on challenge', async () => {
    // Act
    // Create challenge application

    await changePreferenceChallenge(
      entitiesId.challengeId,
      ChallengePreferenceType.APPLY_CHALLENGE_FROM_HUB_MEMBERS,
      'true'
    );

    applicationData = await createApplication(
      entitiesId.challengeCommunityId,
      TestUser.NON_HUB_MEMBER
    );

    const createAppData = applicationData.body.data.applyForCommunityMembership;
    challengeApplicationId = createAppData.id;
    const getApp = await getChallengeApplications(
      entitiesId.spaceId,
      entitiesId.challengeId,
      TestUser.NON_HUB_MEMBER
    );
    const getAppData =
      getApp.body.data.space.challenge.community.applications[0];

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

    const userAppsData = await meQuery();

    const membershipData = userAppsData.body.data.me.applications;

    const challengeAppOb = [
      {
        id: challengeApplicationId,
        state: 'new',
        displayName: challengeName,
        communityID: entitiesId.challengeCommunityId,
        spaceID: entitiesId.spaceId,
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

    // Update space application state
    await eventOnApplication(applicationId, 'REJECT');

    const userAppsDataAfter = await meQuery();
    const membershipDataAfter = userAppsDataAfter.body.data.me.applications;

    const challengeAppOb = {
      id: challengeApplicationId,
      state: 'new',
      displayName: challengeName,
      communityID: entitiesId.challengeCommunityId,
      spaceID: entitiesId.spaceId,
      challengeID: entitiesId.challengeId,
    };

    // Assert
    expect(membershipDataAfter).not.toContainObject(challengeAppOb);
  });

  test('should approve challenge application, when space application is APPROVED', async () => {
    // Arrange
    // Create challenge application
    applicationData = await createApplication(entitiesId.challengeCommunityId);
    const createAppData = applicationData.body.data.applyForCommunityMembership;
    challengeApplicationId = createAppData.id;

    // Reject and Archive Space application
    await eventOnApplication(applicationId, 'APPROVE');

    const getApp = await getApplications(entitiesId.spaceId);
    getAppData = getApp.body.data.space.challenges[0].community.applications[0];

    // Act
    // Approve challenge application
    const event = await eventOnApplication(challengeApplicationId, 'APPROVE');
    const state = event.body.data.eventOnApplication.lifecycle;

    userMembeship = await getCommunityData(entitiesId.spaceId);
    isMember =
      userMembeship.body.data.space.challenges[0].community.memberUsers[0].id;

    // Assert
    expect(event.status).toBe(200);
    expect(state.state).toContain('approved');
    expect(isMember).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: users.nonSpaceMemberId,
        }),
      ])
    );
  });

  test('should be able to remove challenge application, when space application is removed', async () => {
    // Arrange
    // Create challenge application
    applicationData = await createApplication(entitiesId.challengeCommunityId);
    const createAppData = applicationData.body.data.applyForCommunityMembership;
    challengeApplicationId = createAppData.id;

    // Remove Space application
    await removeApplication(applicationId);
    // Act
    // Remove challenge application
    await removeApplication(challengeApplicationId);
    userMembeship = await getCommunityData(entitiesId.spaceId);
    isMember =
      userMembeship.body.data.space.challenges[0].community.memberUsers;

    const getApp = await getApplications(entitiesId.spaceId);
    getAppData = getApp.body.data.space.challenges[0].community.applications;

    // Assert
    expect(getAppData).toHaveLength(0);
    expect(isMember).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: users.nonSpaceMemberId,
        }),
      ])
    );
  });
});
