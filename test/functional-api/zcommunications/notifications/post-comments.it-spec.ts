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
  createOrgAndSpaceWithUsers,
} from '../create-entities-with-users-helper';
import { entitiesId, getMailsData } from '../communications-helper';
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeSpace } from '@test/functional-api/integration/space/space.request.params';
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
const spaceName = 'not-up-eco-name' + uniqueId;
const spaceNameId = 'not-up-eco-nameid' + uniqueId;
const challengeName = `chName${uniqueId}`;
const opportunityName = `opName${uniqueId}`;
let spacePostId = '';
let challengePostId = '';
let opportunityPostId = '';
let postDisplayName = '';
let postCommentsIdSpace = '';
let postCommentsIdChallenge = '';
let postCommentsIdOpportunity = '';
let msessageId = '';
let preferencesPostConfig: any[] = [];
let preferencesPostCommentsConfig: any[] = [];

beforeAll(async () => {
  await deleteMailSlurperMails();

  await createOrgAndSpaceWithUsers(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
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
      userID: users.spaceMemberId,
      type: UserPreferenceType.POST_CREATED,
    },
    {
      userID: users.spaceMemberId,
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
      userID: users.spaceAdminId,
      type: UserPreferenceType.POST_CREATED,
    },
    {
      userID: users.spaceAdminId,
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
      userID: users.nonSpaceMemberId,
      type: UserPreferenceType.POST_CREATED,
    },
    {
      userID: users.nonSpaceMemberId,
      type: UserPreferenceType.POST_CREATED_ADMIN,
    },
  ];

  preferencesPostCommentsConfig = [
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.POST_COMMENT_CREATED,
    },
    {
      userID: users.spaceMemberId,
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
      userID: users.spaceAdminId,
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
      userID: users.nonSpaceMemberId,
      type: UserPreferenceType.POST_COMMENT_CREATED,
    },
  ];
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeSpace(entitiesId.spaceId);
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
      removeCommentVariablesData(postCommentsIdSpace, msessageId),
      TestUser.GLOBAL_ADMIN
    );
  });
  describe('GA create post on space  ', () => {
    beforeAll(async () => {
      const resPostonSpace = await createPostOnCallout(
        entitiesId.spaceCalloutId,
        postNameID,
        { profileData: { displayName: postDisplayName } },
        PostTypes.KNOWLEDGE,
        TestUser.GLOBAL_ADMIN
      );
      spacePostId = resPostonSpace.body.data.createPostOnCallout.id;
      postCommentsIdSpace =
        resPostonSpace.body.data.createPostOnCallout.comments.id;
    });

    afterAll(async () => {
      await removePost(spacePostId);
    });
    test('GA create comment - GA(1) get notifications', async () => {
      const spacePostSubjectText = `${spaceName} - New comment received on your Post &#34;${postDisplayName}&#34;, have a look!`;

      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          postCommentsIdSpace,
          'test message on space post'
        ),
        TestUser.GLOBAL_ADMIN
      );
      msessageId = messageRes.body.data.sendMessageToRoom.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: spacePostSubjectText,
            toAddresses: [users.globalAdminEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });

    test('HM create comment - GA(1) get notifications', async () => {
      const spacePostSubjectText = `${spaceName} - New comment received on your Post &#34;${postDisplayName}&#34;, have a look!`;
      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          postCommentsIdSpace,
          'test message on space post'
        ),
        TestUser.HUB_MEMBER
      );
      msessageId = messageRes.body.data.sendMessageToRoom.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: spacePostSubjectText,
            toAddresses: [users.globalAdminEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });
  });

  describe('HM create post on space  ', () => {
    beforeAll(async () => {
      const resPostonSpace = await createPostOnCallout(
        entitiesId.spaceCalloutId,
        postNameID,
        { profileData: { displayName: postDisplayName } },
        PostTypes.KNOWLEDGE,
        TestUser.HUB_MEMBER
      );
      spacePostId = resPostonSpace.body.data.createPostOnCallout.id;
      postCommentsIdSpace =
        resPostonSpace.body.data.createPostOnCallout.comments.id;
    });

    afterAll(async () => {
      await removePost(spacePostId);
    });
    test('HM create comment - HM(1) get notifications', async () => {
      const spacePostSubjectText = `${spaceName} - New comment received on your Post &#34;${postDisplayName}&#34;, have a look!`;

      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          postCommentsIdSpace,
          'test message on space post'
        ),
        TestUser.HUB_MEMBER
      );
      msessageId = messageRes.body.data.sendMessageToRoom.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: spacePostSubjectText,
            toAddresses: [users.spaceMemberEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });

    test('HA create comment - HM(1) get notifications', async () => {
      const spacePostSubjectText = `${spaceName} - New comment received on your Post &#34;${postDisplayName}&#34;, have a look!`;
      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          postCommentsIdSpace,
          'test message on space post'
        ),
        TestUser.HUB_ADMIN
      );
      msessageId = messageRes.body.data.sendMessageToRoom.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: spacePostSubjectText,
            toAddresses: [users.spaceMemberEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });
  });

  describe('CM create post on challenge  ', () => {
    beforeAll(async () => {
      const resPostonSpace = await createPostOnCallout(
        entitiesId.challengeCalloutId,
        postNameID,
        { profileData: { displayName: postDisplayName } },
        PostTypes.KNOWLEDGE,
        TestUser.CHALLENGE_MEMBER
      );
      challengePostId = resPostonSpace.body.data.createPostOnCallout.id;
      postCommentsIdChallenge =
        resPostonSpace.body.data.createPostOnCallout.comments.id;
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
      const resPostonSpace = await createPostOnCallout(
        entitiesId.opportunityCalloutId,
        postNameID,
        { profileData: { displayName: postDisplayName } },
        PostTypes.KNOWLEDGE,
        TestUser.OPPORTUNITY_MEMBER
      );
      opportunityPostId = resPostonSpace.body.data.createPostOnCallout.id;
      postCommentsIdOpportunity =
        resPostonSpace.body.data.createPostOnCallout.comments.id;
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
    const resPostonSpace = await createPostOnCallout(
      entitiesId.opportunityCalloutId,
      postNameID,
      { profileData: { displayName: postDisplayName } },
      PostTypes.KNOWLEDGE,
      TestUser.OPPORTUNITY_ADMIN
    );
    opportunityPostId = resPostonSpace.body.data.createPostOnCallout.id;
    postCommentsIdOpportunity =
      resPostonSpace.body.data.createPostOnCallout.comments.id;
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
