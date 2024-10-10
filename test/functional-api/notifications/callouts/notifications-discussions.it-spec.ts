import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { deleteSpace } from '@test/functional-api/journey/space/space.request.params';
import { delay } from '@test/utils/delay';
import { deleteUser } from '@test/functional-api/contributor-management/user/user.request.params';
import { users } from '@test/utils/queries/users-data';

import { UserPreferenceType } from '@alkemio/client-lib';
import { changePreferenceUser } from '@test/utils/mutations/preferences-mutation';
import {
  createDiscussion,
  sendMessageToRoom,
} from '@test/functional-api/communications/communication.params';
import { entitiesId, getMailsData } from '@test/types/entities-helper';
import { deleteOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';
import {
  createOrgAndSpaceWithUsers,
  createChallengeWithUsers,
  registerUsersAndAssignToAllEntitiesAsMembers,
} from '@test/utils/data-setup/entities';

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

  await createOrgAndSpaceWithUsers(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeWithUsers(challengeName);
  await registerUsersAndAssignToAllEntitiesAsMembers(
    spaceMemOnly,
    challengeAndSpaceMemOnly,
    opportunityAndChallengeAndSpaceMem
  );

  preferencesConfig = [
    {
      userID: users.globalAdmin.id,
      type: UserPreferenceType.NotificationForumDiscussionCreated,
    },
    {
      userID: users.globalAdmin.id,
      type: UserPreferenceType.NotificationCommunicationDiscussionCreatedAdmin,
    },

    {
      userID: users.spaceAdmin.id,
      type: UserPreferenceType.NotificationForumDiscussionCreated,
    },
    {
      userID: users.spaceAdmin.id,
      type: UserPreferenceType.NotificationCommunicationDiscussionCreatedAdmin,
    },

    {
      userID: users.spaceMember.id,
      type: UserPreferenceType.NotificationForumDiscussionCreated,
    },
    {
      userID: users.spaceMember.id,
      type: UserPreferenceType.NotificationCommunicationDiscussionCreatedAdmin,
    },

    {
      userID: users.qaUser.id,
      type: UserPreferenceType.NotificationForumDiscussionCreated,
    },

    {
      userID: users.qaUser.id,
      type: UserPreferenceType.NotificationCommunicationDiscussionCreatedAdmin,
    },

    {
      userID: users.nonSpaceMember.id,
      type: UserPreferenceType.NotificationForumDiscussionCreated,
    },
    {
      userID: users.nonSpaceMember.id,
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
    await changePreferenceUser(config.userID, config.type, 'false');
  await deleteUser(spaceMemOnly);
  await deleteUser(challengeAndSpaceMemOnly);
  await deleteUser(opportunityAndChallengeAndSpaceMem);
  await deleteSpace(entitiesId.challenge.id);
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});

// skipping the tests as they need to be updated
describe.skip('Notifications - discussions', () => {
  beforeAll(async () => {
    await changePreferenceUser(
      users.notificationsAdmin.id,
      UserPreferenceType.NotificationForumDiscussionCreated,
      'false'
    );
    await changePreferenceUser(
      users.notificationsAdmin.id,
      UserPreferenceType.NotificationCommunicationDiscussionCreatedAdmin,
      'false'
    );

    for (const config of preferencesConfig)
      await changePreferenceUser(config.userID, config.type, 'true');
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('GA create space discussion and send message - GA(1), HA(1), HM(6) get notifications', async () => {
    // Act
    const res = await createDiscussion(entitiesId.space.communicationId);
    entitiesId.discussionId = res?.data?.createDiscussion.id ?? '';

    await sendMessageToRoom(entitiesId.discussionId, 'test message');

    await delay(6000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(8);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: spaceDiscussionSubjectTextAdmin,
          toAddresses: [users.globalAdmin.email],
        }),
        expect.objectContaining({
          subject: spaceDiscussionSubjectText,
          toAddresses: [users.spaceAdmin.email],
        }),
        expect.objectContaining({
          subject: spaceDiscussionSubjectText,
          toAddresses: [users.qaUser.email],
        }),
        expect.objectContaining({
          subject: spaceDiscussionSubjectText,
          toAddresses: [users.spaceMember.email],
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
    const res = await createDiscussion(
      entitiesId.space.communicationId,
      TestUser.QA_USER
    );
    entitiesId.discussionId = res?.data?.createDiscussion.id ?? '';

    await sendMessageToRoom(entitiesId.discussionId, 'test message');

    await delay(6000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(8);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: spaceDiscussionSubjectTextAdmin,
          toAddresses: [users.globalAdmin.email],
        }),
        expect.objectContaining({
          subject: spaceDiscussionSubjectText,
          toAddresses: [users.spaceAdmin.email],
        }),
        expect.objectContaining({
          subject: spaceDiscussionSubjectText,
          toAddresses: [users.qaUser.email],
        }),
        expect.objectContaining({
          subject: spaceDiscussionSubjectText,
          toAddresses: [users.spaceMember.email],
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
    const res = await createDiscussion(entitiesId.challenge.communicationId);
    entitiesId.discussionId = res?.data?.createDiscussion.id ?? '';

    await sendMessageToRoom(entitiesId.discussionId, 'test message');

    await delay(6000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(6);
    // Note: users.globalAdmin.idEmail receives email twice, as it member and admin for the entity. Only ones is asserted as the subject of the mail is the same
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: challengeDiscussionSubjectTextAdmin,
          toAddresses: [users.globalAdmin.email],
        }),
        expect.objectContaining({
          subject: challengeDiscussionSubjectText,
          toAddresses: [users.qaUser.email],
        }),
        expect.objectContaining({
          subject: challengeDiscussionSubjectText,
          toAddresses: [users.spaceMember.email],
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

  // Note: users.globalAdmin.idEmail receives email twice, as it member and admin for the entity. Only ones is asserted as the subject of the mail is the same
  test('EM create challenge discussion and send message - GA(1), HA(1), CA(1), CM(4), get notifications', async () => {
    // Act
    const res = await createDiscussion(
      entitiesId.challenge.communicationId,
      TestUser.QA_USER
    );
    entitiesId.discussionId = res?.data?.createDiscussion.id ?? '';

    await sendMessageToRoom(entitiesId.discussionId, 'test message');

    await delay(6000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(6);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: challengeDiscussionSubjectTextAdmin,
          toAddresses: [users.globalAdmin.email],
        }),
        expect.objectContaining({
          subject: challengeDiscussionSubjectText,
          toAddresses: [users.qaUser.email],
        }),
        expect.objectContaining({
          subject: challengeDiscussionSubjectText,
          toAddresses: [users.spaceMember.email],
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
        await changePreferenceUser(config.userID, config.type, 'false')
    );

    const res = await createDiscussion(
      entitiesId.space.communicationId,
      TestUser.QA_USER
    );
    entitiesId.discussionId = res?.data?.createDiscussion.id ?? '';

    await sendMessageToRoom(entitiesId.discussionId, 'test message');

    // Act
    await delay(1500);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });
});
