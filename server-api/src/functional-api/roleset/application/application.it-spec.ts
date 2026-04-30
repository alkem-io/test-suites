/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  createApplication,
  deleteApplication,
  getRoleSetInvitationsApplications,
  meQuery,
} from './application.request.params';
import { updateSpaceSettings } from '../../journey/space/space.request.params';
import {
  deleteUser,
  reregisterUser,
} from '../../contributor-management/user/user.request.params';
import {
  assignRoleToUser,
  removeRoleFromUser,
} from '@functional-api/roleset/roles-request.params';
import { eventOnRoleSetApplication } from '../roleset-events.request.params';
import {
  delay,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  SpacePrivacyMode,
  CommunityMembershipPolicy,
} from '@alkemio/client-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';

let applicationId = '';
let subspaceApplicationId = '';
let applicationData: any;
let roleSetPendingMemberships: any;
const isMember = '';

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'application',
  space: {
    collaboration: {
      addTutorialCallouts: false,
    },
    settings: {
      privacy: {
        mode: SpacePrivacyMode.Public,
      },
      membership: {
        policy: CommunityMembershipPolicy.Applications,
      },
    },
    subspace: {},
  },
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

/** @testCase TC-0400 */
describe('Application', () => {
  afterEach(async () => {
    await removeRoleFromUser(
      TestUserManager.users.qaUser.id,
      baseScenario.space.community.roleSetId,
      RoleName.Member
    );

    if (applicationId && applicationId.length === 36) {
      await deleteApplication(applicationId);
      applicationId = '';
    }
  });

  test('should create application', async () => {
    // Act
    applicationData = await createApplication(
      baseScenario.space.community.roleSetId,
      TestUser.QA_USER
    );
    applicationId = applicationData?.data?.applyForEntryRoleOnRoleSet?.id;
    const userAppsData = await meQuery(TestUser.QA_USER);

    const getApp = userAppsData?.data?.me?.communityApplications;

    // Assert
    expect(applicationData.status).toBe(200);
    expect(applicationData?.data?.applyForEntryRoleOnRoleSet?.state).toEqual(
      'new'
    );
    expect(getApp).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          application: expect.objectContaining({
            id: applicationId,
            state: 'new',
          }),
          spacePendingMembershipInfo: { id: baseScenario.space.id },
        }),
      ])
    );
    expect(getApp).toHaveLength(1);
  });

  test('should create space application, when previous was REJECTED and ARCHIVED', async () => {
    // Arrange
    applicationData = await createApplication(
      baseScenario.space.community.roleSetId,
      TestUser.QA_USER
    );
    applicationId = applicationData?.data?.applyForEntryRoleOnRoleSet?.id;

    // Reject and Archive Space application
    await eventOnRoleSetApplication(applicationId, 'REJECT');
    await eventOnRoleSetApplication(applicationId, 'ARCHIVE');

    // Act
    // Creates application second time
    applicationData = await createApplication(
      baseScenario.space.community.roleSetId,
      TestUser.QA_USER
    );
    const applicationId2 =
      applicationData?.data?.applyForEntryRoleOnRoleSet?.id;

    const userAppsData = await meQuery(TestUser.QA_USER);
    const getApp = userAppsData?.data?.me?.communityApplications;

    // Assert
    expect(applicationData.status).toBe(200);
    expect(applicationData?.data?.applyForEntryRoleOnRoleSet?.state).toEqual(
      'new'
    );
    expect(getApp).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          application: expect.objectContaining({
            id: applicationId2,
            state: 'new',
          }),
          spacePendingMembershipInfo: { id: baseScenario.space.id },
        }),
      ])
    );
    const getAppFiltered =
      getApp?.filter(app => app.application.state !== 'archived') ?? [];
    expect(getAppFiltered).toHaveLength(1);
    await deleteApplication(applicationId2);
  });

  test('should throw error for creating the same application twice', async () => {
    // Act
    const applicationDataOne = await createApplication(
      baseScenario.space.community.roleSetId,
      TestUser.QA_USER
    );
    applicationId =
      applicationDataOne?.data?.applyForEntryRoleOnRoleSet?.id ?? '';

    const applicationDataTwo = await createApplication(
      baseScenario.space.community.roleSetId,
      TestUser.QA_USER
    );

    // Assert
    expect(applicationDataTwo.error?.errors[0].message).toContain(
      'Application not possible: An open application already exists for actor'
    );
  });

  test('should remove application', async () => {
    // Arrange
    const applicationsBeforeCreateDelete =
      await getRoleSetInvitationsApplications(
        baseScenario.space.community.roleSetId,
        TestUser.QA_USER
      );
    const countAppBeforeCreateDelete =
      applicationsBeforeCreateDelete?.data?.lookup?.roleSet?.applications
        .length;
    applicationData = await createApplication(
      baseScenario.space.community.roleSetId,
      TestUser.QA_USER
    );
    applicationId = applicationData?.data?.applyForEntryRoleOnRoleSet?.id;

    // Act
    await deleteApplication(applicationId);
    await delay(300);
    const userAppsData = await meQuery(TestUser.QA_USER);
    const getApp = userAppsData?.data?.me?.communityApplications;
    const applicationsAfterCreateDelete =
      await getRoleSetInvitationsApplications(
        baseScenario.space.community.roleSetId,
        TestUser.QA_USER
      );
    const countAppAfterCreateDelete =
      applicationsAfterCreateDelete?.data?.lookup?.roleSet?.applications.length;

    // Assert
    expect(countAppAfterCreateDelete).toEqual(countAppBeforeCreateDelete);
    expect(getApp).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: applicationId,
        }),
      ])
    );
    expect(getApp).toHaveLength(0);
    // Unset the application Id so that afterEach does not try to delete it again
    applicationId = '';
  });

  // Bug - user subspace application can be approved, when he/she is not member of the parent community
  // https://app.zenspace.com/workspaces/alkemio-5ecb98b262ebd9f4aec4194c/issues/alkem-io/client-web/1148
  test.skip('should throw error for APPROVING subspace application, when user is not space member', async () => {
    // Arrange
    // Create subspace application
    applicationData = await createApplication(
      baseScenario.subspace.community.roleSetId
    );
    const createAppData = applicationData?.data?.applyForEntryRoleOnRoleSet;
    subspaceApplicationId = createAppData?.id;

    // Act
    // Approve subspace application
    const event = await eventOnRoleSetApplication(
      subspaceApplicationId,
      'APPROVE'
    );

    // Assert
    expect(event.status).toBe(200);
    expect(event.error?.errors[0].message).toContain('Error');
  });

  test('User should not be able to approve own application', async () => {
    // Act
    applicationData = await createApplication(
      baseScenario.space.community.roleSetId,
      TestUser.QA_USER
    );
    const createAppData = applicationData?.data?.applyForEntryRoleOnRoleSet;
    const applicationSpaceId = createAppData?.id;

    await eventOnRoleSetApplication(
      applicationSpaceId,
      'APPROVE',
      TestUser.QA_USER
    );
    const userAppsData = await meQuery(TestUser.QA_USER);

    const applicationState =
      userAppsData?.data?.me?.communityApplications[0].application.state;

    // Assert
    expect(applicationState).toEqual('new');

    await deleteApplication(applicationSpaceId);
  });

  // Skip until implemented a solution to stabalize test suites triggered after user deletion
  test('should return applications after user is removed', async () => {
    // Arrange
    const applicationsBeforeCreateDelete =
      await getRoleSetInvitationsApplications(
        baseScenario.space.community.roleSetId
      );
    const countAppBeforeCreateDelete =
      applicationsBeforeCreateDelete?.data?.lookup?.roleSet?.applications
        .length;

    applicationData = await createApplication(
      baseScenario.space.community.roleSetId,
      TestUser.QA_USER
    );

    applicationId = applicationData?.data?.applyForEntryRoleOnRoleSet?.id;

    // Act
    await deleteUser(TestUserManager.users.qaUser.id);

    const applicationsAfterCreateDelete =
      await getRoleSetInvitationsApplications(
        baseScenario.space.community.roleSetId
      );
    const countAppAfterCreateDelete =
      applicationsAfterCreateDelete?.data?.lookup?.roleSet?.applications.length;

    // Assert
    expect(countAppAfterCreateDelete).toEqual(countAppBeforeCreateDelete);

    // Fully re-register the user so subsequent tests work
    await reregisterUser('qa.user@alkem.io', 'qa', 'user');
  });
});

