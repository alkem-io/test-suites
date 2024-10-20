import '@test/utils/array.matcher';
import {
  createApplication,
  deleteApplication,
  getRoleSetInvitationsApplications,
  meQuery,
} from './application.request.params';
import {
  deleteSpace,
  updateSpaceSettings,
} from '../../journey/space/space.request.params';
import { registerInAlkemioOrFail, TestUser } from '@test/utils';
import { users } from '@test/utils/queries/users-data';
import {
  createChallengeForOrgSpace,
  createOrgAndSpace,
} from '@test/utils/data-setup/entities';

import {
  CommunityMembershipPolicy,
  CommunityRoleType,
  SpacePrivacyMode,
} from '@test/generated/alkemio-schema';
import { deleteUser } from '../../contributor-management/user/user.request.params';
import {
  assignRoleToUser,
  removeRoleFromUser,
} from '@test/functional-api/roleset/roles-request.params';
import { entitiesId } from '../../../types/entities-helper';
import { deleteOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';
import { eventOnRoleSetApplication } from '../roleset-events.request.params';
export const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

let applicationId: string;
let challengeApplicationId = '';
let applicationData: any;
const challengeName = `testChallenge ${uniqueId}`;
let userMembeship: any;
const isMember = '';
const organizationName = 'appl-org-name' + uniqueId;
const hostNameId = 'appl-org-nameid' + uniqueId;
const spaceName = 'appl-eco-name' + uniqueId;
const spaceNameId = 'appl-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndSpace(organizationName, hostNameId, spaceName, spaceNameId);

  await createChallengeForOrgSpace(challengeName);
  await updateSpaceSettings(entitiesId.spaceId, {
    privacy: {
      mode: SpacePrivacyMode.Public,
    },
    membership: {
      policy: CommunityMembershipPolicy.Applications,
    },
  });
});

afterAll(async () => {
  await deleteSpace(entitiesId.challenge.id);
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});

describe('Application', () => {
  afterEach(async () => {
    await removeRoleFromUser(
      users.nonSpaceMember.id,
      entitiesId.space.roleSetId,
      CommunityRoleType.Member
    );

    await deleteApplication(applicationId);
  });
  test('should create application', async () => {
    // Act
    applicationData = await createApplication(
      entitiesId.space.roleSetId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    applicationId = applicationData?.data?.applyForEntryRoleOnRoleSet?.id;
    const userAppsData = await meQuery(TestUser.GLOBAL_COMMUNITY_ADMIN);

    const getApp = userAppsData?.data?.me?.communityApplications;

    // Assert
    expect(applicationData.status).toBe(200);
    expect(applicationData?.data?.applyForEntryRoleOnRoleSet?.state).toEqual(
      'new'
    );
    expect(getApp).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          application: {
            id: applicationId,
            state: 'new',
          },
          space: { id: entitiesId.spaceId },
        }),
      ])
    );
    expect(getApp).toHaveLength(1);
  });

  test('should create space application, when previous was REJECTED and ARCHIVED', async () => {
    // Arrange
    applicationData = await createApplication(
      entitiesId.space.roleSetId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    applicationId = applicationData?.data?.applyForEntryRoleOnRoleSet?.id;

    // Reject and Archive Space application
    await eventOnRoleSetApplication(applicationId, 'REJECT');
    await eventOnRoleSetApplication(applicationId, 'ARCHIVE');

    // Act
    // Creates application second time
    applicationData = await createApplication(
      entitiesId.space.roleSetId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    applicationId = applicationData?.data?.applyForEntryRoleOnRoleSet?.id;

    const userAppsData = await meQuery(TestUser.GLOBAL_COMMUNITY_ADMIN);
    const getApp = userAppsData?.data?.me?.communityApplications;

    // Assert
    expect(applicationData.status).toBe(200);
    expect(applicationData?.data?.applyForEntryRoleOnRoleSet?.state).toEqual(
      'new'
    );
    expect(getApp).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          application: {
            id: applicationId,
            state: 'new',
          },
          space: { id: entitiesId.spaceId },
        }),
      ])
    );
    const getAppFiltered =
      getApp?.filter(app => app.application.state !== 'archived') ?? [];
    expect(getAppFiltered).toHaveLength(1);
  });

  test('should throw error for creating the same application twice', async () => {
    // Act
    const applicationDataOne = await createApplication(
      entitiesId.space.roleSetId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    applicationId =
      applicationDataOne?.data?.applyForEntryRoleOnRoleSet?.id ?? 'undefined';
    const applicationDataTwo = await createApplication(
      entitiesId.space.roleSetId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );

    // Assert
    expect(applicationDataTwo.error?.errors[0].message).toContain(
      `Application not possible: An open application (ID: ${applicationId}) already exists for contributor ${users.globalCommunityAdmin.id} on RoleSet: ${entitiesId.space.roleSetId}.`
    );
  });

  test('should remove application', async () => {
    // Arrange
    const applicationsBeforeCreateDelete = await getRoleSetInvitationsApplications(
      entitiesId.space.roleSetId
    );
    const countAppBeforeCreateDelete =
      applicationsBeforeCreateDelete?.data?.lookup?.roleSet?.applications
        .length;

    applicationData = await createApplication(
      entitiesId.space.roleSetId,
      TestUser.QA_USER
    );
    applicationId = applicationData?.data?.applyForEntryRoleOnRoleSet?.id;

    // Act
    await deleteApplication(applicationId);
    const userAppsData = await meQuery(TestUser.QA_USER);
    const getApp = userAppsData?.data?.me?.communityApplications;
    const applicationsAfterCreateDelete = await getRoleSetInvitationsApplications(
      entitiesId.space.roleSetId
    );
    const countAppAfterCreateDelete =
      applicationsAfterCreateDelete?.data?.lookup?.roleSet?.applications.length;

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
    applicationData = await createApplication(entitiesId.challenge.roleSetId);
    const createAppData = applicationData?.data?.applyForEntryRoleOnRoleSet;
    challengeApplicationId = createAppData?.id;

    // Act
    // Approve challenge application
    const event = await eventOnRoleSetApplication(
      challengeApplicationId,
      'APPROVE'
    );

    // Assert
    expect(event.status).toBe(200);
    expect(event.error?.errors[0].message).toContain('Error');
  });

  test('should return applications after user is removed', async () => {
    // Arrange
    const applicationsBeforeCreateDelete = await getRoleSetInvitationsApplications(
      entitiesId.space.roleSetId
    );
    const countAppBeforeCreateDelete =
      applicationsBeforeCreateDelete?.data?.lookup?.roleSet?.applications
        .length;

    applicationData = await createApplication(
      entitiesId.space.roleSetId,
      TestUser.QA_USER
    );

    applicationId = applicationData?.data?.applyForEntryRoleOnRoleSet?.id;

    // Act
    await deleteUser(users.qaUser.id);

    const applicationsAfterCreateDelete = await getRoleSetInvitationsApplications(
      entitiesId.space.roleSetId
    );
    const countAppAfterCreateDelete =
      applicationsAfterCreateDelete?.data?.lookup?.roleSet?.applications.length;

    // Assert
    expect(countAppAfterCreateDelete).toEqual(countAppBeforeCreateDelete);
    await registerInAlkemioOrFail('qa', 'user', 'qa.user@alkem.io');
  });
});

