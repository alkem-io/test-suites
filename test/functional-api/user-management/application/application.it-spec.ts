import '@test/utils/array.matcher';
import {
  createApplicationCodegen,
  deleteApplicationCodegen,
  getChallengeApplicationsCodegen,
  getCommunityInvitationsApplicationsCodegen,
  meQueryCodegen,
} from './application.request.params';
import {
  deleteSpaceCodegen,
  updateSpaceSettingsCodegen,
} from '../../journey/space/space.request.params';
import { deleteOrganizationCodegen } from '../../organization/organization.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { eventOnApplicationCodegen } from '@test/functional-api/lifecycle/innovation-flow.request.params';
import { TestUser } from '@test/utils';
import { users } from '@test/utils/queries/users-data';
import {
  createChallengeForOrgSpaceCodegen,
  createOrgAndSpaceCodegen,
} from '@test/utils/data-setup/entities';
import { entitiesId } from '@test/functional-api/roles/community/communications-helper';
import {
  removeCommunityRoleFromUserCodegen,
  assignCommunityRoleToUserCodegen,
} from '@test/functional-api/roles/roles-request.params';
import {
  CommunityMembershipPolicy,
  CommunityRole,
  SpacePrivacyMode,
} from '@test/generated/alkemio-schema';
import { updateSubspaceSettingsCodegen } from '@test/functional-api/journey/challenge/challenge.request.params';

