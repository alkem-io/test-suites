import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import {
  deleteSpace,
  updateSpaceSettings,
} from '@test/functional-api/journey/space/space.request.params';
import {
  createApplication,
  deleteApplication,
} from '@test/functional-api/roleset/application/application.request.params';
import { delay } from '@test/utils/delay';
import { users } from '@test/utils/queries/users-data';
import {
  createChallengeWithUsers,
  createOrgAndSpaceWithUsers,
} from '@test/utils/data-setup/entities';
import { UserPreferenceType } from '@alkemio/client-lib';

import { assignRoleToUser } from '@test/functional-api/roleset/roles-request.params';
import {
  CommunityMembershipPolicy,
  CommunityRoleType,
} from '@test/generated/alkemio-schema';
import { entitiesId, getMailsData } from '@test/types/entities-helper';
import { deleteOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';
import { changePreferenceUser } from '@test/utils/mutations/preferences-mutation';

const organizationName = 'not-app-org-name' + uniqueId;
const hostNameId = 'not-app-org-nameid' + uniqueId;
const spaceName = 'not-app-eco-name' + uniqueId;
const spaceNameId = 'not-app-eco-nameid' + uniqueId;

const ecoName = spaceName;
const challengeName = `chName${uniqueId}`;
let preferencesConfig: any[] = [];

beforeAll(async () => {
  await deleteMailSlurperMails();

  await createOrgAndSpaceWithUsers(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeWithUsers(challengeName);
  await updateSpaceSettings(entitiesId.spaceId, {
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
  await deleteSpace(entitiesId.challenge.id);
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});

describe('Notifications - applications', () => {
  beforeAll(async () => {
    await changePreferenceUser(
      users.notificationsAdmin.id,
      UserPreferenceType.NotificationApplicationSubmitted,
      'false'
    );
    await changePreferenceUser(
      users.notificationsAdmin.id,
      UserPreferenceType.NotificationApplicationReceived,
      'false'
    );
    await changePreferenceUser(
      users.globalCommunityAdmin.id,
      UserPreferenceType.NotificationApplicationSubmitted,
      'false'
    );
    await changePreferenceUser(
      users.globalCommunityAdmin.id,
      UserPreferenceType.NotificationApplicationReceived,
      'false'
    );
    for (const config of preferencesConfig)
      await changePreferenceUser(config.userID, config.type, 'true');
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('receive notification for non space user application to space- GA, EA and Applicant', async () => {
    // Act
    const applicatioData = await createApplication(entitiesId.space.roleSetId);

    entitiesId.space.applicationId =
      applicatioData?.data?.applyForEntryRoleOnRoleSet?.id ?? '';

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
    await assignRoleToUser(
      users.nonSpaceMember.email,
      entitiesId.space.roleSetId,
      CommunityRoleType.Member
    );

    await updateSpaceSettings(entitiesId.challenge.id, {
      membership: {
        policy: CommunityMembershipPolicy.Applications,
      },
    });

    // Act
    await createApplication(entitiesId.challenge.roleSetId);

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
        await changePreferenceUser(config.userID, config.type, 'false')
    );

    await deleteApplication(entitiesId.space.applicationId);

    // Act
    await createApplication(entitiesId.challenge.roleSetId);

    await delay(1500);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });
});
