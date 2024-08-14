import '@test/utils/array.matcher';
import {
  createApplicationCodegen,
  deleteApplicationCodegen,
  getCommunityInvitationsApplicationsCodegen,
  meQueryCodegen,
} from './application.request.params';
import {
  deleteSpaceCodegen,
  updateSpaceSettingsCodegen,
} from '../../journey/space/space.request.params';
import { deleteOrganizationCodegen } from '../../organization/organization.request.params';
import { eventOnApplicationCodegen } from '@test/functional-api/lifecycle/innovation-flow.request.params';
import { registerInAlkemioOrFail, TestUser } from '@test/utils';
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
import { deleteUserCodegen } from '../user.request.params';
export const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

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
  await deleteSpaceCodegen(entitiesId.challenge.id);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organization.id);
});

describe('Application', () => {
  afterEach(async () => {
    await removeCommunityRoleFromUserCodegen(
      users.nonSpaceMember.id,
      entitiesId.space.communityId,
      CommunityRole.Member
    );

    await deleteApplicationCodegen(applicationId);
  });
  test('should create application', async () => {
    // Act
    applicationData = await createApplicationCodegen(
      entitiesId.space.communityId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    applicationId = applicationData?.data?.applyForCommunityMembership?.id;
    const userAppsData = await meQueryCodegen(TestUser.GLOBAL_COMMUNITY_ADMIN);

    const getApp = userAppsData?.data?.me?.communityApplications;

    // Assert
    expect(applicationData.status).toBe(200);
    expect(
      applicationData?.data?.applyForCommunityMembership?.lifecycle?.state
    ).toEqual('new');
    expect(getApp).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          application: {
            id: applicationId,
            lifecycle: {
              state: 'new',
            },
          },
          space: { id: entitiesId.spaceId },
        }),
      ])
    );
    expect(getApp).toHaveLength(1);
  });

  test('should create space application, when previous was REJECTED and ARCHIVED', async () => {
    // Arrange
    applicationData = await createApplicationCodegen(
      entitiesId.space.communityId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    applicationId = applicationData?.data?.applyForCommunityMembership?.id;

    // Reject and Archive Space application
    await eventOnApplicationCodegen(applicationId, 'REJECT');
    await eventOnApplicationCodegen(applicationId, 'ARCHIVE');

    // Act
    // Creates application second time
    applicationData = await createApplicationCodegen(
      entitiesId.space.communityId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    applicationId = applicationData?.data?.applyForCommunityMembership?.id;

    const userAppsData = await meQueryCodegen(TestUser.GLOBAL_COMMUNITY_ADMIN);
    const getApp = userAppsData?.data?.me?.communityApplications;

    // Assert
    expect(applicationData.status).toBe(200);
    expect(
      applicationData?.data?.applyForCommunityMembership?.lifecycle?.state
    ).toEqual('new');
    expect(getApp).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          application: {
            id: applicationId,
            lifecycle: {
              state: 'new',
            },
          },
          space: { id: entitiesId.spaceId },
        }),
      ])
    );
    const getAppFiltered =
      getApp?.filter(app => app.application.lifecycle.state !== 'archived') ??
      [];
    expect(getAppFiltered).toHaveLength(1);
  });

  test('should throw error for creating the same application twice', async () => {
    // Act
    const applicationDataOne = await createApplicationCodegen(
      entitiesId.space.communityId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    applicationId =
      applicationDataOne?.data?.applyForCommunityMembership?.id ?? '';
    const applicationDataTwo = await createApplicationCodegen(
      entitiesId.space.communityId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );

    // Assert
    expect(applicationDataTwo.error?.errors[0].message).toContain(
      `An open application (ID: ${applicationId}) already exists for contributor ${users.globalCommunityAdmin.id} on Community: ${entitiesId.space.communityId}.`
    );
  });

  test('should remove application', async () => {
    // Arrange
    const applicationsBeforeCreateDelete = await getCommunityInvitationsApplicationsCodegen(
      entitiesId.space.communityId
    );
    const countAppBeforeCreateDelete =
      applicationsBeforeCreateDelete?.data?.lookup?.community?.applications
        .length;

    applicationData = await createApplicationCodegen(
      entitiesId.space.communityId,
      TestUser.QA_USER
    );
    applicationId = applicationData?.data?.applyForCommunityMembership?.id;

    // Act
    await deleteApplicationCodegen(applicationId);
    const userAppsData = await meQueryCodegen(TestUser.QA_USER);
    const getApp = userAppsData?.data?.me?.communityApplications;
    const applicationsAfterCreateDelete = await getCommunityInvitationsApplicationsCodegen(
      entitiesId.space.communityId
    );
    const countAppAfterCreateDelete =
      applicationsAfterCreateDelete?.data?.lookup?.community?.applications
        .length;

    // Assert
    //expect(applicationData.status).toBe(200);
    expect(countAppAfterCreateDelete).toEqual(countAppBeforeCreateDelete);
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
      entitiesId.challenge.communityId
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

  test('should return applications after user is removed', async () => {
    // Arrange
    const applicationsBeforeCreateDelete = await getCommunityInvitationsApplicationsCodegen(
      entitiesId.space.communityId
    );
    const countAppBeforeCreateDelete =
      applicationsBeforeCreateDelete?.data?.lookup?.community?.applications
        .length;

    applicationData = await createApplicationCodegen(
      entitiesId.space.communityId,
      TestUser.QA_USER
    );

    applicationId = applicationData?.data?.applyForCommunityMembership?.id;

    // Act
    await deleteUserCodegen(users.qaUser.id);

    const applicationsAfterCreateDelete = await getCommunityInvitationsApplicationsCodegen(
      entitiesId.space.communityId
    );
    const countAppAfterCreateDelete =
      applicationsAfterCreateDelete?.data?.lookup?.community?.applications
        .length;

    // Assert
    expect(countAppAfterCreateDelete).toEqual(countAppBeforeCreateDelete);
    await registerInAlkemioOrFail('qa', 'user', 'qa.user@alkem.io');
  });
});

describe('Application-flows', () => {
  beforeAll(async () => {
    await assignCommunityRoleToUserCodegen(
      users.globalCommunityAdmin.id,
      entitiesId.space.communityId,
      CommunityRole.Member
    );
  });

  afterEach(async () => {
    await removeCommunityRoleFromUserCodegen(
      users.globalCommunityAdmin.id,
      entitiesId.challenge.communityId,
      CommunityRole.Member
    );
    await deleteApplicationCodegen(challengeApplicationId);
    await deleteApplicationCodegen(applicationId);
  });

  test('should create application on challenge', async () => {
    // Act
    await updateSpaceSettingsCodegen(entitiesId.challenge.id, {
      membership: {
        policy: CommunityMembershipPolicy.Applications,
      },
    });

    applicationData = await createApplicationCodegen(
      entitiesId.challenge.communityId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );

    const createAppData = applicationData.data?.applyForCommunityMembership;
    challengeApplicationId = createAppData?.id;

    // Assert
    expect(applicationData.status).toBe(200);
    expect(createAppData.lifecycle.state).toEqual('new');
  });

  test('should return correct membershipUser applications', async () => {
    // Act
    // Create challenge application
    applicationData = await createApplicationCodegen(
      entitiesId.challenge.communityId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    const createAppData = applicationData?.data?.applyForCommunityMembership;
    challengeApplicationId = createAppData?.id;

    const userAppsData = await meQueryCodegen(TestUser.GLOBAL_COMMUNITY_ADMIN);

    const membershipData = userAppsData?.data?.me?.communityApplications;
    const challengeAppOb = [
      {
        application: {
          id: challengeApplicationId,
          lifecycle: {
            state: 'new',
          },
        },
        space: { id: entitiesId.challenge.id },
      },
    ];

    const filteredMembershipData =
      membershipData?.filter(app => app.application.lifecycle.state == 'new') ??
      [];
    // Assert
    expect(filteredMembershipData).toEqual(challengeAppOb);
  });

  test('should return updated membershipUser applications', async () => {
    // Act
    // Create challenge application
    applicationData = await createApplicationCodegen(
      entitiesId.challenge.communityId,
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
    const membershipDataAfter =
      userAppsDataAfter?.data?.me?.communityApplications;

    const challengeAppOb = [
      {
        application: {
          id: challengeApplicationId,
          lifecycle: {
            state: 'new',
          },
        },
        space: { id: entitiesId.challenge.id },
      },
    ];

    // Assert
    expect(membershipDataAfter).not.toContainObject(challengeAppOb);
  });

  test('should approve challenge application, when space application is APPROVED', async () => {
    // Arrange
    // Create challenge application
    applicationData = await createApplicationCodegen(
      entitiesId.challenge.communityId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    const createAppData = applicationData?.data?.applyForCommunityMembership;
    challengeApplicationId = createAppData?.id;

    // Act
    // Approve challenge application
    const event = await eventOnApplicationCodegen(
      challengeApplicationId,
      'APPROVE'
    );

    const state = event?.data?.eventOnApplication?.lifecycle;

    userMembeship = await getCommunityInvitationsApplicationsCodegen(
      entitiesId.challenge.communityId
    );
    isMember = userMembeship.data.lookup.community.applications[0].id;

    // Assert
    expect(event.status).toBe(200);
    expect(state?.state).toContain('approved');
    expect(isMember).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: users.globalCommunityAdmin.id,
        }),
      ])
    );
  });

  test('should be able to remove challenge application, when space application is removed', async () => {
    // Arrange
    // Create challenge application
    applicationData = await createApplicationCodegen(
      entitiesId.challenge.communityId,
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
      entitiesId.challenge.communityId
    );
    isMember = userMembeship?.data?.lookup.community.applications;

    // Assert
    expect(isMember).toHaveLength(0);
    expect(isMember).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: users.globalCommunityAdmin.id,
        }),
      ])
    );
  });
});
