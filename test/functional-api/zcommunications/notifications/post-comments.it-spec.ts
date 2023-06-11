import {
  UserPreferenceType,
  changePreferenceUser,
} from '@test/utils/mutations/preferences-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import {
  createChallengeWithUsers,
  createOpportunityWithUsers,
  createOrgAndHubWithUsers,
} from '../create-entities-with-users-helper';
import { entitiesId, getMailsData } from '../communications-helper';
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { delay } from '@test/utils/delay';
import {
  createPostOnCallout,
  PostTypes,
  removePost,
} from '@test/functional-api/integration/post/post.request.params';
import { mutation } from '@test/utils/graphql.request';
import {
  removeComment,
  removeCommentVariablesData,
  sendComment,
  sendCommentVariablesData,
} from '@test/utils/mutations/communications-mutation';
import { users } from '@test/utils/queries/users-data';

const organizationName = 'not-up-org-name' + uniqueId;
const hostNameId = 'not-up-org-nameid' + uniqueId;
const hubName = 'not-up-eco-name' + uniqueId;
const hubNameId = 'not-up-eco-nameid' + uniqueId;
const challengeName = `chName${uniqueId}`;
const opportunityName = `opName${uniqueId}`;
let hubPostId = '';
let challengePostId = '';
let opportunityPostId = '';
let postDisplayName = '';
let postCommentsIdHub = '';
let postCommentsIdChallenge = '';
let postCommentsIdOpportunity = '';
let msessageId = '';
let preferencesPostConfig: any[] = [];
let preferencesPostCommentsConfig: any[] = [];

