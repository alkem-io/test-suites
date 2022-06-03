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
  createOrgAndHubWithUsers,
  registerUsersAndAssignToAllEntitiesAsMembers,
} from '../create-entities-with-users-helper';
import { entitiesId, getMailsData, users } from '../communications-helper';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { delay } from '@test/utils/delay';
import { removeUser } from '@test/functional-api/user-management/user.request.params';

const organizationName = 'not-disc-org-name' + uniqueId;
const hostNameId = 'not-disc-org-nameid' + uniqueId;
const hubName = 'not-disc-eco-name' + uniqueId;
const hubNameId = 'not-disc-eco-nameid' + uniqueId;
const ecoName = hubName;
const challengeName = `chName${uniqueId}`;
let preferencesConfig: any[] = [];
const hubMemOnly = `hubmem${uniqueId}@alkem.io`;
const challengeAndHubMemOnly = `chalmem${uniqueId}@alkem.io`;
const opportunityAndChallengeAndHubMem = `oppmem${uniqueId}@alkem.io`;
const hubDiscussionSubjectText = `New discussion created on ${ecoName}: Default title`;
const challengeDiscussionSubjectText = `New discussion created on ${challengeName}: Default title`;

beforeAll(async () => {
  await deleteMailSlurperMails();

  await createOrgAndHubWithUsers(
    organizationName,
    hostNameId,
    hubName,
    hubNameId
  );
  await createChallengeWithUsers(challengeName);
  await registerUsersAndAssignToAllEntitiesAsMembers(
    hubMemOnly,
    challengeAndHubMemOnly,
    opportunityAndChallengeAndHubMem
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
      userID: users.hubAdminId,
      type: UserPreferenceType.DISCUSSION_CREATED,
    },
    {
      userID: users.hubAdminId,
      type: UserPreferenceType.DISCUSSION_CREATED_ADMIN,
    },
    {
      userID: users.hubAdminId,
      type: UserPreferenceType.DISCUSSION_RESPONSE,
    },
    {
      userID: users.hubMemberId,
      type: UserPreferenceType.DISCUSSION_CREATED,
    },
    {
      userID: users.hubMemberId,
      type: UserPreferenceType.DISCUSSION_CREATED_ADMIN,
    },

    {
      userID: users.hubMemberId,
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
      userID: users.nonHubMemberId,
      type: UserPreferenceType.DISCUSSION_CREATED,
    },
    {
      userID: users.nonHubMemberId,
      type: UserPreferenceType.DISCUSSION_CREATED_ADMIN,
    },
    {
      userID: users.nonHubMemberId,
      type: UserPreferenceType.DISCUSSION_RESPONSE,
    },
    ///
    {
      userID: hubMemOnly,
      type: UserPreferenceType.DISCUSSION_CREATED,
    },
    {
      userID: hubMemOnly,
      type: UserPreferenceType.DISCUSSION_CREATED_ADMIN,
    },
    {
      userID: hubMemOnly,
      type: UserPreferenceType.DISCUSSION_RESPONSE,
    },

    {
      userID: challengeAndHubMemOnly,
      type: UserPreferenceType.DISCUSSION_CREATED,
    },
    {
      userID: challengeAndHubMemOnly,
      type: UserPreferenceType.DISCUSSION_CREATED_ADMIN,
    },
    {
      userID: challengeAndHubMemOnly,
      type: UserPreferenceType.DISCUSSION_RESPONSE,
    },

    {
      userID: opportunityAndChallengeAndHubMem,
      type: UserPreferenceType.DISCUSSION_CREATED,
    },
    {
      userID: opportunityAndChallengeAndHubMem,
      type: UserPreferenceType.DISCUSSION_CREATED_ADMIN,
    },
    {
      userID: opportunityAndChallengeAndHubMem,
      type: UserPreferenceType.DISCUSSION_RESPONSE,
    },
  ];
});