let applicationId: string;
let challengeApplicationId = '';
let applicationData: any;
const challengeName = `testChallenge ${uniqueId}`;
let userMembeship: any;
let isMember = '';
const organizationName = 'appl-org-name' + uniqueId;
const hostNameId = 'appl-org-nameid' + uniqueId;
const spaceName = 'appl-eco-name' + uniqueId;
const spaceNameId = 'appl-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndSpaceCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );

  await createChallengeForOrgSpaceCodegen(challengeName);
  await updateSpaceSettingsCodegen(entitiesId.spaceId, {
    privacy: {
      mode: SpacePrivacyMode.Public,
    },
    membership: {
      policy: CommunityMembershipPolicy.Applications,
    },
  });
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('Application', () => {
  afterEach(async () => {
    await removeCommunityRoleFromUserCodegen(
      users.nonSpaceMemberId,
      entitiesId.spaceCommunityId,
      CommunityRole.Member
    );
    await removeCommunityRoleFromUserCodegen(
      users.nonSpaceMemberId,
      entitiesId.challengeCommunityId,
      CommunityRole.Member
    );
    await deleteApplicationCodegen(applicationId);
  });
  test('should create application', async () => {
    // Act
    applicationData = await createApplicationCodegen(
      entitiesId.spaceCommunityId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    applicationId = applicationData?.data?.applyForCommunityMembership?.id;
    const userAppsData = await meQueryCodegen(TestUser.GLOBAL_COMMUNITY_ADMIN);

    const getApp = userAppsData?.data?.me?.applications;

    // Assert
    expect(applicationData.status).toBe(200);
    expect(
      applicationData?.data?.applyForCommunityMembership?.lifecycle?.state
    ).toEqual('new');
    expect(getApp).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: applicationId,
        }),
      ])
    );
    expect(getApp).toHaveLength(1);
  });

  test('should create space application, when previous was REJECTED and ARCHIVED', async () => {
    // Arrange
    applicationData = await createApplicationCodegen(
      entitiesId.spaceCommunityId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    applicationId = applicationData?.data?.applyForCommunityMembership?.id;

    // Reject and Archive Space application
    await eventOnApplicationCodegen(applicationId, 'REJECT');
    await eventOnApplicationCodegen(applicationId, 'ARCHIVE');

    // Act
    // Creates application second time
    applicationData = await createApplicationCodegen(
      entitiesId.spaceCommunityId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    applicationId = applicationData?.data?.applyForCommunityMembership?.id;

    const userAppsData = await meQueryCodegen(TestUser.GLOBAL_COMMUNITY_ADMIN);
    const getApp = userAppsData?.data?.me?.applications;

    // Assert
    expect(applicationData.status).toBe(200);
    expect(
      applicationData?.data?.applyForCommunityMembership?.lifecycle?.state
    ).toEqual('new');
    expect(getApp).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: applicationId,
        }),
      ])
    );
    const getAppFiltered =
      getApp?.filter(app => app.state !== 'archived') ?? [];
    expect(getAppFiltered).toHaveLength(1);
  });

  test('should throw error for creating the same application twice', async () => {
    // Act
    const applicationDataOne = await createApplicationCodegen(
      entitiesId.spaceCommunityId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    applicationId =
      applicationDataOne?.data?.applyForCommunityMembership?.id ?? '';
    const applicationDataTwo = await createApplicationCodegen(
      entitiesId.spaceCommunityId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );

    // Assert
    expect(applicationDataTwo.error?.errors[0].message).toContain(
      `An open application (ID: ${applicationId}) already exists for user ${users.globalCommunityAdminId} on Community: ${entitiesId.spaceCommunityId}.`
    );
  });

  test('should remove application', async () => {
    // Arrange
    applicationData = await createApplicationCodegen(
      entitiesId.spaceCommunityId,
      TestUser.QA_USER
    );
    applicationId = applicationData?.data?.applyForCommunityMembership?.id;

    // Act
    const removeApp = await deleteApplicationCodegen(applicationId);
    const userAppsData = await meQueryCodegen(TestUser.QA_USER);
    const getApp = userAppsData?.data?.me?.applications;

    // Assert
    expect(removeApp.status).toBe(200);
    expect(getApp).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: applicationId,
        }),
      ])
    );
    expect(getApp).toHaveLength(0);
  });

  // Bug - user challenge application can be approved, when he/she is not member of the parent community
  // https://app.zenspace.com/workspaces/alkemio-5ecb98b262ebd9f4aec4194c/issues/alkem-io/client-web/1148
  test.skip('should throw error for APPROVING challenge application, when user is not space member', async () => {
    // Arrange
    // Create challenge application
    applicationData = await createApplicationCodegen(
      entitiesId.challengeCommunityId
    );
    const createAppData = applicationData?.data?.applyForCommunityMembership;
    challengeApplicationId = createAppData?.id;

    // Act
    // Approve challenge application
    const event = await eventOnApplicationCodegen(
      challengeApplicationId,
      'APPROVE'
    );

    // Assert
    expect(event.status).toBe(200);
    expect(event.error?.errors[0].message).toContain('Error');
  });
});