beforeAll(async () => {
  await deleteMailSlurperMails();

  await createOrgAndHubWithUsers(
    organizationName,
    hostNameId,
    hubName,
    hubNameId
  );
  await createChallengeWithUsers(challengeName);
  await createOpportunityWithUsers(opportunityName);

  preferencesPostConfig = [
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.POST_CREATED,
    },
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.POST_CREATED_ADMIN,
    },

    {
      userID: users.hubMemberId,
      type: UserPreferenceType.POST_CREATED,
    },
    {
      userID: users.hubMemberId,
      type: UserPreferenceType.POST_CREATED_ADMIN,
    },

    {
      userID: users.challengeMemberId,
      type: UserPreferenceType.POST_CREATED,
    },
    {
      userID: users.challengeMemberId,
      type: UserPreferenceType.POST_CREATED_ADMIN,
    },

    {
      userID: users.opportunityMemberId,
      type: UserPreferenceType.POST_CREATED,
    },
    {
      userID: users.opportunityMemberId,
      type: UserPreferenceType.POST_CREATED_ADMIN,
    },

    {
      userID: users.hubAdminId,
      type: UserPreferenceType.POST_CREATED,
    },
    {
      userID: users.hubAdminId,
      type: UserPreferenceType.POST_CREATED_ADMIN,
    },
    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.POST_CREATED,
    },
    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.POST_CREATED_ADMIN,
    },
    {
      userID: users.opportunityAdminId,
      type: UserPreferenceType.POST_CREATED,
    },
    {
      userID: users.opportunityAdminId,
      type: UserPreferenceType.POST_CREATED_ADMIN,
    },
    {
      userID: users.nonHubMemberId,
      type: UserPreferenceType.POST_CREATED,
    },
    {
      userID: users.nonHubMemberId,
      type: UserPreferenceType.POST_CREATED_ADMIN,
    },
  ];

  preferencesPostCommentsConfig = [
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.POST_COMMENT_CREATED,
    },
    {
      userID: users.hubMemberId,
      type: UserPreferenceType.POST_COMMENT_CREATED,
    },
    {
      userID: users.challengeMemberId,
      type: UserPreferenceType.POST_COMMENT_CREATED,
    },
    {
      userID: users.opportunityMemberId,
      type: UserPreferenceType.POST_COMMENT_CREATED,
    },
    {
      userID: users.hubAdminId,
      type: UserPreferenceType.POST_COMMENT_CREATED,
    },
    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.POST_COMMENT_CREATED,
    },
    {
      userID: users.opportunityAdminId,
      type: UserPreferenceType.POST_COMMENT_CREATED,
    },
    {
      userID: users.nonHubMemberId,
      type: UserPreferenceType.POST_COMMENT_CREATED,
    },
  ];
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Notifications - post comments', () => {
  let postNameID = '';
  postNameID = `post-name-id-${uniqueId}`;
  postDisplayName = `post-d-name-${uniqueId}`;
  beforeEach(async () => {
    await deleteMailSlurperMails();

    postNameID = `post-name-id-${uniqueId}`;
    postDisplayName = `post-d-name-${uniqueId}`;
  });

  beforeAll(async () => {
    await changePreferenceUser(
      users.notificationsAdminId,
      UserPreferenceType.POST_COMMENT_CREATED,
      'false'
    );
    await changePreferenceUser(
      users.notificationsAdminId,
      UserPreferenceType.POST_CREATED,
      'false'
    );
    await changePreferenceUser(
      users.notificationsAdminId,
      UserPreferenceType.POST_CREATED_ADMIN,
      'false'
    );

    await changePreferenceUser(
      users.globalCommunityAdminId,
      UserPreferenceType.POST_COMMENT_CREATED,
      'false'
    );
    await changePreferenceUser(
      users.globalCommunityAdminId,
      UserPreferenceType.POST_CREATED,
      'false'
    );
    await changePreferenceUser(
      users.globalCommunityAdminId,
      UserPreferenceType.POST_CREATED_ADMIN,
      'false'
    );
    preferencesPostConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'false')
    );

    preferencesPostCommentsConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'true')
    );
  });

  afterEach(async () => {
    await delay(6000);
    await mutation(
      removeComment,
      removeCommentVariablesData(postCommentsIdHub, msessageId),
      TestUser.GLOBAL_ADMIN
    );
  });
  describe('GA create post on hub  ', () => {
    beforeAll(async () => {
      const resPostonHub = await createPostOnCallout(
        entitiesId.hubCalloutId,
        postNameID,
        { profileData: { displayName: postDisplayName } },
        PostTypes.KNOWLEDGE,
        TestUser.GLOBAL_ADMIN
      );
      hubPostId = resPostonHub.body.data.createPostOnCallout.id;
      postCommentsIdHub =
        resPostonHub.body.data.createPostOnCallout.comments.id;
    });

    afterAll(async () => {
      await removePost(hubPostId);
    });
    test('GA create comment - GA(1) get notifications', async () => {
      const hubPostSubjectText = `${hubName} - New comment received on your Post &#34;${postDisplayName}&#34;, have a look!`;

      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(postCommentsIdHub, 'test message on hub post'),
        TestUser.GLOBAL_ADMIN
      );
      msessageId = messageRes.body.data.sendMessageToRoom.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: hubPostSubjectText,
            toAddresses: [users.globalAdminEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });

    test('HM create comment - GA(1) get notifications', async () => {
      const hubPostSubjectText = `${hubName} - New comment received on your Post &#34;${postDisplayName}&#34;, have a look!`;
      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(postCommentsIdHub, 'test message on hub post'),
        TestUser.HUB_MEMBER
      );
      msessageId = messageRes.body.data.sendMessageToRoom.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: hubPostSubjectText,
            toAddresses: [users.globalAdminEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });
  });

  describe('HM create post on hub  ', () => {
    beforeAll(async () => {
      const resPostonHub = await createPostOnCallout(
        entitiesId.hubCalloutId,
        postNameID,
        { profileData: { displayName: postDisplayName } },
        PostTypes.KNOWLEDGE,
        TestUser.HUB_MEMBER
      );
      hubPostId = resPostonHub.body.data.createPostOnCallout.id;
      postCommentsIdHub =
        resPostonHub.body.data.createPostOnCallout.comments.id;
    });

    afterAll(async () => {
      await removePost(hubPostId);
    });
    test('HM create comment - HM(1) get notifications', async () => {
      const hubPostSubjectText = `${hubName} - New comment received on your Post &#34;${postDisplayName}&#34;, have a look!`;

      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(postCommentsIdHub, 'test message on hub post'),
        TestUser.HUB_MEMBER
      );
      msessageId = messageRes.body.data.sendMessageToRoom.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: hubPostSubjectText,
            toAddresses: [users.hubMemberEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });

    test('HA create comment - HM(1) get notifications', async () => {
      const hubPostSubjectText = `${hubName} - New comment received on your Post &#34;${postDisplayName}&#34;, have a look!`;
      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(postCommentsIdHub, 'test message on hub post'),
        TestUser.HUB_ADMIN
      );
      msessageId = messageRes.body.data.sendMessageToRoom.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: hubPostSubjectText,
            toAddresses: [users.hubMemberEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });
  });

  describe('CM create post on challenge  ', () => {
    beforeAll(async () => {
      const resPostonHub = await createPostOnCallout(
        entitiesId.challengeCalloutId,
        postNameID,
        { profileData: { displayName: postDisplayName } },
        PostTypes.KNOWLEDGE,
        TestUser.CHALLENGE_MEMBER
      );
      challengePostId = resPostonHub.body.data.createPostOnCallout.id;
      postCommentsIdChallenge =
        resPostonHub.body.data.createPostOnCallout.comments.id;
    });

    afterAll(async () => {
      await removePost(challengePostId);
    });
    test('CM create comment - CM(1) get notifications', async () => {
      const challengePostSubjectText = `${challengeName} - New comment received on your Post &#34;${postDisplayName}&#34;, have a look!`;

      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          postCommentsIdChallenge,
          'test message on challenge post'
        ),
        TestUser.CHALLENGE_MEMBER
      );
      msessageId = messageRes.body.data.sendMessageToRoom.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: challengePostSubjectText,
            toAddresses: [users.challengeMemberEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });

    test('CA create comment - CM(1) get notifications', async () => {
      const challengePostSubjectText = `${challengeName} - New comment received on your Post &#34;${postDisplayName}&#34;, have a look!`;
      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          postCommentsIdChallenge,
          'test message on challenge post'
        ),
        TestUser.CHALLENGE_ADMIN
      );
      msessageId = messageRes.body.data.sendMessageToRoom.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: challengePostSubjectText,
            toAddresses: [users.challengeMemberEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });
  });

  describe('OM create post on opportunity  ', () => {
    beforeAll(async () => {
      const resPostonHub = await createPostOnCallout(
        entitiesId.opportunityCalloutId,
        postNameID,
        { profileData: { displayName: postDisplayName } },
        PostTypes.KNOWLEDGE,
        TestUser.OPPORTUNITY_MEMBER
      );
      opportunityPostId = resPostonHub.body.data.createPostOnCallout.id;
      postCommentsIdOpportunity =
        resPostonHub.body.data.createPostOnCallout.comments.id;
    });

    afterAll(async () => {
      await removePost(opportunityPostId);
    });
    test('OM create comment - OM(1) get notifications', async () => {
      const opportunityPostSubjectText = `${opportunityName} - New comment received on your Post &#34;${postDisplayName}&#34;, have a look!`;

      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          postCommentsIdOpportunity,
          'test message on opportunity post'
        ),
        TestUser.OPPORTUNITY_MEMBER
      );
      msessageId = messageRes.body.data.sendMessageToRoom.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: opportunityPostSubjectText,
            toAddresses: [users.opportunityMemberEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });

    test('CA create comment - OM(1) get notifications', async () => {
      const opportunityPostSubjectText = `${opportunityName} - New comment received on your Post &#34;${postDisplayName}&#34;, have a look!`;
      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          postCommentsIdOpportunity,
          'test message on opportunity post'
        ),
        TestUser.CHALLENGE_ADMIN
      );
      msessageId = messageRes.body.data.sendMessageToRoom.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: opportunityPostSubjectText,
            toAddresses: [users.opportunityMemberEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });
  });

  test('OA create post on opportunity and comment - 0 notifications - all roles with notifications disabled', async () => {
    preferencesPostCommentsConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'false')
    );
    // Act
    const resPostonHub = await createPostOnCallout(
      entitiesId.opportunityCalloutId,
      postNameID,
      { profileData: { displayName: postDisplayName } },
      PostTypes.KNOWLEDGE,
      TestUser.OPPORTUNITY_ADMIN
    );
    opportunityPostId = resPostonHub.body.data.createPostOnCallout.id;
    postCommentsIdOpportunity =
      resPostonHub.body.data.createPostOnCallout.comments.id;
    await mutation(
      sendComment,
      sendCommentVariablesData(
        postCommentsIdOpportunity,
        'test message on opportunity post'
      ),
      TestUser.OPPORTUNITY_ADMIN
    );

    // Assert
    await delay(1500);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
