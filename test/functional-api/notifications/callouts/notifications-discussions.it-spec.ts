import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { deleteSpaceCodegen } from '@test/functional-api/journey/space/space.request.params';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { delay } from '@test/utils/delay';
import { deleteUserCodegen } from '@test/functional-api/user-management/user.request.params';
import { users } from '@test/utils/queries/users-data';
import {
  registerUsersAndAssignToAllEntitiesAsMembers,
  createChallengeWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import { UserPreferenceType } from '@alkemio/client-lib';
import { changePreferenceUserCodegen } from '@test/utils/mutations/preferences-mutation';
import {
  createDiscussionCodegen,
  sendMessageToRoomCodegen,
} from '@test/functional-api/communications/communication.params';
import {
  entitiesId,
  getMailsData,
} from '@test/functional-api/roles/community/communications-helper';

const organizationName = 'not-disc-org-name' + uniqueId;
const hostNameId = 'not-disc-org-nameid' + uniqueId;
const spaceName = 'not-disc-eco-name' + uniqueId;
const spaceNameId = 'not-disc-eco-nameid' + uniqueId;
const ecoName = spaceName;
const challengeName = `chName${uniqueId}`;
let preferencesConfig: any[] = [];
const spaceMemOnly = `spacemem${uniqueId}@alkem.io`;
const challengeAndSpaceMemOnly = `chalmem${uniqueId}@alkem.io`;
const opportunityAndChallengeAndSpaceMem = `oppmem${uniqueId}@alkem.io`;
const spaceDiscussionSubjectText = `${ecoName} - New discussion created: Default title, have a look!`;
const spaceDiscussionSubjectTextAdmin = `[${ecoName}] New discussion created: Default title`;
const challengeDiscussionSubjectText = `${challengeName} - New discussion created: Default title, have a look!`;
const challengeDiscussionSubjectTextAdmin = `[${challengeName}] New discussion created: Default title`;

beforeAll(async () => {
  await deleteMailSlurperMails();

  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeWithUsersCodegen(challengeName);
  await registerUsersAndAssignToAllEntitiesAsMembers(
    spaceMemOnly,
    challengeAndSpaceMemOnly,
    opportunityAndChallengeAndSpaceMem
  );

  preferencesConfig = [
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.NotificationForumDiscussionCreated,
    },
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.NotificationCommunicationDiscussionCreatedAdmin,
    },

    {
      userID: users.spaceAdminId,
      type: UserPreferenceType.NotificationForumDiscussionCreated,
    },
    {
      userID: users.spaceAdminId,
      type: UserPreferenceType.NotificationCommunicationDiscussionCreatedAdmin,
    },

    {
      userID: users.spaceMemberId,
      type: UserPreferenceType.NotificationForumDiscussionCreated,
    },
    {
      userID: users.spaceMemberId,
      type: UserPreferenceType.NotificationCommunicationDiscussionCreatedAdmin,
    },

    {
      userID: users.qaUserId,
      type: UserPreferenceType.NotificationForumDiscussionCreated,
    },

    {
      userID: users.qaUserId,
      type: UserPreferenceType.NotificationCommunicationDiscussionCreatedAdmin,
    },

    {
      userID: users.nonSpaceMemberId,
      type: UserPreferenceType.NotificationForumDiscussionCreated,
    },
    {
      userID: users.nonSpaceMemberId,
      type: UserPreferenceType.NotificationCommunicationDiscussionCreatedAdmin,
    },

    {
      userID: spaceMemOnly,
      type: UserPreferenceType.NotificationForumDiscussionCreated,
    },
    {
      userID: spaceMemOnly,
      type: UserPreferenceType.NotificationCommunicationDiscussionCreatedAdmin,
    },

    {
      userID: challengeAndSpaceMemOnly,
      type: UserPreferenceType.NotificationForumDiscussionCreated,
    },
    {
      userID: challengeAndSpaceMemOnly,
      type: UserPreferenceType.NotificationCommunicationDiscussionCreatedAdmin,
    },

    {
      userID: opportunityAndChallengeAndSpaceMem,
      type: UserPreferenceType.NotificationForumDiscussionCreated,
    },
    {
      userID: opportunityAndChallengeAndSpaceMem,
      type: UserPreferenceType.NotificationCommunicationDiscussionCreatedAdmin,
    },
  ];
});

