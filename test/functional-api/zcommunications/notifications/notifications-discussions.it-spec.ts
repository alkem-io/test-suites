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
} from '../create-entities-with-users-helper';
import { entitiesId, getMailsData, users } from '../communications-helper';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { delay } from '@test/utils/delay';

let organizationName = 'not-disc-org-name' + uniqueId;
let hostNameId = 'not-disc-org-nameid' + uniqueId;
let hubName = 'not-disc-eco-name' + uniqueId;
let hubNameId = 'not-disc-eco-nameid' + uniqueId;

let ecoName = hubName;
let challengeName = `chName${uniqueId}`;
let preferencesConfig: any[] = [];

beforeAll(async () => {
  await deleteMailSlurperMails();

  await createOrgAndHubWithUsers(
    organizationName,
    hostNameId,
    hubName,
    hubNameId
  );
  await createChallengeWithUsers(challengeName);

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
  ];
});

afterAll(async () => {
  for (const config of preferencesConfig)
    await changePreferenceUser(config.userID, config.type, 'false');
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Notifications - discussions', () => {
  beforeAll(async () => {
    for (const config of preferencesConfig)
      await changePreferenceUser(config.userID, config.type, 'true');
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('GA create hub discussion and send message - GA(1), EA (1), EM(1), CA(1) get notifications', async () => {
    // Act
    let res = await mutation(
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
    let getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(5);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New discussion created on ${ecoName}: Default title`,
          toAddresses: [users.globalAdminIdEmail],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${ecoName}: Default title`,
          toAddresses: [users.hubAdminEmail],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${ecoName}: Default title`,
          toAddresses: [users.qaUserEmail],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${ecoName}: Default title`,
          toAddresses: [users.hubMemberEmail],
        }),
      ])
    );
  });

  test('EM create hub discussion and send message - GA(1), EA (1), EM(1), CA(1) get notifications', async () => {
    // Act
    let res = await mutation(
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
    let getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(5);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New discussion created on ${ecoName}: Default title`,
          toAddresses: [users.globalAdminIdEmail],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${ecoName}: Default title`,
          toAddresses: [users.hubAdminEmail],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${ecoName}: Default title`,
          toAddresses: [users.qaUserEmail],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${ecoName}: Default title`,
          toAddresses: [users.hubMemberEmail],
        }),
      ])
    );
  });

  test('GA create challenge discussion and send message - GA(1), EA (1), EM(1), CA(1) get notifications', async () => {
    // Act
    let res = await mutation(
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
    let getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(5);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New discussion created on ${challengeName}: Default title`,
          toAddresses: [users.globalAdminIdEmail],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${challengeName}: Default title`,
          toAddresses: [users.hubAdminEmail],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${challengeName}: Default title`,
          toAddresses: [users.qaUserEmail],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${challengeName}: Default title`,
          toAddresses: [users.hubMemberEmail],
        }),
      ])
    );
  });

  test('EM create challenge discussion and send message - GA(1), EA (1), EM(1), CA(1) get notifications', async () => {
    // Act
    let res = await mutation(
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
    let getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(5);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New discussion created on ${challengeName}: Default title`,
          toAddresses: [users.globalAdminIdEmail],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${challengeName}: Default title`,
          toAddresses: [users.hubAdminEmail],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${challengeName}: Default title`,
          toAddresses: [users.qaUserEmail],
        }),
        expect.objectContaining({
          subject: `New discussion created on ${challengeName}: Default title`,
          toAddresses: [users.hubMemberEmail],
        }),
      ])
    );
  });

  test('EM create hub discussion and send message to hub - all roles with notifications disabled', async () => {
    // Arrange

    preferencesConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'false')
    );

    let res = await mutation(
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
    let getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });
});