afterAll(async () => {
  for (const config of preferencesConfig)
    await changePreferenceUser(config.userID, config.type, 'false');
  await removeUser(hubMemOnly);
  await removeUser(challengeAndHubMemOnly);
  await removeUser(opportunityAndChallengeAndHubMem);
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Notifications - discussions', () => {
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

  test('GA create hub discussion and send message - GA(1), HA(1), HM(6) get notifications', async () => {
    // Act
    const res = await mutation(
      createDiscussion,
      createDiscussionVariablesData(entitiesId.hubCommunicationId)
    );
    entitiesId.discussionId = res.body.data.createDiscussion.id;

    await mutation(
      postDiscussionComment,
      postDiscussionCommentVariablesData(
        entitiesId.discussionId,
        'test message'
      )
    );

    await delay(3000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(8);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubDiscussionSubjectText,
          toAddresses: [users.globalAdminIdEmail],
        }),
        expect.objectContaining({
          subject: hubDiscussionSubjectText,
          toAddresses: [users.hubAdminEmail],
        }),
        expect.objectContaining({
          subject: hubDiscussionSubjectText,
          toAddresses: [users.qaUserEmail],
        }),
        expect.objectContaining({
          subject: hubDiscussionSubjectText,
          toAddresses: [users.hubMemberEmail],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubDiscussionSubjectText,
          toAddresses: [hubMemOnly],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubDiscussionSubjectText,
          toAddresses: [challengeAndHubMemOnly],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubDiscussionSubjectText,
          toAddresses: [opportunityAndChallengeAndHubMem],
        }),
      ])
    );
  });

  test('EM create hub discussion and send message - GA(1), HA(1), HM(6) get notifications', async () => {
    // Act
    const res = await mutation(
      createDiscussion,
      createDiscussionVariablesData(entitiesId.hubCommunicationId),
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

    await delay(3000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(8);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubDiscussionSubjectText,
          toAddresses: [users.globalAdminIdEmail],
        }),
        expect.objectContaining({
          subject: hubDiscussionSubjectText,
          toAddresses: [users.hubAdminEmail],
        }),
        expect.objectContaining({
          subject: hubDiscussionSubjectText,
          toAddresses: [users.qaUserEmail],
        }),
        expect.objectContaining({
          subject: hubDiscussionSubjectText,
          toAddresses: [users.hubMemberEmail],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubDiscussionSubjectText,
          toAddresses: [hubMemOnly],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubDiscussionSubjectText,
          toAddresses: [challengeAndHubMemOnly],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubDiscussionSubjectText,
          toAddresses: [opportunityAndChallengeAndHubMem],
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

    await delay(3000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(6);
    // Note: users.globalAdminIdEmail receives email twice, as it member and admin for the entity. Only ones is asserted as the subject of the mail is the same
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: challengeDiscussionSubjectText,
          toAddresses: [users.globalAdminIdEmail],
        }),
        expect.objectContaining({
          subject: challengeDiscussionSubjectText,
          toAddresses: [users.qaUserEmail],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${challengeName}: Default title`,
          toAddresses: [users.hubMemberEmail],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: challengeDiscussionSubjectText,
          toAddresses: [challengeAndHubMemOnly],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: challengeDiscussionSubjectText,
          toAddresses: [opportunityAndChallengeAndHubMem],
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

    await delay(3000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(6);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: challengeDiscussionSubjectText,
          toAddresses: [users.globalAdminIdEmail],
        }),
        expect.objectContaining({
          subject: challengeDiscussionSubjectText,
          toAddresses: [users.qaUserEmail],
        }),
        expect.objectContaining({
          subject: challengeDiscussionSubjectText,
          toAddresses: [users.hubMemberEmail],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: challengeDiscussionSubjectText,
          toAddresses: [challengeAndHubMemOnly],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: challengeDiscussionSubjectText,
          toAddresses: [opportunityAndChallengeAndHubMem],
        }),
      ])
    );
  });

  // ToDo - add discussions notifications tests for opportunity

  test('EM create hub discussion and send message to hub - all roles with notifications disabled', async () => {
    // Arrange

    preferencesConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'false')
    );

    const res = await mutation(
      createDiscussion,
      createDiscussionVariablesData(entitiesId.hubCommunicationId),
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