describe('Application-flows', () => {
  beforeAll(async () => {
    await assignRoleToUser(
      users.globalCommunityAdmin.id,
      entitiesId.space.roleSetId,
      CommunityRoleType.Member
    );
  });

  afterEach(async () => {
    await removeRoleFromUser(
      users.globalCommunityAdmin.id,
      entitiesId.challenge.roleSetId,
      CommunityRoleType.Member
    );
    await deleteApplication(challengeApplicationId);
    await deleteApplication(applicationId);
  });

  test('should create application on challenge', async () => {
    // Act
    await updateSpaceSettings(entitiesId.challenge.id, {
      membership: {
        policy: CommunityMembershipPolicy.Applications,
      },
    });

    applicationData = await createApplication(
      entitiesId.challenge.roleSetId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );

    const createAppData = applicationData.data?.applyForEntryRoleOnRoleSet;
    challengeApplicationId = createAppData?.id;

    // Assert
    expect(applicationData.status).toBe(200);
    expect(createAppData.state).toEqual('new');
  });

  test('should return correct membershipUser applications', async () => {
    // Act
    // Create challenge application
    applicationData = await createApplication(
      entitiesId.challenge.roleSetId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    const createAppData = applicationData?.data?.applyForEntryRoleOnRoleSet;
    challengeApplicationId = createAppData?.id;

    const userAppsData = await meQuery(TestUser.GLOBAL_COMMUNITY_ADMIN);

    const membershipData = userAppsData?.data?.me?.communityApplications;
    const challengeAppOb = [
      {
        application: {
          id: challengeApplicationId,
          state: 'new',
          isFinalized: false,
          nextEvents: ['APPROVE', 'REJECT'],
        },
        spacePendingMembershipInfo: { id: entitiesId.challenge.id },
      },
    ];

    const filteredMembershipData =
      membershipData?.filter(app => app.application.state == 'new') ?? [];
    // Assert
    expect(filteredMembershipData).toEqual(challengeAppOb);
  });

  test('should return updated membershipUser applications', async () => {
    // Act
    // Create challenge application
    applicationData = await createApplication(
      entitiesId.challenge.roleSetId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    const createAppData = applicationData?.data?.applyForEntryRoleOnRoleSet;
    challengeApplicationId = createAppData?.id;

    // Remove challenge application
    await deleteApplication(challengeApplicationId);

    // Update space application state
    await eventOnRoleSetApplication(applicationId, 'REJECT');

    const userAppsDataAfter = await meQuery(TestUser.GLOBAL_COMMUNITY_ADMIN);
    const membershipDataAfter =
      userAppsDataAfter?.data?.me?.communityApplications;

    const challengeAppOb = [
      {
        application: {
          id: challengeApplicationId,
          state: 'new',
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
    applicationData = await createApplication(
      entitiesId.challenge.roleSetId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    const createAppData = applicationData?.data?.applyForEntryRoleOnRoleSet;
    challengeApplicationId = createAppData?.id;

    // Act
    // Approve challenge application
    const event = await eventOnRoleSetApplication(
      challengeApplicationId,
      'APPROVE'
    );

    const state = event?.data?.eventOnApplication;

    userMembeship = await getRoleSetInvitationsApplications(
      entitiesId.challenge.roleSetId
    );
    applicationId = userMembeship.data.lookup.roleSet.applications[0].id;

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
    applicationData = await createApplication(
      entitiesId.challenge.roleSetId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    const createAppData = applicationData?.data?.applyForEntryRoleOnRoleSet;
    challengeApplicationId = createAppData?.id;

    // Remove Space application
    await deleteApplication(applicationId);
    // Act
    // Remove challenge application
    await deleteApplication(challengeApplicationId);
    userMembeship = await getRoleSetInvitationsApplications(
      entitiesId.challenge.roleSetId
    );
    const applications = userMembeship?.data?.lookup.roleSet.applications;

    // Assert
    expect(applications).toHaveLength(0);
    expect(isMember).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: users.globalCommunityAdmin.id,
        }),
      ])
    );
  });
});