afterAll(async () => {
  for (const config of preferencesConfig)
    await changePreferenceUserCodegen(config.userID, config.type, 'false');
  await deleteUserCodegen(spaceMemOnly);
  await deleteUserCodegen(challengeAndSpaceMemOnly);
  await deleteUserCodegen(opportunityAndChallengeAndSpaceMem);
  await deleteSpaceCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

// skipping the tests as they need to be updated
describe.skip('Notifications - discussions', () => {
  beforeAll(async () => {
    await changePreferenceUserCodegen(
      users.notificationsAdminId,
      UserPreferenceType.NotificationForumDiscussionCreated,
      'false'
    );
    await changePreferenceUserCodegen(
      users.notificationsAdminId,
      UserPreferenceType.NotificationCommunicationDiscussionCreatedAdmin,
      'false'
    );

    for (const config of preferencesConfig)
      await changePreferenceUserCodegen(config.userID, config.type, 'true');
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('GA create space discussion and send message - GA(1), HA(1), HM(6) get notifications', async () => {
    // Act
    const res = await createDiscussionCodegen(entitiesId.spaceCommunicationId);
    entitiesId.discussionId = res?.data?.createDiscussion.id ?? '';

    await sendMessageToRoomCodegen(entitiesId.discussionId, 'test message');

    await delay(6000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(8);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: spaceDiscussionSubjectTextAdmin,
          toAddresses: [users.globalAdminEmail],
        }),
        expect.objectContaining({
          subject: spaceDiscussionSubjectText,
          toAddresses: [users.spaceAdminEmail],
        }),
        expect.objectContaining({
          subject: spaceDiscussionSubjectText,
          toAddresses: [users.qaUserEmail],
        }),
        expect.objectContaining({
          subject: spaceDiscussionSubjectText,
          toAddresses: [users.spaceMemberEmail],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: spaceDiscussionSubjectText,
          toAddresses: [spaceMemOnly],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: spaceDiscussionSubjectText,
          toAddresses: [challengeAndSpaceMemOnly],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: spaceDiscussionSubjectText,
          toAddresses: [opportunityAndChallengeAndSpaceMem],
        }),
      ])
    );
  });

  test('EM create space discussion and send message - GA(1), HA(1), HM(6) get notifications', async () => {
    // Act
    const res = await createDiscussionCodegen(
      entitiesId.spaceCommunicationId,
      TestUser.QA_USER
    );
    entitiesId.discussionId = res?.data?.createDiscussion.id ?? '';

    await sendMessageToRoomCodegen(entitiesId.discussionId, 'test message');

    await delay(6000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(8);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: spaceDiscussionSubjectTextAdmin,
          toAddresses: [users.globalAdminEmail],
        }),
        expect.objectContaining({
          subject: spaceDiscussionSubjectText,
          toAddresses: [users.spaceAdminEmail],
        }),
        expect.objectContaining({
          subject: spaceDiscussionSubjectText,
          toAddresses: [users.qaUserEmail],
        }),
        expect.objectContaining({
          subject: spaceDiscussionSubjectText,
          toAddresses: [users.spaceMemberEmail],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: spaceDiscussionSubjectText,
          toAddresses: [spaceMemOnly],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: spaceDiscussionSubjectText,
          toAddresses: [challengeAndSpaceMemOnly],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: spaceDiscussionSubjectText,
          toAddresses: [opportunityAndChallengeAndSpaceMem],
        }),
      ])
    );
  });

  test('GA create challenge discussion and send message - GA(1), HA(1), CA(1), CM(4) get notifications', async () => {
    // Act
    const res = await createDiscussionCodegen(
      entitiesId.challengeCommunicationId
    );
    entitiesId.discussionId = res?.data?.createDiscussion.id ?? '';

    await sendMessageToRoomCodegen(entitiesId.discussionId, 'test message');

    await delay(6000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(6);
    // Note: users.globalAdminIdEmail receives email twice, as it member and admin for the entity. Only ones is asserted as the subject of the mail is the same
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: challengeDiscussionSubjectTextAdmin,
          toAddresses: [users.globalAdminEmail],
        }),
        expect.objectContaining({
          subject: challengeDiscussionSubjectText,
          toAddresses: [users.qaUserEmail],
        }),
        expect.objectContaining({
          subject: challengeDiscussionSubjectText,
          toAddresses: [users.spaceMemberEmail],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: challengeDiscussionSubjectText,
          toAddresses: [challengeAndSpaceMemOnly],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: challengeDiscussionSubjectText,
          toAddresses: [opportunityAndChallengeAndSpaceMem],
        }),
      ])
    );
  });

  // Note: users.globalAdminIdEmail receives email twice, as it member and admin for the entity. Only ones is asserted as the subject of the mail is the same
  test('EM create challenge discussion and send message - GA(1), HA(1), CA(1), CM(4), get notifications', async () => {
    // Act
    const res = await createDiscussionCodegen(
      entitiesId.challengeCommunicationId,
      TestUser.QA_USER
    );
    entitiesId.discussionId = res?.data?.createDiscussion.id ?? '';

    await sendMessageToRoomCodegen(entitiesId.discussionId, 'test message');

    await delay(6000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(6);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: challengeDiscussionSubjectTextAdmin,
          toAddresses: [users.globalAdminEmail],
        }),
        expect.objectContaining({
          subject: challengeDiscussionSubjectText,
          toAddresses: [users.qaUserEmail],
        }),
        expect.objectContaining({
          subject: challengeDiscussionSubjectText,
          toAddresses: [users.spaceMemberEmail],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: challengeDiscussionSubjectText,
          toAddresses: [challengeAndSpaceMemOnly],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: challengeDiscussionSubjectText,
          toAddresses: [opportunityAndChallengeAndSpaceMem],
        }),
      ])
    );
  });

  // ToDo - add discussions notifications tests for opportunity

  test('EM create space discussion and send message to space - all roles with notifications disabled', async () => {
    // Arrange

    preferencesConfig.forEach(
      async config =>
        await changePreferenceUserCodegen(config.userID, config.type, 'false')
    );

    const res = await createDiscussionCodegen(
      entitiesId.spaceCommunicationId,
      TestUser.QA_USER
    );
    entitiesId.discussionId = res?.data?.createDiscussion.id ?? '';

    await sendMessageToRoomCodegen(entitiesId.discussionId, 'test message');

    // Act
    await delay(1500);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });
});
