import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import {
  deleteSpaceCodegen,
  updateSpaceSettingsCodegen,
} from '@test/functional-api/journey/space/space.request.params';
import {
  createApplicationCodegen,
  deleteApplicationCodegen,
} from '@test/functional-api/user-management/application/application.request.params';
import { delay } from '@test/utils/delay';
import { users } from '@test/utils/queries/users-data';
import {
  createChallengeWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { UserPreferenceType } from '@alkemio/client-lib';
import { changePreferenceUserCodegen } from '@test/utils/mutations/preferences-mutation';
import {
  entitiesId,
  getMailsData,
} from '@test/functional-api/roles/community/communications-helper';
import { assignCommunityRoleToUserCodegen } from '@test/functional-api/roles/roles-request.params';
import {
  CommunityMembershipPolicy,
  CommunityRole,
} from '@test/generated/alkemio-schema';

const organizationName = 'not-app-org-name' + uniqueId;
const hostNameId = 'not-app-org-nameid' + uniqueId;
const spaceName = 'not-app-eco-name' + uniqueId;
const spaceNameId = 'not-app-eco-nameid' + uniqueId;

const ecoName = spaceName;
const challengeName = `chName${uniqueId}`;
let preferencesConfig: any[] = [];

beforeAll(async () => {
  await deleteMailSlurperMails();

  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeWithUsersCodegen(challengeName);
  await updateSpaceSettingsCodegen(entitiesId.spaceId, {
    membership: { policy: CommunityMembershipPolicy.Applications },
  });

  preferencesConfig = [
    {
      userID: users.globalAdmin.id,
      type: UserPreferenceType.NotificationApplicationReceived,
    },
    {
      userID: users.nonSpaceMember.id,
      type: UserPreferenceType.NotificationApplicationSubmitted,
    },
    {
      userID: users.spaceAdmin.id,
      type: UserPreferenceType.NotificationApplicationSubmitted,
    },
    {
      userID: users.spaceAdmin.id,
      type: UserPreferenceType.NotificationApplicationReceived,
    },
    {
      userID: users.spaceMember.id,
      type: UserPreferenceType.NotificationApplicationSubmitted,
    },
    {
      userID: users.spaceMember.id,
      type: UserPreferenceType.NotificationApplicationReceived,
    },
    {
      userID: users.challengeAdmin.id,
      type: UserPreferenceType.NotificationApplicationSubmitted,
    },
    {
      userID: users.challengeAdmin.id,
      type: UserPreferenceType.NotificationApplicationReceived,
    },
  ];
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.challenge.id);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organization.id);
});

describe('Notifications - applications', () => {
  beforeAll(async () => {
    await changePreferenceUserCodegen(
      users.notificationsAdmin.id,
      UserPreferenceType.NotificationApplicationSubmitted,
      'false'
    );
    await changePreferenceUserCodegen(
      users.notificationsAdmin.id,
      UserPreferenceType.NotificationApplicationReceived,
      'false'
    );
    await changePreferenceUserCodegen(
      users.globalCommunityAdmin.id,
      UserPreferenceType.NotificationApplicationSubmitted,
      'false'
    );
    await changePreferenceUserCodegen(
      users.globalCommunityAdmin.id,
      UserPreferenceType.NotificationApplicationReceived,
      'false'
    );
    for (const config of preferencesConfig)
      await changePreferenceUserCodegen(config.userID, config.type, 'true');
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('receive notification for non space user application to space- GA, EA and Applicant', async () => {
    // Act
    const applicatioData = await createApplicationCodegen(
      entitiesId.space.communityId
    );

    entitiesId.space.applicationId =
      applicatioData?.data?.applyForCommunityMembership?.id ?? '';

    await delay(6000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(3);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `${ecoName}: Application from non`,
          toAddresses: [users.globalAdmin.email],
        }),
        expect.objectContaining({
          subject: `${ecoName}: Application from non`,
          toAddresses: [users.spaceAdmin.email],
        }),
        expect.objectContaining({
          subject: `${ecoName} - Your Application to join was received!`,
          toAddresses: [users.nonSpaceMember.email],
        }),
      ])
    );
  });

  test('receive notification for non space user application to challenge- GA, EA, CA and Applicant', async () => {
    // Arrange
    await assignCommunityRoleToUserCodegen(
      users.nonSpaceMember.email,
      entitiesId.space.communityId,
      CommunityRole.Member
    );

    await updateSpaceSettingsCodegen(entitiesId.challenge.id, {
      membership: {
        policy: CommunityMembershipPolicy.Applications,
      },
    });

    // Act
    await createApplicationCodegen(entitiesId.challenge.communityId);

    await delay(6000);
    const getEmailsData = await getMailsData();

    // Assert

    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `${challengeName}: Application from non`,
          toAddresses: [users.globalAdmin.email],
        }),
        expect.objectContaining({
          subject: `${challengeName}: Application from non`,
          toAddresses: [users.challengeAdmin.email],
        }),
        expect.objectContaining({
          subject: `${challengeName} - Your Application to join was received!`,
          toAddresses: [users.nonSpaceMember.email],
        }),
      ])
    );
    expect(getEmailsData[1]).toEqual(3);
  });

  test('no notification for non space user application to space- GA, EA and Applicant', async () => {
    // Arrange
    preferencesConfig.forEach(
      async config =>
        await changePreferenceUserCodegen(config.userID, config.type, 'false')
    );

    await deleteApplicationCodegen(entitiesId.space.applicationId);

    // Act
    await createApplicationCodegen(entitiesId.challenge.communityId);

    await delay(1500);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });
});