describe('Application-flows', () => {
  // For the tests of this suite is used non-space member user. The reason is that, in the previous suite, the qa.user is deleted and recreated, which causes the user to not be possible to be assigned as initiallization is done in the beginning of the file.
  beforeAll(async () => {
    await assignRoleToUser(
      TestUserManager.users.nonSpaceMember.id,
      baseScenario.space.community.roleSetId,
      RoleName.Member
    );
  });

  afterEach(async () => {
    await removeRoleFromUser(
      TestUserManager.users.qaUser.id,
      baseScenario.subspace.community.roleSetId,
      RoleName.Member
    );
    if (subspaceApplicationId.length === 36) {
      await deleteApplication(subspaceApplicationId);
    }
    if (applicationId.length === 36) {
      await deleteApplication(applicationId);
    }
  });

  test('should create application on subspace', async () => {
    // Act
    await updateSpaceSettings(baseScenario.subspace.id, {
      membership: {
        policy: CommunityMembershipPolicy.Applications,
      },
    });

    applicationData = await createApplication(
      baseScenario.subspace.community.roleSetId,
      TestUser.NON_SPACE_MEMBER
    );
    const createAppData = applicationData.data?.applyForEntryRoleOnRoleSet;
    subspaceApplicationId = createAppData?.id;

    // Assert
    expect(applicationData.status).toBe(200);
    expect(createAppData.state).toEqual('new');
  });

  test('should return correct membershipUser applications', async () => {
    // Act
    // Create subspace application
    applicationData = await createApplication(
      baseScenario.subspace.community.roleSetId,
      TestUser.NON_SPACE_MEMBER
    );
    const createAppData = applicationData?.data?.applyForEntryRoleOnRoleSet;
    subspaceApplicationId = createAppData?.id;

    const userAppsData = await meQuery(TestUser.NON_SPACE_MEMBER);

    const roleData = userAppsData?.data?.me?.communityApplications;
    const subspaceAppOb = [
      expect.objectContaining({
        application: expect.objectContaining({
          id: subspaceApplicationId,
          state: 'new',
          isFinalized: false,
          nextEvents: ['APPROVE', 'REJECT'],
        }),
        spacePendingMembershipInfo: expect.objectContaining({
          id: baseScenario.subspace.id,
        }),
      }),
    ];

    const filteredroleData =
      roleData?.filter(app => app.application.state == 'new') ?? [];

    // Assert
    expect(filteredroleData).toEqual(expect.arrayContaining(subspaceAppOb));
  });

  test('should return updated membershipUser applications', async () => {
    // Act
    // Create subspace application
    applicationData = await createApplication(
      baseScenario.subspace.community.roleSetId,
      TestUser.NON_SPACE_MEMBER
    );
    const createAppData = applicationData?.data?.applyForEntryRoleOnRoleSet;
    subspaceApplicationId = createAppData?.id;

    // Remove subspace application
    await deleteApplication(subspaceApplicationId);

    // Update space application state
    await eventOnRoleSetApplication(applicationId, 'REJECT');

    const userAppsDataAfter = await meQuery(TestUser.NON_SPACE_MEMBER);
    const roleDataAfter = userAppsDataAfter?.data?.me?.communityApplications;

    const subspaceAppOb = [
      {
        application: {
          id: subspaceApplicationId,
          state: 'new',
        },
        spacePendingMembershipInfo: { id: baseScenario.subspace.id },
      },
    ];

    // Assert
    expect(roleDataAfter).not.toContain(subspaceAppOb);

    // Unset the subspaceApplicationId so that afterEach does not try to delete it again
    subspaceApplicationId = '';
  });

  test('should approve subspace application, when space application is APPROVED and applications are allowed', async () => {
    // Arrange
    // Create + approve space application
    const spaceApplicationData = await createApplication(
      baseScenario.space.community.roleSetId,
      TestUser.NON_SPACE_MEMBER
    );

    if (spaceApplicationData?.data?.applyForEntryRoleOnRoleSet) {
      applicationId =
        spaceApplicationData?.data?.applyForEntryRoleOnRoleSet?.id;
      await eventOnRoleSetApplication(applicationId, 'APPROVE');
    }

    await updateSpaceSettings(baseScenario.subspace.id, {
      privacy: {
        mode: SpacePrivacyMode.Public,
      },
      membership: {
        policy: CommunityMembershipPolicy.Applications,
      },
    });

    // Create subspace application
    const subspaceApplicationData = await createApplication(
      baseScenario.subspace.community.roleSetId,
      TestUser.NON_SPACE_MEMBER
    );

    subspaceApplicationId = 'NotRetrieved';
    if (subspaceApplicationData?.data?.applyForEntryRoleOnRoleSet) {
      subspaceApplicationId =
        subspaceApplicationData?.data?.applyForEntryRoleOnRoleSet?.id;
    }
    expect(subspaceApplicationId.length).toEqual(36);
    if (subspaceApplicationId.length !== 36) {
      throw new Error('Subspace application failed to create');
    }

    // Act
    // Approve subspace application
    const subspaceApplicationEventResponse = await eventOnRoleSetApplication(
      subspaceApplicationId,
      'APPROVE'
    );

    const subspaceApplication =
      subspaceApplicationEventResponse?.data?.eventOnApplication;

    // Assert
    expect(subspaceApplicationEventResponse.status).toBe(200);
    expect(subspaceApplication?.state).toContain('approved');
    expect(isMember).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: TestUserManager.users.nonSpaceMember.id,
        }),
      ])
    );
  });

  test('should be able to remove subspace application, when space application is removed', async () => {
    // Create subspace application
    applicationData = await createApplication(
      baseScenario.subspace.community.roleSetId,
      TestUser.NON_SPACE_MEMBER
    );
    const createAppData = applicationData?.data?.applyForEntryRoleOnRoleSet;
    subspaceApplicationId = createAppData?.id;

    // Remove Space application
    if (applicationId && applicationId.length === 36) {
      await deleteApplication(applicationId);
    }
    // Act
    // Remove subspace application
    await deleteApplication(subspaceApplicationId);
    roleSetPendingMemberships = await getRoleSetInvitationsApplications(
      baseScenario.subspace.community.roleSetId
    );
    const applications =
      roleSetPendingMemberships?.data?.lookup.roleSet.applications;

    // Assert
    expect(applications).toHaveLength(0);
    expect(isMember).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: TestUserManager.users.nonSpaceMember.id,
        }),
      ])
    );

    // Unset the subspaceApplicationId so that afterEach does not try to delete it again
    applicationId = '';
    subspaceApplicationId = '';
  });
});
