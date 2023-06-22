import { mutation } from '@test/utils/graphql.request';

import {
  UserPreferenceType,
  changePreferenceUser,
} from '@test/utils/mutations/preferences-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  createDiscussion,
  createDiscussionVariablesData,
  postDiscussionComment,
  postDiscussionCommentVariablesData,
} from '@test/utils/mutations/communications-mutation';
import { TestUser } from '@test/utils/token.helper';

import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import {
  createChallengeWithUsers,
  createOrgAndSpaceWithUsers,
  registerUsersAndAssignToAllEntitiesAsMembers,
} from '../create-entities-with-users-helper';
import { entitiesId, getMailsData } from '../communications-helper';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeSpace } from '@test/functional-api/integration/space/space.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { delay } from '@test/utils/delay';
import { removeUser } from '@test/functional-api/user-management/user.request.params';
import { users } from '@test/utils/queries/users-data';

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
      userID: users.globalAdminId,
      type: UserPreferenceType.DISCUSSION_CREATED,
    },
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.DISCUSSION_CREATED_ADMIN,
    },
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.DISCUSSION_RESPONSE,
    },
    {
      userID: users.spaceAdminId,
      type: UserPreferenceType.DISCUSSION_CREATED,
    },
    {
      userID: users.spaceAdminId,
      type: UserPreferenceType.DISCUSSION_CREATED_ADMIN,
    },
    {
      userID: users.spaceAdminId,
      type: UserPreferenceType.DISCUSSION_RESPONSE,
    },
    {
      userID: users.spaceMemberId,
      type: UserPreferenceType.DISCUSSION_CREATED,
    },
    {
      userID: users.spaceMemberId,
      type: UserPreferenceType.DISCUSSION_CREATED_ADMIN,
    },

    {
      userID: users.spaceMemberId,
      type: UserPreferenceType.DISCUSSION_RESPONSE,
    },

    {
      userID: users.qaUserId,
      type: UserPreferenceType.DISCUSSION_CREATED,
    },

    {
      userID: users.qaUserId,
      type: UserPreferenceType.DISCUSSION_CREATED_ADMIN,
    },

    {
      userID: users.qaUserId,
      type: UserPreferenceType.DISCUSSION_RESPONSE,
    },

    {
      userID: users.nonSpaceMemberId,
      type: UserPreferenceType.DISCUSSION_CREATED,
    },
    {
      userID: users.nonSpaceMemberId,
      type: UserPreferenceType.DISCUSSION_CREATED_ADMIN,
    },
    {
      userID: users.nonSpaceMemberId,
      type: UserPreferenceType.DISCUSSION_RESPONSE,
    },
    ///
    {
      userID: spaceMemOnly,
      type: UserPreferenceType.DISCUSSION_CREATED,
    },
    {
      userID: spaceMemOnly,
      type: UserPreferenceType.DISCUSSION_CREATED_ADMIN,
    },
    {
      userID: spaceMemOnly,
      type: UserPreferenceType.DISCUSSION_RESPONSE,
    },

    {
      userID: challengeAndSpaceMemOnly,
      type: UserPreferenceType.DISCUSSION_CREATED,
    },
    {
      userID: challengeAndSpaceMemOnly,
      type: UserPreferenceType.DISCUSSION_CREATED_ADMIN,
    },
    {
      userID: challengeAndSpaceMemOnly,
      type: UserPreferenceType.DISCUSSION_RESPONSE,
    },

    {
      userID: opportunityAndChallengeAndSpaceMem,
      type: UserPreferenceType.DISCUSSION_CREATED,
    },
    {
      userID: opportunityAndChallengeAndSpaceMem,
      type: UserPreferenceType.DISCUSSION_CREATED_ADMIN,
    },
    {
      userID: opportunityAndChallengeAndSpaceMem,
      type: UserPreferenceType.DISCUSSION_RESPONSE,
    },
  ];
});

afterAll(async () => {
  for (const config of preferencesConfig)
    await changePreferenceUser(config.userID, config.type, 'false');
  await removeUser(spaceMemOnly);
  await removeUser(challengeAndSpaceMemOnly);
  await removeUser(opportunityAndChallengeAndSpaceMem);
  await removeChallenge(entitiesId.challengeId);
  await removeSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
});

// skipping the tests as they need to be updated
describe.skip('Notifications - discussions', () => {
  beforeAll(async () => {
    await changePreferenceUser(
      users.notificationsAdminId,
      UserPreferenceType.DISCUSSION_CREATED,
      'false'
    );
    await changePreferenceUser(
      users.notificationsAdminId,
      UserPreferenceType.DISCUSSION_CREATED_ADMIN,
      'false'
    );
    await changePreferenceUser(
      users.notificationsAdminId,
      UserPreferenceType.DISCUSSION_RESPONSE,
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
    const res = await mutation(
      createDiscussion,
      createDiscussionVariablesData(entitiesId.spaceCommunicationId)
    );
    entitiesId.discussionId = res.body.data.createDiscussion.id;

    await mutation(
      postDiscussionComment,
      postDiscussionCommentVariablesData(
        entitiesId.discussionId,
        'test message'
      )
    );

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
    const res = await mutation(
      createDiscussion,
      createDiscussionVariablesData(entitiesId.spaceCommunicationId),
      TestUser.QA_USER
    );
    entitiesId.discussionId = res.body.data.createDiscussion.id;

    await mutation(
      postDiscussionComment,
      postDiscussionCommentVariablesData(
        entitiesId.discussionId,
        'test message'
      )
    );

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
    const res = await mutation(
      createDiscussion,
      createDiscussionVariablesData(entitiesId.challengeCommunicationId)
    );
    entitiesId.discussionId = res.body.data.createDiscussion.id;

    await mutation(
      postDiscussionComment,
      postDiscussionCommentVariablesData(
        entitiesId.discussionId,
        'test message'
      )
    );

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
    const res = await mutation(
      createDiscussion,
      createDiscussionVariablesData(entitiesId.challengeCommunicationId),
      TestUser.QA_USER
    );
    entitiesId.discussionId = res.body.data.createDiscussion.id;

    await mutation(
      postDiscussionComment,
      postDiscussionCommentVariablesData(
        entitiesId.discussionId,
        'test message'
      )
    );

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
        await changePreferenceUser(config.userID, config.type, 'false')
    );

    const res = await mutation(
      createDiscussion,
      createDiscussionVariablesData(entitiesId.spaceCommunicationId),
      TestUser.QA_USER
    );
    entitiesId.discussionId = res.body.data.createDiscussion.id;

    await mutation(
      postDiscussionComment,
      postDiscussionCommentVariablesData(
        entitiesId.discussionId,
        'test message'
      )
    );

    // Act
    await delay(1500);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });
});