describe('Application-flows', () => {
  beforeAll(async () => {
    await assignCommunityRoleToUserCodegen(
      users.globalCommunityAdminId,
      entitiesId.spaceCommunityId,
      CommunityRole.Member
    );
  });

  afterEach(async () => {
    await removeCommunityRoleFromUserCodegen(
      users.globalCommunityAdminId,
      entitiesId.challengeCommunityId,
      CommunityRole.Member
    );
    await deleteApplicationCodegen(challengeApplicationId);
    await deleteApplicationCodegen(applicationId);
  });

  // to be updated
  test('should create application on challenge', async () => {
    // Act
    // Switch to updateSubspaceSettingsCodegen when the bug #3842 is fixed
    await updateSpaceSettingsCodegen(entitiesId.challengeId, {
      membership: {
        policy: CommunityMembershipPolicy.Applications,
      },
    });

    applicationData = await createApplicationCodegen(
      entitiesId.challengeCommunityId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );

    const createAppData = applicationData.data?.applyForCommunityMembership;
    challengeApplicationId = createAppData?.id;
    const getApp = await getChallengeApplicationsCodegen(
      entitiesId.spaceId,
      entitiesId.challengeId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    const getAppData = getApp?.data?.space?.subspace?.community;

    // Assert
    expect(applicationData.status).toBe(200);
    expect(createAppData.lifecycle.state).toEqual('new');
    expect(createAppData.lifecycle).toEqual(
      getAppData?.applications?.[0].lifecycle
    );
  });

  test('should return correct membershipUser applications', async () => {
    // Act
    // Create challenge application
    applicationData = await createApplicationCodegen(
      entitiesId.challengeCommunityId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    const createAppData = applicationData?.data?.applyForCommunityMembership;
    challengeApplicationId = createAppData?.id;

    const userAppsData = await meQueryCodegen(TestUser.GLOBAL_COMMUNITY_ADMIN);

    const membershipData = userAppsData?.data?.me?.applications;
    const challengeAppOb = [
      {
        id: challengeApplicationId,
        state: 'new',
        displayName: challengeName,
        communityID: entitiesId.challengeCommunityId,
        spaceID: entitiesId.spaceId,
        subspaceID: entitiesId.challengeId,
      },
    ];

    const filteredMembershipData =
      membershipData?.filter(app => app.state !== 'archived') ?? [];
    // Assert
    expect(filteredMembershipData).toEqual(challengeAppOb);
  });

  test('should return updated membershipUser applications', async () => {
    // Act
    // Create challenge application
    applicationData = await createApplicationCodegen(
      entitiesId.challengeCommunityId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    const createAppData = applicationData?.data?.applyForCommunityMembership;
    challengeApplicationId = createAppData?.id;

    // Remove challenge application
    await deleteApplicationCodegen(challengeApplicationId);

    // Update space application state
    await eventOnApplicationCodegen(applicationId, 'REJECT');

    const userAppsDataAfter = await meQueryCodegen(
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    const membershipDataAfter = userAppsDataAfter?.data?.me?.applications;

    const challengeAppOb = {
      id: challengeApplicationId,
      state: 'new',
      displayName: challengeName,
      communityID: entitiesId.challengeCommunityId,
      spaceID: entitiesId.spaceId,
      subspaceID: entitiesId.challengeId,
    };

    // Assert
    expect(membershipDataAfter).not.toContainObject(challengeAppOb);
  });

  test('should approve challenge application, when space application is APPROVED', async () => {
    // Arrange
    // Create challenge application
    applicationData = await createApplicationCodegen(
      entitiesId.challengeCommunityId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    const createAppData = applicationData?.data?.applyForCommunityMembership;
    challengeApplicationId = createAppData?.id;

    // Reject and Archive Space application
    await eventOnApplicationCodegen(applicationId, 'APPROVE');
    // Act
    // Approve challenge application
    const event = await eventOnApplicationCodegen(
      challengeApplicationId,
      'APPROVE'
    );
    const state = event?.data?.eventOnApplication?.lifecycle;

    userMembeship = await getCommunityInvitationsApplicationsCodegen(
      entitiesId.challengeCommunityId
    );
    isMember = userMembeship.data.lookup.community.applications[0].id;

    // Assert
    expect(event.status).toBe(200);
    expect(state?.state).toContain('approved');
    expect(isMember).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: users.globalCommunityAdminId,
        }),
      ])
    );
  });

  test('should be able to remove challenge application, when space application is removed', async () => {
    // Arrange
    // Create challenge application
    applicationData = await createApplicationCodegen(
      entitiesId.challengeCommunityId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    const createAppData = applicationData?.data?.applyForCommunityMembership;
    challengeApplicationId = createAppData?.id;

    // Remove Space application
    await deleteApplicationCodegen(applicationId);
    // Act
    // Remove challenge application
    await deleteApplicationCodegen(challengeApplicationId);
    userMembeship = await getCommunityInvitationsApplicationsCodegen(
      entitiesId.challengeCommunityId
    );
    isMember = userMembeship?.data?.lookup.community.applications;

    // Assert
    expect(isMember).toHaveLength(0);
    expect(isMember).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: users.globalCommunityAdminId,
        }),
      ])
    );
  });
});
